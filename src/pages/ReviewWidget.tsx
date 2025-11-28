import { BackButton } from "@/components/ui/back-button";
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
// No API keys or custom endpoints needed; rewrite handles /api/public-reviews

const ReviewWidget: React.FC = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState("");
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [limit, setLimit] = useState<number>(6);
  // Removed custom API override to rely on /api/public-reviews rewrite

  const targetId = "reviews-widget";

  useEffect(() => {
    // Prefill from authenticated user id which equals company_id in this app
    if (!companyId && user?.id) {
      setCompanyId(user.id);
    }
  }, [user?.id]);

  // No custom API derivation; preview will use /api/public-reviews

  const snippet = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const attrs = [
      `data-company="${companyId || "YOUR_COMPANY_ID"}"`,
      `data-theme="${theme}"`,
      `data-limit="${limit}"`,
      `data-target="#${targetId}"`,
    ];
    return `<!-- Reviews Widget -->\n<div id="${targetId}"></div>\n<script defer src="${origin}/widget.js" ${attrs.join(
      " "
    )}></script>`;
  }, [companyId, theme, limit]);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
    } catch {
      // noop
    }
  };

  const loadPreview = () => {
    // Clear previous content
    const container = document.getElementById(targetId);
    if (container) container.innerHTML = "";
    const existing = document.getElementById("sr-preview-script");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "sr-preview-script";
    script.defer = true;
    script.src = "/widget.js";
    script.dataset.company = companyId || "";
    script.dataset.theme = theme;
    script.dataset.limit = String(limit);
    script.dataset.target = `#${targetId}`;
    document.body.appendChild(script);
  };

  return (
    <div className="container space-y-6">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Review Widget</h1>
        <p className="text-muted-foreground">
          Configure, preview, and copy your embeddable reviews widget.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6 md:max-w-none max-w-[640px] w-full mx-auto">
          <h2 className="mb-3 text-xl font-semibold">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Company ID
              </label>
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="YOUR_COMPANY_ID"
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full rounded-md border border-gray-300 p-2"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (match site)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Limit</label>
              <input
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value || "6", 10))}
                className="w-full rounded-md border border-gray-300 p-2"
              />
            </div>
            {/* Custom API removed; rely on /api/public-reviews rewrite */}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6 md:max-w-none max-w-[640px] w-full mx-auto">
          <h2 className="mb-3 text-xl font-semibold">Embed Snippet</h2>
          <pre className="max-h-[280px] overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs sm:text-sm break-words">
            {snippet}
          </pre>
          <div className="mt-3 flex gap-3">
            <button
              onClick={copySnippet}
              className="rounded-md bg-black px-3 py-2 text-white"
            >
              Copy
            </button>
            <button
              onClick={loadPreview}
              disabled={!companyId}
              className={`rounded-md border px-3 py-2 ${
                companyId
                  ? "border-gray-300"
                  : "border-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6 md:max-w-none max-w-[860px] w-full mx-auto">
        <h2 className="mb-3 text-xl font-semibold">Preview</h2>
        <div id={targetId} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6 md:max-w-none max-w-[860px] w-full mx-auto">
        <h2 className="mb-3 text-xl font-semibold">How to Use</h2>
        <ul className="list-disc space-y-2 pl-6 text-sm text-gray-700">
          <li>
            Copy the snippet above and paste it into your website where you want
            reviews to show.
          </li>
          <li>
            Ensure the <code>data-company</code> matches your company ID in the
            app.
          </li>
          <li>No keys or extra attributes are required.</li>
          <li>
            Adjust <code>data-theme</code> and <code>data-limit</code> as
            needed.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ReviewWidget;
