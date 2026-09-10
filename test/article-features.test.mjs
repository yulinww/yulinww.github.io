import test from "node:test";
import assert from "node:assert/strict";
import { readingStats, readingLabel, formatUpdatedAt, formatRelativeTime, updateRelativeTimes, startRelativeTimes } from "../assets/article-meta.js";
import { BUSUANZI_SCRIPT, shouldTrack, initAnalytics } from "../assets/analytics.js";

test("阅读估算每分钟450字符、向上取整且最少1分钟，支持配置与 Unicode", () => {
  for (const [count, minutes] of [[0, 1], [450, 1], [451, 2], [900, 2], [1000, 3], [5819, 13]]) {
    assert.deepEqual(readingStats("字".repeat(count)), { wordCount: count, readingMinutes: minutes });
  }
  assert.deepEqual(readingStats("中 文\nSQL\t😀"), { wordCount: 6, readingMinutes: 1 });
  assert.equal(readingStats("字".repeat(5819), 1200).readingMinutes, 5);
  for (const value of [0, -1, 1.5, NaN, "450"]) assert.throws(() => readingStats("abc", value));
  assert.equal(readingLabel({ wordCount: 5819, readingMinutes: 13 }), "约5819字，预计阅读时间13分钟");
  assert.equal(readingLabel({ readingMinutes: 3 }), "预计阅读时间3分钟");
});

test("无论构建机时区如何，都展示北京时间，跨日和午夜正确", () => {
  assert.equal(formatUpdatedAt("2026-09-10T09:00:48Z"), "2026年9月10日 17:00:48");
  assert.equal(formatUpdatedAt("2026-09-09T16:00:00Z"), "2026年9月10日 00:00:00");
  assert.equal(formatUpdatedAt("2026-09-10T18:00:32Z"), "2026年9月11日 02:00:32");
  assert.equal(formatUpdatedAt("2026-09-10T17:00:48+08:00"), "2026年9月10日 17:00:48");
  assert.equal(formatUpdatedAt("invalid"), "");
});

test("相对时间覆盖秒、分钟、小时、天的边界及未来和无效时间", () => {
  const timestamp = "2026-09-10T09:00:48Z";
  const start = Date.parse(timestamp);
  for (const [seconds, label] of [
    [0, "刚刚"], [1, "1秒前"], [59, "59秒前"], [60, "1分钟前"],
    [3599, "59分钟前"], [3600, "1小时前"], [6960, "1小时56分钟前"],
    [86399, "23小时59分钟前"], [86400, "1天前"], [172800, "2天前"]
  ]) assert.equal(formatRelativeTime(timestamp, start + seconds * 1000), label);
  assert.equal(formatRelativeTime(timestamp, start - 1000), "");
  assert.equal(formatRelativeTime("invalid", start), "");
});

test("相对时间会更新已有页面文本，并可正确暂停、恢复与清理计时器", () => {
  const node = { dataset: { relativeTime: "2026-09-10T09:00:48Z" }, textContent: "", hidden: true };
  const root = { querySelectorAll: () => [node] };
  updateRelativeTimes(root, Date.parse(node.dataset.relativeTime) + 59_000);
  assert.equal(node.textContent, " · 59秒前");
  assert.equal(node.hidden, false);
  updateRelativeTimes(root, Date.parse(node.dataset.relativeTime) + 60_000);
  assert.equal(node.textContent, " · 1分钟前");
  updateRelativeTimes(root, Date.parse(node.dataset.relativeTime) - 1000);
  assert.equal(node.hidden, true);
  assert.equal(node.textContent, "");
  let refreshes = 0;
  let tick;
  const doc = new EventTarget();
  doc.querySelectorAll = () => { refreshes++; return []; };
  const win = new EventTarget();
  win.setInterval = (fn, delay) => { assert.equal(delay, 1000); tick = fn; return 123; };
  let cleared = false;
  win.clearInterval = (id) => { assert.equal(id, 123); cleared = true; };
  const stop = startRelativeTimes(doc, win);
  assert.equal(refreshes, 1);
  tick();
  assert.equal(refreshes, 2);
  doc.hidden = true;
  tick();
  assert.equal(refreshes, 2);
  doc.hidden = false;
  doc.dispatchEvent(new Event("visibilitychange"));
  win.dispatchEvent(new Event("pageshow"));
  assert.equal(refreshes, 4);
  stop();
  assert.equal(cleared, true);
  doc.dispatchEvent(new Event("visibilitychange"));
  assert.equal(refreshes, 4);
});

test("仅正式 HTTPS 域名统计，与栏目路径无关，本地、内网和副本不计数", () => {
  const hostname = "yulinww.github.io";
  for (const path of ["/", "/resume/", "/notes/", "/notes/db/sql/1.html", "/essays/life/1.html"]) {
    assert.equal(shouldTrack(new URL("https://" + hostname + path), hostname), true);
  }
  for (const url of ["http://yulinww.github.io", "http://127.0.0.1:4173", "http://localhost:4173", "http://[::1]:4173", "https://192.168.1.2", "https://copy.test", "file:///tmp/index.html"]) {
    assert.equal(shouldTrack(new URL(url), hostname), false, url);
  }
  assert.equal(shouldTrack(new URL("https://" + hostname), ""), false);
});

test("统计脚本每个文档只引入一次，同时用于站点与文章，不重试且失败时隐藏", () => {
  function fixture(hostname) {
    const scripts = [];
    const counters = [{ style: { display: "none" } }, { style: { display: "none" } }];
    const doc = {
      querySelector: () => hostname ? { content: hostname } : null,
      querySelectorAll: () => counters,
      getElementById: (id) => scripts.find((script) => script.id === id),
      createElement: () => new EventTarget(),
      head: { append: (script) => scripts.push(script) }
    };
    return { doc, scripts, counters };
  }
  const { doc, scripts, counters } = fixture("yulinww.github.io");
  const url = new URL("https://yulinww.github.io/future/articles/one.html");
  initAnalytics(doc, url);
  initAnalytics(doc, url);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, BUSUANZI_SCRIPT);
  assert.equal(scripts[0].async, true);
  counters[0].style.display = "inline";
  scripts[0].dispatchEvent(new Event("error"));
  assert.ok(counters.every((counter) => counter.style.display === "none"));
  initAnalytics(doc, url);
  assert.equal(scripts.length, 1);
  const local = fixture("yulinww.github.io");
  initAnalytics(local.doc, new URL("http://127.0.0.1:4173/"));
  assert.equal(local.scripts.length, 0);
  const disabled = fixture();
  initAnalytics(disabled.doc, url);
  assert.equal(disabled.scripts.length, 0);
});
