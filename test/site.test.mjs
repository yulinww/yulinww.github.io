import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, cp, writeFile, readFile, stat, readdir, rm, utimes } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { execFileSync } from "node:child_process";
import { getNoteMeta, compileNote, categoriesFor, loadNotes, readSiteConfig, buildSite, projectRoot, resumeDownload, encodePath } from "../scripts/build.mjs";
import { filterNotes, highlightParts, searchSnippet } from "../assets/notes-model.js";
import { startServer } from "../scripts/serve.mjs";

const note = (text, file = "notes/数据库/SQL/1.md") => getNoteMeta(text, file);

test("分类仅取目录，展示标题取第一行 H1，支持长标题和特殊符号", () => {
  const title = 'SQL / WHERE：<条件>、"引号"、? 与 | ' + "长标题".repeat(40);
  const item = note("# " + title + "\n\n正文内容");
  assert.equal(item.title, title);
  assert.equal(item.category, "数据库");
  assert.equal(item.subcategory, "SQL");
  assert.ok(!item.title.includes("1.md"));
  assert.equal(item.searchText, "正文内容");
});

test("支持 UTF-8 BOM、CRLF 和标题行的行内 Markdown", () => {
  const item = note("\uFEFF# **SQL** 与 *JOIN*\r\n\r\n正文\r\n");
  assert.equal(item.title, "SQL 与 JOIN");
  assert.equal(item.summary, "正文");
});

test("缺少第一行 H1 时失败，绝不回退到文件名", () => {
  for (const source of ["正文", "\n# 标题", "## 标题", "# ", "---\ntitle: 标题\n---"]) {
    assert.throws(() => note(source), /第一行必须/);
  }
});

test("目录必须严格为两级，不静默归类深层目录", () => {
  for (const file of ["notes/1.md", "notes/数据库/1.md", "notes/数据库/SQL/进阶/1.md"]) {
    assert.throws(() => note("# 标题", file), /仅支持两级分类/);
  }
});

test("图片保留相对路径，内部 Markdown 链接改为 HTML 并保留查询与锚点", () => {
  const result = compileNote(note("# 标题\n\n![图片](<pics/查询 示例.svg>)\n\n[相关](<2.md?x=1#某个小节>)\n\n[外部](https://example.com/readme.md)"));
  assert.match(result.html, /src="pics\/%E6%9F%A5%E8%AF%A2%20%E7%A4%BA%E4%BE%8B\.svg"/);
  assert.match(result.html, /href="2\.html\?x=1#%E6%9F%90%E4%B8%AA%E5%B0%8F%E8%8A%82"/);
  assert.match(result.html, /https:\/\/example\.com\/readme\.md/);
  assert.match(result.html, /loading="lazy"/);
});

test("目录包含二三级标题，重复标题有独立锚点，标题不重复出现在正文", () => {
  const result = compileNote(note("# 标题\n\n## 基础\n\n内容\n\n### 示例\n\n## 基础\n\n# 附加大标题"));
  assert.deepEqual(result.toc.map((item) => [item.id, item.level]), [["基础", 2], ["示例", 3], ["基础-1", 2], ["附加大标题", 2]]);
  assert.doesNotMatch(result.html, /<h1/);
});

test("带数字后缀的标题也不会与重复标题的锚点冲突", () => {
  const result = compileNote(note("# a\n\n## a-1\n\n## a\n\n## a-1"));
  const ids = result.toc.map((heading) => heading.id);
  assert.equal(ids.length, new Set(ids).size);
  assert.deepEqual(ids, ["a-1", "a-2", "a-1-1"]);
});

test("支持表格、代码高亮、未知语言及代码复制按钮", () => {
  const fence = String.fromCharCode(96).repeat(3);
  const result = compileNote(note("# 标题\n\n" + fence + "sql\nSELECT 1;\n" + fence + "\n\n" + fence + "unknown\n<tag>\n" + fence + "\n\n| A | B |\n| --- | --- |\n| 1 | 2 |"));
  assert.match(result.html, /hljs-keyword/);
  assert.match(result.html, /class="copy-code"/);
  assert.match(result.html, /&lt;tag&gt;/);
  assert.match(result.html, /class="table-scroll"/);
});

