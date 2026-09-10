# yulinww · 个人主页

一个用于 GitHub Pages 的轻量个人网站，包含首页、个人简历和学习笔记。界面使用原生 HTML / CSS / JavaScript，笔记在构建时生成独立 HTML 页面。访问网站不需要后端服务，也不依赖第三方 CDN。

## 快速开始

安装 Node.js 22 或更高版本（自动发布使用 Node.js 24），在仓库根目录执行：

```sh
npm ci
npm run dev
```

打开终端打印的地址，默认是 **http://127.0.0.1:4173/**。

- 修改页面、笔记或图片后，脚本自动重新生成网站，刷新浏览器即可查看。
- 修改 `scripts/` 中的构建脚本后，需要重启开发服务。
- 不要双击源文件 `index.html` 预览；导航、文章页和搜索索引由构建脚本生成，搜索需要通过 HTTP 访问。
- 如 Windows PowerShell 阻止运行 `npm.ps1`，把命令中的 `npm` 换成 `npm.cmd` 即可，无需修改执行策略。
- 默认端口被占用时，可在 PowerShell 中先执行 `$env:PORT = '4174'`，再执行 `npm run dev`。

其他命令：

```sh
npm test          # 验证笔记规则、搜索、生成页面与本地链接
npm run build    # 生成 dist/ 发布目录
npm run preview  # 预览已经生成的 dist/，不自动构建
```

## 新增学习笔记

### 1. 用目录确定两级分类

```text
notes/
├── 数据库/                       ← 一级分类
│   ├── SQL/                      ← 二级分类
│   │   ├── 1.md
│   │   ├── 2.md
│   │   └── pics/                 ← 该目录下的笔记共用图片文件夹
│   │       └── 查询示例.svg
│   └── MySQL/
│       └── pics/
├── 后端/
│   └── HTTP/
├── 前端/
│   └── CSS/
└── AI Agent/
    ├── LangChain/
    ├── LangGraph/
    └── RAG/
```

每篇笔记必须位于 `notes/一级分类/二级分类/文件.md`。两个分类名称直接使用目录名称，支持中文和空格。新增分类只需要创建对应目录并放入文章，不需要登记配置文件。

规则：

- 仅支持两级分类。直接放在 `notes/`、只有一级分类或位于第三级目录的 Markdown 会让构建报错，并列出具体文件。
- `pics/` 为保留的图片目录，其中的文件不参与文章扫描。
- 只有包含文章的分类才显示在页面中；空目录和 `.gitkeep` 不显示。已预留的 MySQL、LangChain、LangGraph 目录在加入第一篇文章后出现。
- 分类按名称排序；文章按最近 Git 提交日期倒序，同日按路径自然排序。
- 新建但尚未提交的笔记在本地使用文件修改日期。自动发布拉取完整 Git 历史，避免每次部署都刷新全部文章日期。
- 不读取 Front Matter，不支持标签。分类的唯一来源就是目录。

### 2. 第一行写一级标题

文件名可以保持简短，例如 `1.md`。**展示标题只使用文件第一行的一级标题，不使用文件名。**

```markdown
# SQL / WHERE：条件怎么写？

这一段说明笔记的主要内容，也会自动作为列表摘要。

## 基础用法

这里开始写正文。

### 一个小例子

继续补充内容。
```

- 第一行必须是 `# 标题`，`#` 后需要空格。标题前不要加空行、Front Matter 或其他内容。
- 支持 UTF-8 BOM 和 Windows 换行。文件请保存为 UTF-8。
- 标题可包含中文、标点、空格、长文本以及 Markdown 行内格式；网页展示其文字内容。
- 标题只负责显示。网址仍由目录和文件名生成，例如 `notes/数据库/SQL/1.html`，因此只修改标题不会改变网址。
- 首个顶层正文段落自动生成摘要，二级、三级标题自动生成页内目录。
- 缺少有效标题时，构建失败并提示文件路径，不会悄悄回退到文件名。

### 3. 插入图片

把图片放到 Markdown 同级的 `pics/` 中：

```markdown
![查询结果](pics/查询示例.svg)
```

文件名含空格时，用尖括号包裹路径：

```markdown
![查询结果](<pics/查询 示例.png>)
```

同目录下的多篇 Markdown 可以引用相同图片。不需要加网站域名，也不要使用本地磁盘路径。路径用正斜杠 `/`，文件名大小写需要一致。构建时保留原目录结构，因此图片路径无需手动修改。

支持普通 Markdown 图片语法；原始 HTML（包括 `<img>` 标签）会按文字显示，请使用上面的 Markdown 写法。

### 4. 链接到其他笔记

```markdown
[同目录的另一篇笔记](2.md)

[指定小节](2.md#where-与-having)

[另一个分类的笔记](<../../AI Agent/RAG/1.md>)
```

