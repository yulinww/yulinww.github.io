export const DEFAULT_READING_SPEED = 450;

export function readingStats(text, charactersPerMinute = DEFAULT_READING_SPEED) {
  if (!Number.isSafeInteger(charactersPerMinute) || charactersPerMinute <= 0) {
    throw new Error("阅读速度必须为正整数。");
  }
  // Count visible text/code, not Markdown syntax, whitespace or UTF-16 halves.
  const wordCount = Array.from(text.replace(/\s/gu, "")).length;
  return { wordCount, readingMinutes: Math.max(1, Math.ceil(wordCount / charactersPerMinute)) };
}

const beijingTime = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai", year: "numeric", month: "numeric", day: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

export function formatUpdatedAt(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(beijingTime.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function formatRelativeTime(value, now = Date.now()) {
  const elapsed = now - Date.parse(value);
  // Do not invent an elapsed time for invalid dates or a clock in the future.
  if (!Number.isFinite(elapsed) || elapsed < 0) return "";
  const seconds = Math.floor(elapsed / 1000);
  if (seconds === 0) return "刚刚";
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时${minutes % 60 ? `${minutes % 60}分钟` : ""}前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function readingLabel(note) {
  // Older cached indexes did not contain wordCount; avoid showing "undefined字".
  const count = Number.isSafeInteger(note.wordCount) ? `约${note.wordCount}字，` : "";
  return `${count}预计阅读时间${note.readingMinutes}分钟`;
}

export function updateRelativeTimes(root, now = Date.now()) {
  for (const node of root.querySelectorAll("[data-relative-time]")) {
    const label = formatRelativeTime(node.dataset.relativeTime, now);
    const text = label ? " · " + label : "";
    if (node.textContent !== text) node.textContent = text;
    node.hidden = !label;
  }
}

export function startRelativeTimes(doc, win) {
  const refresh = () => { if (!doc.hidden) updateRelativeTimes(doc); };
  refresh();
  // This updates text only. It must never reload the page or count a visit.
  const timer = win.setInterval(refresh, 1000);
  doc.addEventListener("visibilitychange", refresh);
  win.addEventListener("pageshow", refresh);
  return () => {
    win.clearInterval(timer);
    doc.removeEventListener("visibilitychange", refresh);
    win.removeEventListener("pageshow", refresh);
  };
}
