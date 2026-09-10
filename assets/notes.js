import { filterNotes, searchSnippet, highlightParts } from "./notes-model.js";
import { formatUpdatedAt, readingLabel, updateRelativeTimes } from "./article-meta.js";

const input = document.querySelector("#note-search");
const list = document.querySelector("#note-list");
const count = document.querySelector("#result-count");
const title = document.querySelector("#list-title");
const empty = document.querySelector("#empty-state");
const status = document.querySelector("#search-status");
const categoryLinks = [...document.querySelectorAll("[data-category]")];
const rootUrl = new URL("../", import.meta.url);
let notes = [];

function stateFromUrl() {
  const params = new URLSearchParams(location.search);
  return {
    category: params.get("category") || "",
    subcategory: params.get("subcategory") || "",
    query: params.get("q") || ""
  };
}

function setUrl(state, replace = false) {
  const url = new URL(location.href);
  for (const [name, value] of [["category", state.category], ["subcategory", state.subcategory], ["q", state.query]]) {
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
  }
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function highlight(node, text, query) {
  for (const part of highlightParts(text, query)) {
    node.append(part.match ? element("mark", "", part.text) : document.createTextNode(part.text));
  }
}

function makeCard(note, query) {
  const card = element("a", "note-card");
  card.href = new URL(note.url, rootUrl).href;
  const meta = element("div", "note-card-meta");
  const separator = element("span", "", "/");
  separator.setAttribute("aria-hidden", "true");
  meta.append(element("span", "", note.category), separator, element("span", "", note.subcategory));
  const heading = element("h3");
  highlight(heading, note.title, query);
  const summary = element("p");
  highlight(summary, searchSnippet(note, query), query);
  const bottom = element("div", "note-card-bottom");
  const updated = element("span", "updated-at");
  const timestamp = note.updatedAt || note.updated;
  const label = note.updatedAt ? formatUpdatedAt(timestamp) : note.updated.replaceAll("-", ".");
  const time = element("time", "", "更新于 " + label);
  time.dateTime = timestamp;
  time.title = "北京时间";
  const relative = element("span");
  if (note.updatedAt) relative.dataset.relativeTime = timestamp;
  relative.hidden = true;
  updated.append(time, relative);
  const arrow = element("span", "read-arrow", "↗");
  arrow.setAttribute("aria-hidden", "true");
  bottom.append(updated, element("span", "", readingLabel(note)), arrow);
  card.append(meta, heading, summary, bottom);
  return card;
}

function render() {
  const state = stateFromUrl();
  input.value = state.query;
  const results = filterNotes(notes, state);
  const fragment = document.createDocumentFragment();
  for (const note of results) fragment.append(makeCard(note, state.query));
  list.replaceChildren(fragment);
  updateRelativeTimes(list);
  empty.hidden = results.length > 0;
  title.textContent = state.category ? state.category + (state.subcategory ? " / " + state.subcategory : "") : "全部笔记";
  count.textContent = results.length + " 篇" + (state.query ? "匹配" : "");
  for (const link of categoryLinks) {
    const active = link.dataset.category === state.category && link.dataset.subcategory === state.subcategory;
    if (active) {
      link.setAttribute("aria-current", "true");
      const group = link.closest("details");
      if (group) group.open = true;
    } else link.removeAttribute("aria-current");
  }
}

function closeSidebar() {
  document.querySelector(".sidebar-wrap")?.classList.remove("sidebar-open");
  document.querySelector(".sidebar-toggle")?.setAttribute("aria-expanded", "false");
}

async function init() {
  try {
    const response = await fetch(new URL("notes-index.json", import.meta.url), { cache: "no-cache" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data.notes)) throw new Error("索引格式不正确");
    notes = data.notes;
    input.disabled = false;
    render();
    input.addEventListener("input", () => {
      setUrl({ ...stateFromUrl(), query: input.value }, true);
      render();
    });
    for (const link of categoryLinks) {
      link.addEventListener("click", (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        setUrl({ ...stateFromUrl(), category: link.dataset.category, subcategory: link.dataset.subcategory });
        render();
        closeSidebar();
      });
    }
    document.querySelector("#reset-search").addEventListener("click", () => {
      setUrl({ category: "", subcategory: "", query: "" });
      render();
      input.focus();
    });
    window.addEventListener("popstate", render);
    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
          !event.target.closest("input, textarea, [contenteditable]")) {
        event.preventDefault();
        input.focus();
      }
    });
  } catch (error) {
    status.hidden = false;
    status.textContent = "搜索索引暂时无法加载，分类筛选和搜索不可用。下方仍可阅读全部笔记，请刷新后重试。";
    console.error("笔记索引加载失败：", error);
  }
}

init();