test("Markdown 不执行原始 HTML 和 javascript 链接", () => {
  const result = compileNote(note("# 标题\n\n<script>alert(1)</script>\n\n[坏链接](javascript:alert(1))"));
  assert.doesNotMatch(result.html, /<script>|href="javascript:/);
  assert.match(result.html, /&lt;script&gt;/);
});

const records = [
  { ...note("# 查询基础\n\nSELECT name FROM students WHERE age > 22;"), summary: "查询示例", updated: "2026-09-10" },
  { ...note("# MySQL 索引\n\nB+ 树与联合索引", "notes/数据库/MySQL/2.md"), updated: "2026-09-09" },
  { ...note("# 检索增强生成\n\n向量数据库与 RAG", "notes/AI Agent/RAG/1.md"), updated: "2026-09-08" }
];

test("分类计数和两级筛选", () => {
  const groups = categoriesFor(records);
  assert.equal(groups.find((group) => group.name === "数据库").count, 2);
  assert.equal(filterNotes(records, { category: "数据库" }).length, 2);
  assert.equal(filterNotes(records, { category: "数据库", subcategory: "SQL" }).length, 1);
  assert.equal(filterNotes(records, { category: "AI Agent", subcategory: "SQL" }).length, 0);
});

test("全文搜索包含代码，支持大小写、全角字符、多关键词及空结果", () => {
  assert.equal(filterNotes(records, { query: "select STUDENTS" }).length, 1);
  assert.equal(filterNotes(records, { query: "ＲＡＧ" }).length, 1);
  assert.equal(filterNotes(records, { query: "不存在的关键词" }).length, 0);
  assert.equal(filterNotes(records, { query: "   " }).length, 3);
});

test("搜索摘要命中正文，高亮返回纯文本而非可执行 HTML", () => {
  assert.match(searchSnippet(records[0], "students"), /students/);
  const text = '<script>alert("SQL")</script>';
  const parts = highlightParts(text, "SQL");
  assert.equal(parts.map((part) => part.text).join(""), text);
  assert.deepEqual(parts.filter((part) => part.match).map((part) => part.text), ["SQL"]);
  assert.equal(highlightParts("aaaa", "aaa aa").filter((part) => part.match).length, 1);
});

test("没有 PDF 时按钮禁用，有 PDF 时启用正确下载地址", () => {
  assert.match(resumeDownload(false), /disabled/);
  assert.doesNotMatch(resumeDownload(false), /href=/);
  assert.match(resumeDownload(true), /href="\.\.\/assets\/resume\.pdf"/);
  assert.match(resumeDownload(true), /download="yulinww-resume\.pdf"/);
});

async function createFixture(t) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "yulinww-site-test-"));
  t.after(async () => {
    const target = path.resolve(tempRoot);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("yulinww-site-test-"));
    await rm(target, { recursive: true, force: true });
  });
  for (const file of ["index.html", "resume", "assets"]) {
    await cp(path.join(projectRoot, file), path.join(tempRoot, file), { recursive: true });
  }
  await mkdir(path.join(tempRoot, "notes"), { recursive: true });
  await cp(path.join(projectRoot, "notes", "index.html"), path.join(tempRoot, "notes", "index.html"));
  return tempRoot;
}

