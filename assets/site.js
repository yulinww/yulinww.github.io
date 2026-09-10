import { startRelativeTimes } from "./article-meta.js";
import { initAnalytics } from "./analytics.js";

startRelativeTimes(document, window);
initAnalytics(document, location);

for (const toggle of document.querySelectorAll(".sidebar-toggle")) {
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.closest(".sidebar-wrap").classList.toggle("sidebar-open", expanded);
  });
}

for (const button of document.querySelectorAll(".copy-code")) {
  button.setAttribute("aria-live", "polite");
  button.addEventListener("click", async () => {
    const code = button.closest(".code-block").querySelector("code");
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent = "已复制";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      button.textContent = "请手动复制";
    }
    window.setTimeout(() => { button.textContent = "复制"; }, 2200);
  });
}

const toc = document.querySelector(".article-toc");
if (toc) {
  const compact = window.matchMedia("(max-width: 1150px)");
  function adaptToc() { toc.open = !compact.matches; }
  adaptToc();
  compact.addEventListener("change", adaptToc);
  const tocLinks = [...toc.querySelectorAll("a")];
  const headings = tocLinks.map((link) => document.getElementById(decodeURIComponent(link.hash.slice(1)))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of tocLinks) {
          if (decodeURIComponent(link.hash.slice(1)) === entry.target.id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      }
    }, { rootMargin: "-90px 0px -65% 0px", threshold: 0 });
    for (const heading of headings) observer.observe(heading);
  }
}