相对链接中的 `.md` 会自动转换为 `.html`，查询参数和锚点保留。文章目录中的小节链接可以直接复制。英文标题锚点使用小写，空格转换为连字符，标点移除；重复小节自动加数字后缀。

### 5. 修改或删除笔记

修改 Markdown 后重新构建即可。删除 Markdown 后，对应的文章页和索引条目也会在下次构建时移除。改名或移动 Markdown 会改变网址，需要同步修改引用它的笔记链接。

仓库附带 **5 篇标明“示例笔记”的文章**，用于演示列表、分类、代码、表格和图片。可以直接修改或删除，不必保留。其中两篇 SQL 示例共用同一张图片。

## 简历与 PDF 下载

### 填写网页简历

编辑 `resume/index.html`，把各节中的“待补充”替换为自己的内容。已有基本信息、教育背景、研究方向、项目经历、专业技能和联系方式六个区域，当前不包含个人简历信息。

### 放置简历 PDF

**PDF 的固定位置：仓库根目录下的 `assets/resume.pdf`。**

```text
yulinww.github.io/
└── assets/
    └── resume.pdf
```

- 没有这个文件时，“下载简历 PDF”按钮禁用，显示“简历待更新”。
- 放入文件并重新构建/发布后，按钮自动启用，不需要修改代码。
- 下载文件名为 `yulinww-resume.pdf`；PDF 的内容由你提供，项目没有生成占位 PDF。
- 网页简历与 PDF 独立维护，修改其中一个不会自动更新另一个。

## 发布到 GitHub Pages

仓库已包含 `.github/workflows/pages.yml`。本地生成目录 `dist/` 无需提交。

首次配置：

1. 把代码提交并推送到 `yulinww/yulinww.github.io` 的 `main` 分支。
2. 打开仓库的 **Settings → Pages → Build and deployment**。
3. 把 **Source** 设置为 **GitHub Actions**。不要继续使用“Deploy from a branch”，因为本项目需要先生成笔记页面。
4. 打开 **Actions → Build and deploy GitHub Pages**，检查执行结果。若首次推送时还未配置 Pages，可在设置完成后选择 **Run workflow** 重新运行。
5. 成功后访问 `https://yulinww.github.io/`。

此后向 `main` 推送页面、笔记、图片或 PDF，都会自动执行安装、测试、构建和部署。Pull Request 仅测试和构建，不发布。没有有效标题、目录不符合要求或本地文章链接失效时，检查会报告错误，不会更新线上版本。

工作流仅发布 `dist/` 中的静态网站，**不会把构建脚本、测试或 node_modules 发布为网站文件**。`notes/` 下的正文、图片和附件会随站点公开，放入此目录前请确认它们是打算发布的内容。

实现参考 [GitHub Pages 自定义工作流官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 文件结构与修改入口

| 文件/目录 | 用途 |
| --- | --- |
| `index.html` | 首页介绍与结构 |
| `resume/index.html` | 网页简历内容 |
| `notes/index.html` | 笔记列表页结构 |
| `notes/一级/二级/*.md` | 笔记内容 |
| `assets/styles.css` | 配色、字体、布局、手机端与打印样式 |
| `assets/site.js` | 手机分类菜单、代码复制、阅读目录 |
| `assets/notes.js` | 分类筛选、全文搜索、网址状态 |
| `assets/notes-model.js` | 搜索匹配和高亮逻辑 |
| `assets/resume.pdf` | 你后续提供的 PDF 简历 |
| `scripts/build.mjs` | 扫描目录、生成文章页与搜索索引、拼装公共导航 |
| `scripts/dev.mjs` | 监听源文件变化并重新构建 |
| `scripts/serve.mjs` | 本地预览服务 |
| `test/site.test.mjs` | 自动化验证 |
| `.github/workflows/pages.yml` | GitHub Pages 自动发布 |
| `dist/` | 自动生成的发布文件，不要手动编辑 |

公共导航、页脚和 GitHub 链接位于 `scripts/build.mjs`。首页介绍在 `index.html`。配色变量位于 `assets/styles.css` 开头。

## 已实现的阅读功能

- 两级分类、折叠导航和文章数量。
- 标题与正文全文搜索，支持多个空格分隔的关键词、代码内容检索与命中高亮。
- 分类与搜索关键词保存在网址中，刷新、分享链接和浏览器前进/后退可恢复。
- 独立文章网址、分类路径导航、页内目录、回到顶部、Markdown 原文下载。
- 代码高亮与复制、表格横向滚动、图片自适应。
- 手机分类菜单和可折叠文章目录。
- 搜索无结果、索引加载失败、无笔记、缺少 PDF 和 404 状态。
- 主要文章内容已生成到 HTML，关闭 JavaScript 仍可阅读；分类筛选、搜索和代码复制需要 JavaScript。

目前使用标准 Markdown 与表格扩展，不包含标签、评论、登录、在线编辑器、数学公式渲染或 Mermaid 渲染。日后可以按实际需要扩展。