async function writeFixture(root, relative, text) {
  const file = path.join(root, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}

test("完整构建：共享图片、特殊路径、独立文章页、原文、空目录与 PDF 状态", async (t) => {
  const root = await createFixture(t);
  const prefix = "notes/分类 & 中文/SQL 空格/";
  await writeFixture(root, prefix + "1.md", "# 文件名之外的标题：/ ? |\n\n![图](<pics/共享 图片.svg>)\n\n[另一篇](2.md)");
  await writeFixture(root, prefix + "2.md", "# 第二篇\n\n![图](<pics/共享 图片.svg>)");
  await writeFixture(root, prefix + "pics/共享 图片.svg", '<svg xmlns="http://www.w3.org/2000/svg"/>');
  await writeFixture(root, prefix + "pics/说明.md", "图片说明不是文章，不要求标题");
  await mkdir(path.join(root, "notes/空分类/空子类"), { recursive: true });
  let result = await buildSite({ root });
  assert.equal(result.notes, 2);
  assert.equal(result.categories, 1);
  assert.equal(result.hasPdf, false);
  const first = await readFile(path.join(root, "dist", prefix, "1.html"), "utf8");
  assert.match(first, /<h1[^>]*>文件名之外的标题：\/ \? \|<\/h1>/);
  assert.match(first, /href="2.html"/);
  assert.equal((first.match(/<h1 /g) || []).length, 1);
  assert.ok((await stat(path.join(root, "dist", prefix, "pics/共享 图片.svg"))).isFile());
  const data = JSON.parse(await readFile(path.join(root, "dist/assets/notes-index.json"), "utf8"));
  assert.equal(data.notes.find((item) => item.source === prefix + "1.md").url, encodePath(prefix + "1.html"));
  assert.equal(data.categories[0].children[0].count, 2);
  assert.ok((await stat(path.join(root, "dist", prefix, "1.md"))).isFile());
  const index = await readFile(path.join(root, "dist/index.html"), "utf8");
  assert.doesNotMatch(index, /<!--[A-Z_]+-->/);
  await writeFixture(root, "assets/resume.pdf", "%PDF-1.4\n%%EOF");
  result = await buildSite({ root });
  assert.equal(result.hasPdf, true);
  assert.match(await readFile(path.join(root, "dist/resume/index.html"), "utf8"), /download="yulinww-resume.pdf"/);
  assert.ok((await stat(path.join(root, "dist/assets/resume.pdf"))).isFile());
});

test("删除笔记后不残留旧页面；无笔记时仍可构建", async (t) => {
  const root = await createFixture(t);
  await writeFixture(root, "notes/数据库/SQL/1.md", "# 测试\n\n正文");
  await buildSite({ root });
  await rm(path.join(root, "notes/数据库/SQL/1.md"));
  const result = await buildSite({ root });
  assert.equal(result.notes, 0);
  await assert.rejects(stat(path.join(root, "dist/notes/数据库/SQL/1.html")), { code: "ENOENT" });
  assert.match(await readFile(path.join(root, "dist/notes/index.html"), "utf8"), /笔记正在积累中/);
});

test("不合法笔记不破坏上次构建；拒绝把源目录作为输出", async (t) => {
  const root = await createFixture(t);
  await buildSite({ root });
  const before = await readFile(path.join(root, "dist/index.html"), "utf8");
  await writeFixture(root, "notes/数据库/SQL/1.md", "缺少标题");
  await assert.rejects(buildSite({ root }), /第一行必须/);
  assert.equal(await readFile(path.join(root, "dist/index.html"), "utf8"), before);
  await assert.rejects(buildSite({ root, output: path.join(root, "notes") }), /输出目录必须/);
});

test("生成站点的所有本地链接、图片和文章目录锚点均有效", async (t) => {
  const root = await createFixture(t);
  await cp(path.join(projectRoot, "notes"), path.join(root, "notes"), { recursive: true });
  await buildSite({ root });
  const output = path.join(root, "dist");
  async function htmlFiles(dir) {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...await htmlFiles(full));
      else if (entry.name.endsWith(".html")) files.push(full);
    }
    return files;
  }
  for (const file of await htmlFiles(output)) {
    const html = await readFile(file, "utf8");
    const relative = path.relative(output, file).split(path.sep).join("/");
    const base = new URL(encodePath(relative), "https://local.test/");
    assert.doesNotMatch(html, /<!--[A-Z_]+-->/, relative);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(match[1].replaceAll("&amp;", "&"), base);
      if (url.origin !== base.origin) continue;
      let target = path.join(output, decodeURIComponent(url.pathname));
      if ((await stat(target)).isDirectory()) target = path.join(target, "index.html");
      assert.ok((await stat(target)).isFile(), relative + " → " + url.pathname);
      if (url.hash && target.endsWith(".html")) {
        const content = await readFile(target, "utf8");
        assert.ok(content.includes('id="' + decodeURIComponent(url.hash.slice(1)) + '"'), relative + " → " + url.hash);
      }
    }
  }
});

