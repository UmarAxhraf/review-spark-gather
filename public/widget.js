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
      .se-widget .sr-link { color: #007bff; text-decoration: none; font-weight: 600; }
      @media (min-width: 640px) { .sr-widget .sr-list { grid-template-columns: 1fr 1fr; } }
      @media (min-width: 1024px) { .sr-widget .sr-list { grid-template-columns: 1fr 1fr 1fr; } }
      .sr-widget .sr-review { display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--sr-border); border-radius: 12px; padding: 14px; background: var(--sr-bg); box-shadow: var(--sr-shadow); }
      .sr-widget .sr-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .sr-widget .sr-name { font-weight: 600; font-size: 14px; }
      .sr-widget .sr-date { font-size: 12px; color: var(--sr-subtle); }
      .sr-widget .sr-stars { display: inline-flex; gap: 2px; color: #f59e0b; }
      .sr-widget .sr-comment { font-size: 13px; line-height: 1.5; color: var(--sr-fg); }
      .sr-widget .sr-comment[data-expanded="true"] { -webkit-line-clamp: initial; display: block; overflow: visible; }
      .sr-widget .sr-more { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--sr-primary); background: transparent; border: none; padding: 0; margin-top: 2px; cursor: pointer; }
      .sr-widget .sr-more:hover { text-decoration: underline; }
      .sr-widget .sr-video { position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--sr-border); background: #000; }
      .sr-widget .sr-video img { display: block; width: 100%; height: auto; }
      .sr-widget .sr-video .sr-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.9); color: #000; display: grid; place-items: center; box-shadow: var(--sr-shadow); border: 1px solid var(--sr-border); }
      .sr-widget .sr-video .sr-play svg { width: 24px; height: 24px; }
      .sr-widget .sr-footer { margin-top: 8px; display: flex; justify-content: flex-end; padding-right: 4px; }
      .sr-widget .sr-brand { font-size: 12px; color: var(--sr-subtle); padding: 2px 6px; border-radius: 6px; background: transparent; }

      /* Skeleton styles */
      .sr-widget .sr-skeleton { position: relative; overflow: hidden; border: 1px solid var(--sr-border); border-radius: 12px; padding: 14px; background: var(--sr-bg); box-shadow: var(--sr-shadow); }
      .sr-widget .sr-skel-bar { height: 12px; border-radius: 6px; background: rgba(229,231,235,0.8); }
      .sr-widget[data-theme="dark"] .sr-skel-bar { background: rgba(31,41,55,0.8); }
      .sr-widget .sr-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.4), rgba(255,255,255,0)); animation: sr-shimmer 1.2s ease-in-out infinite; }
      @keyframes sr-shimmer { 100% { transform: translateX(100%); } }

      /* Modal styles */
      .sr-modal { position: fixed; inset: 0; z-index: 99999; display: none; }
      .sr-modal[data-open="true"] { display: block; }
      .sr-modal .sr-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.75); }
      .sr-modal .sr-content { position: relative; max-width: 900px; margin: 40px auto; padding: 0; }
      .sr-modal .sr-close { position: absolute; right: 8px; top: -28px; background: #fff; color: #111827; border: 1px solid var(--sr-border); border-radius: 20px; padding: 4px 10px; font-size: 12px; box-shadow: var(--sr-shadow); cursor: pointer; }
      .sr-modal video { width: 100%; height: auto; background: #000; border-radius: 12px; border: 1px solid var(--sr-border); box-shadow: var(--sr-shadow); }
    `;
    document.head.appendChild(style);
  }

  function ensureVideoModal() {
    let modal = document.getElementById("sr-video-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sr-video-modal";
      modal.className = "sr-modal";
      const backdrop = document.createElement("div");
      backdrop.className = "sr-backdrop";
      const content = document.createElement("div");
      content.className = "sr-content";
      const close = document.createElement("button");
      close.className = "sr-close";
      close.textContent = "Close";
      const videoEl = document.createElement("video");
      videoEl.controls = true;
      videoEl.playsInline = true;
      videoEl.preload = "metadata";
      videoEl.setAttribute("crossorigin", "anonymous");
      content.appendChild(close);
      content.appendChild(videoEl);
      modal.appendChild(backdrop);
      modal.appendChild(content);
      document.body.appendChild(modal);

      const closeModal = () => {
        modal?.setAttribute("data-open", "false");
        videoEl.pause();
        videoEl.src = "";
      };
      backdrop.addEventListener("click", closeModal);
      close.addEventListener("click", closeModal);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
      });

      modal.__openVideo = (src) => {
        try {
          const u = new URL(src, window.location.origin);
          if (u.protocol !== "http:" && u.protocol !== "https:") return;
          videoEl.src = u.href;
          modal.setAttribute("data-open", "true");
        } catch {
          // ignore invalid URL
        }
      };
    }
    return modal;
  }

  async function generateVideoThumbnail(src) {
    return new Promise((resolve) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 2500);

      try {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;
        v.playsInline = true;
        v.setAttribute("crossorigin", "anonymous");
        v.src = src;
        v.addEventListener("loadeddata", () => {
          try {
            const w = v.videoWidth || 480;
            const h = v.videoHeight || 270;
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no ctx");
            ctx.drawImage(v, 0, 0, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            clearTimeout(timeout);
            settled = true;
            resolve(dataUrl);
          } catch {
            clearTimeout(timeout);
            settled = true;
            resolve(null);
          }
        });
        v.addEventListener("error", () => {
          clearTimeout(timeout);
          settled = true;
          resolve(null);
        });
      } catch {
        clearTimeout(timeout);
        settled = true;
        resolve(null);
      }
    });
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
      html += `<svg viewBox="0 0 24 24" width="14" height="14" fill="${
        i <= count ? "currentColor" : "none"
      }" stroke="currentColor"><path d="M12 .587l3.668 7.431L24 9.587l-6 5.847L19.335 24 12 20.01 4.665 24 6 15.434 0 9.587l8.332-1.569z"/></svg>`;
    }
    return `<span class="sr-stars">${html}</span>`;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return "";
    }
  }

  async function mountWidget(scriptEl) {
    const companyId = scriptEl.dataset.company;
    const theme = (scriptEl.dataset.theme || "light").toLowerCase();
    const limit = parseInt(scriptEl.dataset.limit || "5", 10);
    const targetSelector = scriptEl.dataset.target;
    const apiOverride = (scriptEl.dataset.api || "").trim();
    // Always show full comments; ignore clamping/expansion dataset options for now

    if (!companyId) {
      console.warn("[SyncReviews] data-company is required");
      return;
    }

    injectStyles(theme);

    const container = document.createElement("div");
    container.className = "sr-widget";
    const effectiveTheme =
      theme === "auto"
        ? window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme === "dark"
        ? "dark"
        : "light";
    container.setAttribute("data-theme", effectiveTheme);

    const header = document.createElement("div");
    header.className = "sr-card sr-header";
    // header.innerHTML = `<div class="sr-title">Company Reviews</div><div class="sr-subtle">Powered by SyncReviews</div>`;
    header.innerHTML = `
  <div class="sr-title">Company Reviews</div>
  <div class="sr-subtle">
    <a href="https://syncreviews.com" target="_blank" rel="noopener noreferrer" class="sr-link">
     Powered by SyncReviews
    </a>
  </div>
`;

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

    // Render skeletons while fetching
    const skeletonCount = Math.min(3, Math.max(1, limit));
    for (let i = 0; i < skeletonCount; i++) {
      const sk = document.createElement("div");
      sk.className = "sr-skeleton";
      sk.innerHTML = `
        <div class="sr-row" style="margin-bottom:8px">
          <div class="sr-skel-bar" style="width:44%; height:14px"></div>
          <div class="sr-skel-bar" style="width:22%; height:12px"></div>
        </div>
        <div class="sr-skel-bar" style="width:62%; height:12px"></div>
        <div class="sr-skel-bar" style="width:92%; height:12px; margin-top:6px"></div>
      `;
      list.appendChild(sk);
    }

    // Fetch reviews
    // Resolve API base safely. Allow only http/https absolute URLs or relative paths.
    let apiBase = apiOverride || buildApiBase(scriptEl);
    if (apiOverride) {
      try {
        const resolved = new URL(apiOverride, window.location.origin);
        if (resolved.protocol === "http:" || resolved.protocol === "https:") {
          apiBase = resolved.href;
        } else {
          console.warn(
            "[SyncReviews] Ignoring invalid API override protocol:",
            resolved.protocol
          );
          apiBase = buildApiBase(scriptEl);
        }
      } catch {
        console.warn("[SyncReviews] Invalid API override, using default.");
        apiBase = buildApiBase(scriptEl);
      }
    }
    const url = `${apiBase}?company_id=${encodeURIComponent(
      companyId
    )}&limit=${encodeURIComponent(String(limit))}`;

    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const reviews = (json && json.reviews) || [];

      // Clear skeletons before rendering content
      list.innerHTML = "";

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

        // Row: Name + Date (use textContent to avoid XSS)
        const row = document.createElement("div");
        row.className = "sr-row";
        const nameEl = document.createElement("div");
        nameEl.className = "sr-name";
        nameEl.textContent = r.customer_name
          ? String(r.customer_name)
          : "Anonymous";
        const dateEl = document.createElement("div");
        dateEl.className = "sr-date";
        dateEl.textContent = formatDate(r.created_at);
        row.appendChild(nameEl);
        row.appendChild(dateEl);
        card.appendChild(row);

        // Row: Stars (static SVG markup only)
        const starsRow = document.createElement("div");
        starsRow.className = "sr-row";
        starsRow.innerHTML = renderStars(r.rating);
        card.appendChild(starsRow);

        // Comment (use textContent to avoid XSS)
        const comment = r.comment ? String(r.comment) : "";
        if (comment) {
          const commentEl = document.createElement("div");
          commentEl.className = "sr-comment";
          commentEl.textContent = comment;
          card.appendChild(commentEl);
        }

        // Optional video/image preview - only allow http/https URLs
        if (r.video_url) {
          let safeSrc = "";
          try {
            const u = new URL(String(r.video_url), window.location.origin);
            if (u.protocol === "http:" || u.protocol === "https:") {
              safeSrc = u.href;
            }
          } catch {
            // ignore invalid URL
          }

          if (safeSrc) {
            const videoWrap = document.createElement("div");
            videoWrap.className = "sr-video";

            const thumbImg = document.createElement("img");
            thumbImg.alt = "Video review";
            thumbImg.referrerPolicy = "no-referrer";

            try {
              generateVideoThumbnail(safeSrc).then((thumb) => {
                if (thumb) {
                  thumbImg.src = thumb;
                } else {
                  thumbImg.style.display = "none";
                }
              });
            } catch {
              thumbImg.style.display = "none";
            }

            const play = document.createElement("button");
            play.type = "button";
            play.className = "sr-play";
            play.setAttribute("aria-label", "Play video review");
            play.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;

            videoWrap.appendChild(thumbImg);
            videoWrap.appendChild(play);
            card.appendChild(videoWrap);

            const modal = ensureVideoModal();
            const open = () =>
              modal && modal.__openVideo && modal.__openVideo(safeSrc);
            play.addEventListener("click", open);
            videoWrap.addEventListener("click", (e) => {
              if (e.target === videoWrap || e.target === thumbImg) open();
            });
          }
        }

        list.appendChild(card);
      });
    } catch (e) {
      // Clear skeletons on error
      list.innerHTML = "";
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
