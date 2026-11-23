# CookMate 48 小时实体方案页

这是 CookMate 的静态项目介绍与报名辅助页，使用 HTML、CSS 和原生 JavaScript，无需构建。

## 本地运行

```bash
python3 -m http.server 8080
```

打开 `http://localhost:8080/`。

## 页面内容

- V2 外露工程样机：固定屏幕 + 单轴相机云台；
- 可打印 STL、1:1 纸模板、BOM 和接线图；
- RDK X5 的软件状态机模拟；
- 48 小时三步硬件验收；
- 一页报名方案卡和硬件包下载；
- 明确区分设计、模拟、实机状态。

## 文件

```text
11_WEBSITE/
├── index.html
├── styles.css
├── script.js
├── README.md
└── assets/
    ├── engineering_prototype.png
    ├── exploded_prototype.png
    ├── wiring.png
    ├── application_build_card.png
    ├── CookMate_48h_Hardware_Kit.zip
    └── CookMate_DDC2026_Application_Kit.zip
```

`CookMate_48h_Hardware_Kit.zip` 是给评审下载的工程材料包，包括 STL、纸模板、BOM、接线、烟测脚本和本地状态机。

`CookMate_DDC2026_Application_Kit.zip` 是更小的报名材料包，包含报名正文、一页方案卡、提交指南、45 秒视频分镜和硬件包，适合作为表单附件。

## 可交互内容

- 继续、重复、暂停、计时查询；
- 手进入切配区、进入锅具区；
- 手离开两个操作区后只提示；
- 暂停后相机云台回中；
- 重新开始。

该区域明确显示 `UI SIMULATION / LOCAL STATE`，不是 RDK 真机。

## 状态原则

- `Design package ready`：STL、纸模板、接线、BOM 和状态机存在；
- `Desktop state demo ready`：本地 Python/网页状态机可以运行；
- `RDK hardware test not yet`：还没有项目真机的相机/音频/PWM 组合证据；
- `Physical assembly not yet`：还没有本项目实体照片和连续运行视频。

只有实际打印、接线、上电、连续运行后才更新实机状态。

## Gitee 上传与发布

本环境没有登录授权，因此没有创建远端仓库或公开发布。可由仓库负责人在 `CookMate/` 根目录执行，或只把 `11_WEBSITE/` 作为独立静态仓库。

如果只发布网站：

```bash
cd 11_WEBSITE
git init
git add .
git commit -m "Add CookMate hardware-first concept page"
git branch -M main
git remote add origin <Gitee repository URL>
git push -u origin main
```

如果整份 `CookMate/` 已经处于父 Git 仓库中，不要再把网站初始化为嵌套仓库。

Gitee Pages 是否可用取决于账户实名、仓库状态和当时的服务规则。发布前检查：

- 仓库公开范围符合要求；
- Pages 服务可用；
- 选择 `main` 和正确目录；
- 打开公开 URL 验证首页、图片、按钮和下载文件；
- 不把仓库地址当成网页地址。

若 Pages 不可用，可将静态站部署到 GitHub Pages、Cloudflare Pages 或 Netlify。公开部署需要账号与发布授权。

## 测试

- `node --check script.js`
- 桌面宽度检查首页、硬件区、接线区和交互区；
- 点击“继续”从第 2 步推进到第 3 步；
- 点击“手进入锅具区”，相机状态变化但步骤不变；
- 点击“暂停”，计时冻结、麦克风停止、云台回中；
- 点击“手离开操作区”，只产生询问，不推进；
- 下载 `CookMate_DDC2026_Application_Kit.zip` 成功；
- 手机宽度检查不横向滚动；
- 断网加载本地页面；
- 下载硬件包并解压、检查 STL 和 PDF/图片。

2026-11-22 已在本机 HTTP 服务和 Microsoft Edge 中执行上述桌面测试；移动端与公开发布仍未测试。
