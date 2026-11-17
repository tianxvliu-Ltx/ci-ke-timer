# 此刻 · 计时

一个安静、顺手的中文计时工具。

## 功能

- 倒计时：支持常用时长和自定义时长
- 秒表：显示到百分之一秒
- 计次：最多保存 500 次计次
- 开始、暂停、继续和重置
- 倒计时结束时显示提示并播放提醒音
- 全屏专注
- 在当前浏览器保存计时状态和声音设置
- 手机和电脑布局适配

## 文件结构

```text
ci-ke-timer/
├── index.html
├── style.css
├── app.js
├── engine.js
├── icon.svg
└── README.md
```

## 技术

使用 HTML、CSS 和原生 JavaScript。

无需安装项目依赖，无需编译，不需要数据库。

## 本地运行

因为项目使用 JavaScript 模块，请通过 HTTP 服务器访问，不要直接双击 index.html。

安装 Python 3 后，在项目文件夹中打开终端，运行：

```sh
python -m http.server 8000
```

如果电脑使用 python3 命令，则运行：

```sh
python3 -m http.server 8000
```

然后在浏览器打开：

```text
http://localhost:8000
```

也可以使用 VS Code 的 Live Server 扩展启动项目。

## 快捷键

在没有聚焦输入框、按钮或链接时：

- Space：开始或暂停
- R：重置当前模式
- L：秒表计次
- F：进入或退出全屏

在模式切换按钮上，可以用左右方向键切换模式，
用 Home 选择倒计时，用 End 选择秒表。

## 上传到 GitHub

1. 登录 GitHub，创建名为 ci-ke-timer 的仓库。
2. 在仓库中选择 Add file → Upload files。
3. 上传本文件夹中的六个文件。
4. 确保 index.html 位于仓库根目录。
5. 填写提交说明并点击 Commit changes。

## 使用 GitHub Pages 部署

仓库需要支持 GitHub Pages。GitHub Free 通常使用公开仓库部署。

1. 打开仓库 Settings。
2. 进入 Pages。
3. 在 Source 中选择 Deploy from a branch。
4. 选择 main 分支。
5. 文件目录选择 / (root)。
6. 点击 Save。
7. 等待部署完成，访问 GitHub 提供的网页地址。

## 数据保存

项目使用 localStorage 保存计时状态、计次记录和声音设置。

数据只保存在当前浏览器中，不会自动同步到其他设备。

清除浏览器数据会删除保存的记录。
更换网站域名后，不会自动读取原网站的记录。

项目没有用户登录、服务端数据库或云端同步功能。

## 字体与提醒

字体通过 Google Fonts 加载，无法访问时会使用系统字体。
计时功能不依赖字体服务。

声音提醒需要浏览器允许音频播放。
设备休眠或浏览器后台限制可能导致声音提醒延后。
重新显示页面时，会根据时间戳更新计时。

## 整理来源

根据用户提供的 HTML、CSS、app.js 和 engine.js 整理。

修复了复制产生的转义符号和功能代码中的中文乱码。
icon.svg 是本次补充的图标。