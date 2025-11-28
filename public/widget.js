(() => {
  const SCRIPT_NAME = "widget.js";

  function findScripts() {
    return Array.from(document.getElementsByTagName("script")).filter((s) => {
      try {
        return (s.src || "").toLowerCase().includes(SCRIPT_NAME);
      } catch {
        return false;
      }
    });
  }

  function injectStyles(theme = "light") {
    if (document.getElementById("sr-reviews-widget-styles")) return;
    const style = document.createElement("style");
    style.id = "sr-reviews-widget-styles";
    style.textContent = `
      :root { --sr-bg: #ffffff; --sr-fg: #111827; --sr-subtle: #6b7280; --sr-border: #e5e7eb; --sr-primary: #2563eb; --sr-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); }
      .sr-widget[data-theme="dark"] { --sr-bg: #0b0f19; --sr-fg: #e5e7eb; --sr-subtle: #9ca3af; --sr-border: #1f2937; --sr-primary: #60a5fa; --sr-shadow: 0 1px 3px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.25); }
      .sr-widget { box-sizing: border-box; width: 100%; max-width: 900px; background: var(--sr-bg); color: var(--sr-fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; padding: 16px; border: 1px solid var(--sr-border); border-radius: 14px; box-shadow: var(--sr-shadow); }
      .sr-widget * { box-sizing: border-box; }
      .sr-widget .sr-card { border: 1px solid var(--sr-border); border-radius: 12px; padding: 16px; margin: 12px 0; background: var(--sr-bg); box-shadow: var(--sr-shadow); }
      .sr-widget .sr-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .sr-widget .sr-title { font-size: 18px; font-weight: 600; letter-spacing: 0.2px; }
      .sr-widget .sr-subtle { color: var(--sr-subtle); font-size: 12px; }
      .sr-widget .sr-list { display: grid; grid-template-columns: 1fr; gap: 12px; }
      @media (min-width: 640px) { .sr-widget .sr-list { grid-template-columns: 1fr 1fr; } }
      @media (min-width: 1024px) { .sr-widget .sr-list { grid-template-columns: 1fr 1fr 1fr; } }
      .sr-widget .sr-review { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--sr-border); border-radius: 12px; padding: 14px; background: var(--sr-bg); box-shadow: var(--sr-shadow); }
      .sr-widget .sr-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .sr-widget .sr-name { font-weight: 600; font-size: 14px; }
      .sr-widget .sr-date { font-size: 12px; color: var(--sr-subtle); }
      .sr-widget .sr-stars { display: inline-flex; gap: 2px; color: #f59e0b; }
      .sr-widget .sr-comment { font-size: 13px; line-height: 1.5; color: var(--sr-fg); }
      .sr-widget .sr-video { position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--sr-border); background: #000; }
      .sr-widget .sr-video img { display: block; width: 100%; height: auto; }
      .sr-widget .sr-footer { margin-top: 8px; display: flex; justify-content: flex-end; padding-right: 4px; }
      .sr-widget .sr-brand { font-size: 12px; color: var(--sr-subtle); padding: 2px 6px; border-radius: 6px; background: transparent; }
    `;
    document.head.appendChild(style);
  }

  function buildApiBase(scriptEl) {
    try {
      const src = new URL(scriptEl.src);
      return `${src.origin}/api/public-reviews`;
    } catch {
      return `/api/public-reviews`;
    }
  }

  function renderStars(rating) {
    const count = Math.max(0, Math.min(5, Number(rating) || 0));
    let html = "";
    for (let i = 1; i <= 5; i++) {
      html += `<svg viewBox="0 0 24 24" width="14" height="14" fill="${i <= count ? "currentColor" : "none"}" stroke="currentColor"><path d="M12 .587l3.668 7.431L24 9.587l-6 5.847L19.335 24 12 20.01 4.665 24 6 15.434 0 9.587l8.332-1.569z"/></svg>`;
    }
    return `<span class="sr-stars">${html}</span>`;
  }

  function formatDate(iso) {
    try { return new Date(iso).toLocaleDateString(); } catch { return ""; }
  }

  async function mountWidget(scriptEl) {
    const companyId = scriptEl.dataset.company;
    const theme = (scriptEl.dataset.theme || "light").toLowerCase();
    const limit = parseInt(scriptEl.dataset.limit || "5", 10);
    const targetSelector = scriptEl.dataset.target;
    const apiOverride = (scriptEl.dataset.api || "").trim();

    if (!companyId) {
      console.warn("[SyncReviews] data-company is required");
      return;
    }

    injectStyles(theme);

    const container = document.createElement("div");
    container.className = "sr-widget";
    const effectiveTheme = theme === "auto"
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light")
      : (theme === "dark" ? "dark" : "light");
    container.setAttribute("data-theme", effectiveTheme);

    const header = document.createElement("div");
    header.className = "sr-card sr-header";
    header.innerHTML = `<div class="sr-title">Reviews</div><div class="sr-subtle">Powered by SyncReviews</div>`;
    container.appendChild(header);

    const list = document.createElement("div");
    list.className = "sr-list";
    container.appendChild(list);

    const footer = document.createElement("div");
    footer.className = "sr-footer";
    footer.innerHTML = `<span class="sr-brand">SyncReviews</span>`;
    container.appendChild(footer);

    // Place container
    if (targetSelector) {
      const target = document.querySelector(targetSelector);
      if (target) target.appendChild(container);
      else scriptEl.parentNode?.insertBefore(container, scriptEl.nextSibling);
    } else {
      scriptEl.parentNode?.insertBefore(container, scriptEl.nextSibling);
    }

    // Fetch reviews
    const apiBase = apiOverride || buildApiBase(scriptEl);
    const url = `${apiBase}?company_id=${encodeURIComponent(companyId)}&limit=${encodeURIComponent(String(limit))}`;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const reviews = (json && json.reviews) || [];

      if (!reviews.length) {
        const empty = document.createElement("div");
        empty.className = "sr-card";
        empty.innerHTML = `<p class="sr-subtle">No reviews yet.</p>`;
        list.appendChild(empty);
        return;
      }

      reviews.forEach((r) => {
        const card = document.createElement("div");
        card.className = "sr-review";
        const name = (r.customer_name || "Anonymous");
        const date = formatDate(r.created_at);
        const comment = r.comment ? String(r.comment) : "";
        const stars = renderStars(r.rating);

        card.innerHTML = `
          <div class="sr-row">
            <div class="sr-name">${name}</div>
            <div class="sr-date">${date}</div>
          </div>
          <div class="sr-row">${stars}</div>
          ${comment ? `<div class="sr-comment">${comment}</div>` : ""}
        `;

        if (r.video_url) {
          const img = document.createElement("img");
          img.alt = "Video review";
          img.src = r.video_url;
          const video = document.createElement("div");
          video.className = "sr-video";
          video.appendChild(img);
          card.appendChild(video);
        }

        list.appendChild(card);
      });
    } catch (e) {
      const err = document.createElement("div");
      err.className = "sr-card";
      err.innerHTML = `<p class="sr-subtle">Failed to load reviews.</p>`;
      list.appendChild(err);
      console.error("[SyncReviews] Error loading reviews:", e);
    }
  }

  // Init for each script occurrence
  findScripts().forEach(mountWidget);
})();