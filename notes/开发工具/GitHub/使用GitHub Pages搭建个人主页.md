# 使用GitHub Pages搭建个人主页

## 准备工作

1. 科学上网
2. 一个GitHub账号
3. 一台电脑



## 第一步：创建网站仓库

这个仓库比较特殊，它的名字必须遵循固定格式，这样GitHub才能识别并将其作为你的个人主页网站。

1. 登录你的GitHub账号。
2. 点击页面右上角的`+`号，在下拉菜单中选择New repository。
3. 在Repository name的输入框中，必须严格按照`你的用户名.github.io`的格式来填写。
4. 设为公开：确保仓库是Public的。私有仓库无法免费开启Pages服务。
5. 添加初始化文件：勾选Add a README file。这个文件未来可以用来写网站的介绍。
6. 点击Create repository按钮。



## 第二步：添加网站内容

### 方法：直接创建一个网页

这个方法可以让你快速拥有一个“毛坯房”，你可以后续通过html和css来装修它。如果你以后想深入学习，并拥有一个非常个性化的网站，则推荐这个方法。

1. 进入你刚才创建的`你的用户名.github.io`仓库页面。
2. 点击Add file -> Create new file。
3. 在文件命名框中，输入`index.html`。`index.html`是网站首页的默认文件名，必须是这个名字。
4. 在下方的文件编辑区，复制并粘贴以下最简单的html代码：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的个人网站</title>
</head>
<body>
    <h1>你好，世界！</h1>
    <p>欢迎来到我的第一个个人网站。这里是使用 GitHub Pages 搭建的。</p>
</body>
</html>
```

5. 点击Commit changes按钮。
6. 完成。现在，等待1-2分钟，然后在浏览器中访问`https://你的用户名.github.io`，就能看到你的第一个网页了。

> 这一步可以直接交给AI执行。



## 第三步：进一步配置仓库

1. 打开仓库的Settings
2. 点Pages，将`Build and deployment`下的Source改为`Github Actions`
3. 打开仓库的Actions
4. 点`Build and deploy GitHub Pages` -> `Run workflow` -> `Branch:main`

