import { readdir, readFile, writeFile, mkdir, cp, stat, rm, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const collator = new Intl.Collator("zh-CN", { numeric: true });
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
export const encodePath = (value) => value.split("/").map(encodeURIComponent).join("/");
const md = new MarkdownIt({ html: false, linkify: true, typographer: false });

function inlineText(tokens = []) {
  return tokens.map((token) => {
    if (token.children) return inlineText(token.children);
    if (["text", "code_inline", "code_block", "fence"].includes(token.type)) return token.content;
    if (["softbreak", "hardbreak"].includes(token.type)) return " ";
    return "";
  }).join("");
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-") || "section";
}

export function getNoteMeta(source, relativePath) {
  const pieces = relativePath.replaceAll("\\", "/").split("/");
  if (pieces.length !== 4 || pieces[0] !== "notes" || !/\.md$/i.test(pieces[3])) {
    throw new Error(relativePath + "：笔记必须位于 notes/一级分类/二级分类/文件.md，仅支持两级分类。");
  }
  source = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = source.split("\n")[0];
  const match = firstLine.match(/^#[ \t]+(\S.*)$/);
  if (!match) throw new Error(relativePath + "：第一行必须是非空一级标题，例如「# SQL 基础查询」。不使用文件名兜底。");
  const heading = match[1].replace(/[ \t]+#+[ \t]*$/, "");
  const title = inlineText(md.parseInline(heading)[0].children).trim();
  if (!title) throw new Error(relativePath + "：一级标题缺少可显示的文字。");
  const body = source.slice(firstLine.length).replace(/^\n/, "");
  const tokens = md.parse(body, {});
  const texts = tokens.filter((token) => ["inline", "fence", "code_block"].includes(token.type)).map((token) => token.children ? inlineText(token.children) : token.content);
  const searchText = texts.join("\n");
  const firstParagraph = tokens.findIndex((token) => token.type === "paragraph_open" && token.level === 0);
  const summary = firstParagraph >= 0 ? inlineText(tokens[firstParagraph + 1].children) : texts.join(" ");
  const characters = (title + searchText).replace(/\s/g, "").length;
  return {
    source: relativePath, category: pieces[1], subcategory: pieces[2], title, body,
    url: encodePath(relativePath.replace(/\.md$/i, ".html")),
    summary: summary.replace(/\s+/g, " ").slice(0, 140),
    searchText, readingMinutes: Math.max(1, Math.ceil(characters / 450)),
    titleId: slugify(title)
  };
}

export function compileNote(note) {
  const parser = new MarkdownIt({ html: false, linkify: true, typographer: false });
  const toc = [];
  const ids = new Set([note.titleId]);
  parser.renderer.rules.heading_open = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx];
    // The document title is already rendered in the page header.
    if (token.tag === "h1") { token.tag = "h2"; tokens[idx + 2].tag = "h2"; }
    const title = inlineText(tokens[idx + 1].children);
    const slug = slugify(title);
    let id = slug;
    let count = 1;
    while (ids.has(id)) id = slug + "-" + count++;
    ids.add(id);
    token.attrSet("id", id);
    if (["h2", "h3"].includes(token.tag)) toc.push({ id, title, level: Number(token.tag[1]) });
    return renderer.renderToken(tokens, idx, options);
  };
  const defaultImage = parser.renderer.rules.image;
  parser.renderer.rules.image = (tokens, idx, options, env, renderer) => {
    tokens[idx].attrSet("loading", "lazy");
    tokens[idx].attrSet("decoding", "async");
    return defaultImage(tokens, idx, options, env, renderer);
  };
  parser.renderer.rules.link_open = (tokens, idx, options, env, renderer) => {
    const token = tokens[idx];
    const href = token.attrGet("href") || "";
    if (!/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) {
      token.attrSet("href", href.replace(/\.md(?=[?#]|$)/i, ".html"));
    }
    if (/^https?:\/\//i.test(href)) token.attrSet("rel", "noreferrer noopener");
    return renderer.renderToken(tokens, idx, options);
  };
  parser.renderer.rules.fence = (tokens, idx) => {
    const token = tokens[idx];
    const language = token.info.trim().split(/\s+/)[0];
    let code = escapeHtml(token.content);
    if (language && hljs.getLanguage(language)) {
      code = hljs.highlight(token.content, { language, ignoreIllegals: true }).value;
    }
    return '<div class="code-block"><div class="code-toolbar"><span>' + escapeHtml(language || "text") +
      '</span><button type="button" class="copy-code" aria-label="复制代码">复制</button></div><pre tabindex="0"><code>' + code + "</code></pre></div>\n";
  };
  parser.renderer.rules.table_open = () => '<div class="table-scroll" tabindex="0" role="region" aria-label="数据表格"><table>\n';
  parser.renderer.rules.table_close = () => "</table></div>\n";
  return { html: parser.render(note.body), toc };
}

async function walk(dir, prefix = "") {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const files = [];
  for (const entry of entries.sort((a, b) => collator.compare(a.name, b.name))) {
    if (entry.isSymbolicLink()) throw new Error("不支持符号链接：" + path.join(dir, entry.name));
    if (entry.name.startsWith(".")) continue;
    const relative = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      // pics is reserved for shared images, never interpreted as a note category.
      if (entry.name.toLowerCase() !== "pics") files.push(...await walk(path.join(dir, entry.name), relative));
    } else if (/\.md$/i.test(entry.name)) files.push(relative);
  }
  return files;
}

function gitDates(root) {
  const dates = new Map();
  try {
    // Keep CJK filenames readable in Git's output.
    const readable = execFileSync("git", ["-c", "core.quotepath=false", "log", "--format=DATE:%cs", "--name-only", "--", "notes"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024 });
    let date = "";
    for (const line of readable.split(/\r?\n/)) {
      if (line.startsWith("DATE:")) date = line.slice(5);
      else if (line && date && !dates.has(line)) dates.set(line, date);
    }
  } catch { /* A repository without commits uses the file modification date. */ }
  return dates;
}

export async function loadNotes(root = projectRoot) {
  const files = await walk(path.join(root, "notes"));
  const dates = gitDates(root);
  const notes = [];
  const errors = [];
  const urls = new Set();
  for (const file of files) {
    const relative = "notes/" + file;
    try {
      const full = path.join(root, relative);
      const note = getNoteMeta(await readFile(full, "utf8"), relative);
      const key = note.url.toLowerCase();
      if (urls.has(key)) throw new Error(relative + "：生成的地址与其他文件冲突，请检查大小写和扩展名。");
      urls.add(key);
      note.updated = dates.get(relative) || (await stat(full)).mtime.toISOString().slice(0, 10);
      notes.push(note);
    } catch (error) { errors.push(error.message); }
  }
  if (errors.length) throw new Error("笔记检查未通过：\n" + errors.map((message) => "  • " + message).join("\n"));
  return notes.sort((a, b) => b.updated.localeCompare(a.updated) || collator.compare(a.source, b.source));
}

export function categoriesFor(notes) {
  const groups = new Map();
  for (const note of notes) {
    if (!groups.has(note.category)) groups.set(note.category, new Map());
    const subs = groups.get(note.category);
    subs.set(note.subcategory, (subs.get(note.subcategory) || 0) + 1);
  }
  return [...groups].sort(([a], [b]) => collator.compare(a, b)).map(([name, subs]) => ({
    name, count: [...subs.values()].reduce((a, b) => a + b, 0),
    children: [...subs].sort(([a], [b]) => collator.compare(a, b)).map(([name, count]) => ({ name, count }))
  }));
}

function filterUrl(base, category = "", subcategory = "") {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (subcategory) params.set("subcategory", subcategory);
  return base + "notes/" + (params.size ? "?" + params.toString() : "");
}

function header(base, active) {
  const nav = [["home", "", "首页"], ["resume", "resume/", "简历"], ["notes", "notes/", "学习笔记"]];
  return '<header class="site-header"><div class="container header-inner"><a class="brand" href="' + base +
    '" aria-label="yulinww 首页"><span class="brand-mark" aria-hidden="true">Y</span><span>yulinww</span></a><nav class="site-nav" aria-label="主导航">' +
    nav.map(([key, href, label]) => '<a href="' + base + href + '"' + (active === key ? ' aria-current="page"' : "") + ">" + label + "</a>").join("") +
    '</nav><a class="github-link" href="https://github.com/yulinww" target="_blank" rel="noopener noreferrer" aria-label="GitHub（在新标签页打开）"><svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.2.8-.5v-2.2c-3.4.7-4.1-1.4-4.1-1.4-.5-1.3-1.3-1.6-1.3-1.6-1.1-.8.1-.8.1-.8 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.7.2 3 .1 3.3.8.8 1.2 1.8 1.2 3.1 0 4.5-2.8 5.5-5.5 5.8.4.4.8 1.1.8 2.2v3.1c0 .3.2.6.8.5A11.4 11.4 0 0 0 12 .8Z"/></svg><span>GitHub</span></a></div></header>';
}

function footer(base) {
  return '<footer class="site-footer"><div class="container footer-inner"><span class="footer-signature">© ' +
    new Date().getFullYear() + ' yulinww</span><span>保持好奇，持续积累。 <a href="' + base + 'notes/">继续阅读 ↗</a></span></div></footer>';
}

function sidebar(categories, base, note) {
  const total = categories.reduce((sum, category) => sum + category.count, 0);
  function item(category, subcategory, label, count, className) {
    const active = note ? category === note.category && subcategory === note.subcategory : !category;
    return '<a class="' + className + '" href="' + escapeHtml(filterUrl(base, category, subcategory)) +
      '" data-category="' + escapeHtml(category) + '" data-subcategory="' + escapeHtml(subcategory) + '"' +
      (active ? ' aria-current="true"' : "") + '><span>' + escapeHtml(label) + '</span><span class="small-count">' + count + "</span></a>";
  }
  return '<div class="sidebar-wrap"><button class="sidebar-toggle" type="button" aria-controls="category-panel" aria-expanded="false"><span>浏览分类</span><span aria-hidden="true">⌄</span></button><aside id="category-panel" class="library-sidebar" aria-label="笔记分类"><p class="sidebar-label">CATEGORIES</p>' +
    item("", "", "全部笔记", total, "category-all") +
    categories.map((category) => '<details class="category-group" open><summary><span>' + escapeHtml(category.name) + '</span><span class="small-count">' + category.count +
      '</span></summary><div class="category-children">' + item(category.name, "", "全部 " + category.name, category.count, "category-link") +
      category.children.map((sub) => item(category.name, sub.name, sub.name, sub.count, "category-link")).join("") + "</div></details>").join("") +
    "</aside></div>";
}

function noteCard(note, base) {
  return '<a class="note-card" href="' + base + note.url + '"><div class="note-card-meta"><span>' + escapeHtml(note.category) +
    '</span><span aria-hidden="true">/</span><span>' + escapeHtml(note.subcategory) + "</span></div><h3>" + escapeHtml(note.title) + "</h3><p>" +
    escapeHtml(note.summary) + '</p><div class="note-card-bottom"><time datetime="' + note.updated + '">' + note.updated.replaceAll("-", ".") +
    '</time><span>约 ' + note.readingMinutes + ' 分钟</span><span class="read-arrow" aria-hidden="true">↗</span></div></a>';
}

function articlePage(note, categories) {
  const base = "../../../";
  const { html, toc } = compileNote(note);
  const title = escapeHtml(note.title);
  const tocHtml = toc.length ? toc.map((heading) => '<a href="#' + encodeURIComponent(heading.id) + '" class="' +
    (heading.level === 3 ? "toc-sub" : "") + '">' + escapeHtml(heading.title) + "</a>").join("") : "<p>本篇暂无小节</p>";
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' +
    title + ' · yulinww</title><meta name="description" content="' + escapeHtml(note.summary) + '"><link rel="icon" href="' + base +
    'assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="' + base + 'assets/styles.css"><script src="' + base +
    'assets/site.js" type="module"></script></head><body data-page="article"><a class="skip-link" href="#main">跳至正文</a>' + header(base, "notes") +
    '<main id="main" class="article-main"><nav class="article-breadcrumb" aria-label="当前位置"><a href="' + base +
    'notes/">学习笔记</a><span aria-hidden="true">/</span><a href="' + escapeHtml(filterUrl(base, note.category)) + '">' + escapeHtml(note.category) +
    '</a><span aria-hidden="true">/</span><a href="' + escapeHtml(filterUrl(base, note.category, note.subcategory)) + '">' + escapeHtml(note.subcategory) +
    '</a></nav><div class="article-layout">' + sidebar(categories, base, note) +
    '<article class="article-content"><header class="article-heading"><p class="eyebrow">' + escapeHtml(note.category + " / " + note.subcategory) +
    '</p><h1 id="' + escapeHtml(note.titleId) + '">' + title + '</h1><div class="article-meta"><time datetime="' + note.updated + '">更新于 ' +
    note.updated.replaceAll("-", ".") + "</time><span>约 " + note.readingMinutes + ' 分钟</span><a href="' + base + encodePath(note.source) +
    '" download>Markdown 原文 ↗</a></div></header><div class="prose">' + html +
    '</div><div class="article-end"><a href="' + escapeHtml(filterUrl(base, note.category, note.subcategory)) +
    '">← 返回此分类</a><a href="#' + encodeURIComponent(note.titleId) + '">回到顶部 ↑</a></div></article><details class="article-toc" open><summary>本页目录</summary><nav aria-label="文章目录">' +
    tocHtml + "</nav></details></div></main>" + footer(base) + "</body></html>";
}

export function resumeDownload(hasPdf) {
  return '<div class="download-block">' + (hasPdf ?
    '<a class="button button-primary" href="../assets/resume.pdf" download="yulinww-resume.pdf">下载简历 PDF <span aria-hidden="true">↓</span></a><p>PDF 格式</p>' :
    '<button class="button button-secondary" type="button" disabled>下载简历 PDF <span aria-hidden="true">↓</span></button><p>简历待更新</p>') + "</div>";
}

async function exists(file) {
  try { return (await stat(file)).isFile(); } catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

export async function buildSite({ root = projectRoot, output = path.join(root, "dist") } = {}) {
  // Only this generator's exact dist folder can be cleaned, never a source folder or a symlink.
  root = path.resolve(root);
  output = path.resolve(output);
  if (output !== path.join(root, "dist")) throw new Error("输出目录必须为当前项目的 dist 子目录。");
  const notes = await loadNotes(root); // Validate before touching the previous build.
  const categories = categoriesFor(notes);
  try {
    const resolvedOutput = await realpath(output);
    const resolvedRoot = await realpath(root);
    if (resolvedOutput !== path.join(resolvedRoot, "dist")) throw new Error("dist 指向了其他目录，拒绝清理。");
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
  // Preserve source paths so shared pics/ and all other relative attachments keep working.
  await cp(path.join(root, "notes"), path.join(output, "notes"), { recursive: true, filter: (src) => !path.basename(src).startsWith(".") });
  await writeFile(path.join(output, ".nojekyll"), "");
  const hasPdf = await exists(path.join(root, "assets", "resume.pdf"));
  const templates = [["index.html", "./", "home"], ["resume/index.html", "../", "resume"], ["notes/index.html", "../", "notes"]];
  for (const [file, base, page] of templates) {
    let html = await readFile(path.join(root, file), "utf8");
    const replacements = {
      HEADER: header(base, page), FOOTER: footer(base), RESUME_DOWNLOAD: resumeDownload(hasPdf),
      NOTE_COUNT: String(notes.length), SIDEBAR: sidebar(categories, base),
      NOTE_LIST: notes.length ? notes.map((note) => noteCard(note, base)).join("\n") : '<div class="empty-state"><h3>笔记正在积累中</h3><p>这里将记录新的学习与思考。</p></div>',
      HOME_STATS: "<span>" + notes.length + " 篇笔记 · " + categories.length + " 个主题</span>",
      HOME_CATEGORIES: '<div class="home-category-list">' + (categories.length ? categories.map((category, idx) =>
        '<a class="home-category-link" href="' + escapeHtml(filterUrl(base, category.name)) + '"><span class="category-glyph" aria-hidden="true">' +
        String(idx + 1).padStart(2, "0") + "</span><span>" + escapeHtml(category.name) + '</span><span class="small-count">' + category.count +
        ' 篇</span><span aria-hidden="true">›</span></a>').join("") : '<p class="muted">新的笔记即将开始。</p>') + "</div>",
      LATEST_NOTES: notes.length ? notes.slice(0, 3).map((note) => '<a class="recent-note" href="' + base + note.url + '"><span class="recent-note-category">' +
        escapeHtml(note.category + " / " + note.subcategory) + "</span><div><h3>" + escapeHtml(note.title) + "</h3><p>" +
        escapeHtml(note.summary) + '</p></div><span aria-hidden="true">↗</span></a>').join("") : '<p class="notice">还没有笔记，下一次探索从这里开始。</p>'
    };
    html = html.replace(/<!--([A-Z_]+)-->/g, (marker, key) => replacements[key] ?? marker);
    await mkdir(path.dirname(path.join(output, file)), { recursive: true });
    await writeFile(path.join(output, file), html);
  }
  for (const note of notes) {
    const file = path.join(output, note.source.replace(/\.md$/i, ".html"));
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, articlePage(note, categories));
  }
  await writeFile(path.join(output, "assets", "notes-index.json"), JSON.stringify({
    notes: notes.map(({ body, titleId, ...note }) => note), categories
  }));
  await writeFile(path.join(output, "404.html"), '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>页面未找到 · yulinww</title><link rel="stylesheet" href="/assets/styles.css"></head><body>' +
    header("/", "") + '<main class="not-found"><h1>404</h1><h2>这页暂时找不到了</h2><p>链接可能已更新，去笔记目录看看吧。</p><a class="button button-primary" href="/notes/">返回学习笔记 →</a></main>' + footer("/") + "</body></html>");
  return { notes: notes.length, categories: categories.length, output, hasPdf };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await buildSite();
    console.log("已生成 " + result.notes + " 篇笔记 / " + result.categories + " 个一级分类 → " + result.output);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