test("本地服务：主页、分类页、中文文章、404 以及 MIME 类型", async (t) => {
  const root = await createFixture(t);
  await writeFixture(root, "notes/数据库/SQL/1.md", "# 测试文章\n\n正文");
  await buildSite({ root });
  const server = startServer({ port: 0, root: path.join(root, "dist") });
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = "http://127.0.0.1:" + server.address().port;
  for (const route of ["/", "/notes/", "/resume/", "/" + encodePath("notes/数据库/SQL/1.html"), "/assets/favicon.svg", "/assets/notes-index.json"]) {
    assert.equal((await fetch(origin + route)).status, 200, route);
  }
  assert.equal((await fetch(origin + "/missing")).status, 404);
  assert.equal((await fetch(origin + "/assets/styles.css")).headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal((await fetch(origin + "/notes", { redirect: "manual" })).status, 301);
  assert.equal((await fetch(origin + "/", { method: "POST" })).status, 405);
  assert.equal((await fetch(origin + "/%E0%A4%A")).status, 400);
});

test("指定两级分类顺序，未配置项目追加，空分类不出现，归属和网址不变", () => {
  const items = [
    ...records,
    note("# 新子类", "notes/数据库/子类10/1.md"),
    note("# 新子类", "notes/数据库/子类2/1.md"),
    note("# 另一个 SQL", "notes/后端/SQL/1.md")
  ];
  const before = JSON.stringify(items);
  const groups = categoriesFor(items, {
    categoryOrder: ["空分类", "后端", "数据库"],
    subcategoryOrder: { 数据库: ["空子类", "MySQL", "SQL"], 后端: ["SQL"] }
  });
  assert.deepEqual(groups.map((group) => group.name), ["后端", "数据库", "AI Agent"]);
  assert.deepEqual(groups[1].children.map((sub) => sub.name), ["MySQL", "SQL", "子类2", "子类10"]);
  assert.equal(groups[0].children[0].count, 1);
  assert.equal(groups[1].count, 4);
  assert.equal(JSON.stringify(items), before);
});

test("可选排序配置可校验，配置错误不会覆盖已有构建", async (t) => {
  const root = await createFixture(t);
  assert.deepEqual(await readSiteConfig(root), { categoryOrder: [], subcategoryOrder: {} });
  await buildSite({ root });
  const before = await readFile(path.join(root, "dist/index.html"), "utf8");
  for (const invalid of [
    null, [], { order: [] }, { categoryOrder: "数据库" }, { categoryOrder: [3] },
    { categoryOrder: [""] }, { categoryOrder: ["数据库", "数据库"] },
    { subcategoryOrder: [] }, { subcategoryOrder: { 数据库: ["SQL", "SQL"] } },
    { subcategoryOrder: { 数据库: null } }
  ]) {
    await writeFixture(root, "site.config.json", JSON.stringify(invalid));
    await assert.rejects(buildSite({ root }), /site\.config\.json/);
    assert.equal(await readFile(path.join(root, "dist/index.html"), "utf8"), before);
  }
  await writeFixture(root, "site.config.json", "{ invalid JSON");
  await assert.rejects(readSiteConfig(root), /site\.config\.json/);
  await writeFixture(root, "site.config.json", "\uFEFF" + JSON.stringify({ categoryOrder: ["数据库"] }));
  assert.deepEqual(await readSiteConfig(root), { categoryOrder: ["数据库"], subcategoryOrder: {} });
});

test("首页、笔记侧栏、文章侧栏和索引使用同一份自定义分类顺序", async (t) => {
  const root = await createFixture(t);
  const sources = ["notes/数据库/SQL/1.md", "notes/数据库/MySQL/1.md", "notes/开发工具/GitHub/1.md", "notes/AI Agent/RAG/1.md"];
  for (const source of sources) await writeFixture(root, source, "# 示例标题\n\n正文");
  await writeFixture(root, "site.config.json", JSON.stringify({
    categoryOrder: ["AI Agent", "数据库", "开发工具"],
    subcategoryOrder: { 数据库: ["MySQL", "SQL"] }
  }));
  await buildSite({ root });
  const data = JSON.parse(await readFile(path.join(root, "dist/assets/notes-index.json"), "utf8"));
  const expected = ["AI Agent", "数据库", "开发工具"];
  assert.deepEqual(data.categories.map((category) => category.name), expected);
  assert.deepEqual(data.categories[1].children.map((category) => category.name), ["MySQL", "SQL"]);
  const home = await readFile(path.join(root, "dist/index.html"), "utf8");
  const homeOrder = [...home.matchAll(/class="home-category-link" href="([^"]+)"/g)].map((match) => new URL(match[1], "https://site.test/").searchParams.get("category"));
  assert.deepEqual(homeOrder, expected);
  for (const file of ["notes/index.html", ...sources.map((source) => source.replace(".md", ".html"))]) {
    const html = await readFile(path.join(root, "dist", file), "utf8");
    assert.deepEqual([...html.matchAll(/<summary><span>(.*?)<\/span>/g)].map((match) => match[1]), expected);
    const subcategories = [...html.matchAll(/data-category="数据库" data-subcategory="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(subcategories, ["MySQL", "SQL"]);
  }
});

test("无 Git 记录时也按完整修改时间排序，同一秒内的先后不丢失", async (t) => {
  const root = await createFixture(t);
  for (const [file, time] of [["a.md", "2026-09-10T10:00:00.100Z"], ["z.md", "2026-09-10T10:00:00.900Z"]]) {
    const source = "notes/数据库/SQL/" + file;
    await writeFixture(root, source, "# " + file + "\n\n正文");
    await utimes(path.join(root, source), new Date(time), new Date(time));
  }
  const items = await loadNotes(root);
  assert.equal(items[0].source, "notes/数据库/SQL/z.md");
  assert.equal(items[1].source, "notes/数据库/SQL/a.md");
  assert.ok(Date.parse(items[0].updatedAt) > Date.parse(items[1].updatedAt));
  assert.equal(items[0].updated, "2026-09-10");
});

test("Git 同日新文章与修改过的文章按完整提交时间排序，并正确处理时区", async (t) => {
  const root = await createFixture(t);
  const emptyHooks = path.join(root, "empty-hooks");
  await mkdir(emptyHooks);
  const runGit = (args, env = {}) => execFileSync("git", [
    "-c", "core.hooksPath=" + emptyHooks,
    "-c", "user.name=Site Tests", "-c", "user.email=site-tests@example.invalid",
    ...args
  ], { cwd: root, encoding: "utf8", stdio: "pipe", env: { ...process.env, ...env } });
  runGit(["init", "--initial-branch=main", "--quiet"]);
  async function commitNote(source, title, when) {
    await writeFixture(root, source, "# " + title + "\n\n正文");
    runGit(["add", "--", source]);
    runGit(["commit", "--quiet", "--no-gpg-sign", "-m", title], {
      GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when,
      GIT_AUTHOR_NAME: "Site Tests", GIT_COMMITTER_NAME: "Site Tests",
      GIT_AUTHOR_EMAIL: "site-tests@example.invalid", GIT_COMMITTER_EMAIL: "site-tests@example.invalid"
    });
  }
  const older = "notes/数据库/SQL/a.md";
  const newer = "notes/数据库/SQL/z.md";
  await commitNote(older, "先提交", "2026-09-10T20:00:00+08:00"); // 12:00 UTC
  await commitNote(newer, "后提交", "2026-09-10T13:00:00+00:00"); // Later despite the smaller local hour
  let items = await loadNotes(root);
  assert.equal(items[0].source, newer);
  assert.equal(items[0].updatedAt, "2026-09-10T13:00:00.000Z");
  assert.equal(items[1].updatedAt, "2026-09-10T12:00:00.000Z");
  assert.equal(items[0].updated, items[1].updated);
  await buildSite({ root });
  let home = await readFile(path.join(root, "dist/index.html"), "utf8");
  const firstRecent = (html) => html.match(/class="recent-note" href="([^"]+)"/)[1];
  assert.equal(firstRecent(home), "./" + encodePath(newer.replace(".md", ".html")));
  await commitNote(older, "修改旧文章", "2026-09-10T14:00:00+00:00");
  items = await loadNotes(root);
  assert.equal(items[0].source, older);
  assert.equal(items[0].updatedAt, "2026-09-10T14:00:00.000Z");
  await buildSite({ root });
  home = await readFile(path.join(root, "dist/index.html"), "utf8");
  assert.equal(firstRecent(home), "./" + encodePath(older.replace(".md", ".html")));
});
