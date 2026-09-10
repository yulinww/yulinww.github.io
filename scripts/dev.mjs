import { watch } from "node:fs";
import path from "node:path";
import { buildSite, projectRoot } from "./build.mjs";
import { startServer } from "./serve.mjs";

await buildSite();
const server = startServer();
let timer;
let rebuilding = false;
let queued = false;
async function rebuild() {
  if (rebuilding) { queued = true; return; }
  rebuilding = true;
  try {
    const result = await buildSite();
    console.log("已更新 " + result.notes + " 篇笔记，刷新浏览器查看。");
  } catch (error) { console.error(error.message); }
  finally {
    rebuilding = false;
    if (queued) { queued = false; await rebuild(); }
  }
}
function scheduleRebuild() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 200);
}
const watchers = ["notes", "assets", "resume"].map((entry) => watch(path.join(projectRoot, entry), { recursive: true }, scheduleRebuild));
// Watch the directory so replacing/temporarily removing a config file still works.
watchers.push(watch(projectRoot, (_event, filename) => {
  if (["index.html", "site.config.json"].includes(String(filename))) scheduleRebuild();
}));
function close() {
  clearTimeout(timer);
  watchers.forEach((watcher) => watcher.close());
  server.close();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
