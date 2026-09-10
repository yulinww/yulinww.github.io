export const BUSUANZI_SCRIPT = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";

export function shouldTrack(location, hostname) {
  // Exact production-host allowlist: localhost, LAN previews and copies of the
  // site never send counts. This is deliberately independent of article paths.
  return Boolean(hostname) && location.protocol === "https:" && location.hostname === hostname;
}

export function initAnalytics(doc, location) {
  const hostname = doc.querySelector('meta[name="site-analytics-host"]')?.content;
  if (!shouldTrack(location, hostname) || doc.getElementById("site-analytics-script")) return;
  const script = doc.createElement("script");
  script.id = "site-analytics-script";
  script.src = BUSUANZI_SCRIPT;
  script.async = true;
  script.addEventListener("error", () => {
    for (const counter of doc.querySelectorAll(".visitor-count")) counter.style.display = "none";
  });
  // One script / one request per document. Do not retry or refresh counters:
  // busuanzi's read endpoint also increments site_pv and page_pv together.
  doc.head.append(script);
}
