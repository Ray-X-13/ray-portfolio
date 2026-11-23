# 味衡 WEIHENG

**AI Food Decision Assistant｜饭前决策 → 饮食记录 → 反馈分析 → 个性化调整**

味衡是一个可运行、可交互的饮食决策 Web Demo。它先把饥饿感、可用时间、预算、现有食材、用餐场景与个人目标整理为当下条件，再给出一份可执行的主餐建议、推荐理由、食材、做法、营养区间和替代方案。完成一餐后，用户可以把它转入饮食记录，并用一次轻量反馈形成“记忆候选”；只有经过确认的记忆，才会改变下一次排序。

默认版本使用**可解释的本地规则推荐**，不依赖 API Key。项目同时提供可选的真实大模型代理接入层；未配置模型时，界面会明确显示“本地规则推荐”，不会把规则逻辑伪装成大模型输出。

![首页概览](evidence/home-desktop.png)

项目内置手机友好的作品展示页：运行后访问 `/showcase.html`。展示页包含核心闭环、三张手机端截图、AI 边界、测试结果和材料下载入口。

## 项目状态

- 完整源码：已实现
- 本地运行：已实测
- 生产构建：已通过
- 推荐与记忆自动测试：10 / 10 通过
- Chrome 端到端流程：24 / 24 通过
- 桌面与移动端截图：已生成
- 公开部署链接：**尚未部署**。公开部署需要账号与发布授权，当前没有编造作品链接。
- 已有源码仓库：[Ray-X-13/weiheng-ai](https://github.com/Ray-X-13/weiheng-ai)
- 原 GitHub Pages 地址检查：`https://ray-x-13.github.io/weiheng-ai/` 返回 HTTP 404，不能作为可访问 Demo。

## 核心功能

### 1. 个性设置

- 饮食目标：均衡饮食、增加蛋白质、轻负担管理、补充能量
- 多选饮食偏好与“素食”约束
- 忌口、过敏原及自定义排除项
- 单餐预算
- 默认可接受准备时间
- 常用食材与自定义食材
- 所有设置保存在浏览器 `localStorage`，刷新页面后保留

### 2. 餐食推荐

- 输入当前想吃什么、用餐场景、已有食材、时间、预算、目标和饥饿感
- 按食材覆盖率、时间、预算、目标、偏好、近期重复与场景综合排序
- 忌口和过敏原为硬过滤条件
- 输出主建议与两项替代方案
- 支持重新生成、切换替代餐，并将建议直接转为饮食记录
- 已确认长期记忆参与排序，并在餐卡中显示记忆依据
- 界面清晰标注推荐来源是“本地规则推荐”还是“智能模型”

### 3. 饮食记录

- 从推荐结果一键添加记录
- 手动添加记录
- 按日期与餐次查看
- 搜索、筛选近 7 天或示例记录
- 餐后选择“还想再吃 / 一般 / 不太合适”
- 修改、二次确认后删除
- 数据只保存在当前浏览器

### 4. 饮食反馈

- 近 7 天记录节奏
- 餐次分布
- 碳水、蛋白质和脂肪的能量占比估算
- 蔬菜出现频率、蛋白质来源和重复餐食反馈
- 待确认、已确认和可停用的长期记忆
- 来自设置的安全边界始终优先于学习记忆
- 今日概览与下一次决策入口
- 所有营养数据均明确标注为估算，不用于医疗诊断

### 5. 响应式体验

- 桌面端固定侧边导航
- 移动端顶部品牌栏与底部主导航
- 已用 390 × 844 移动视口验证无横向溢出
- 支持减少动态效果的 `prefers-reduced-motion`

## 本地运行

环境要求：Node.js 20 或更高版本，推荐 Node.js 22。

```bash
cd 味衡_WEIHENG_v3
npm install
npm run dev
```

打开终端输出的本地地址，默认通常为：

```text
http://127.0.0.1:5173/
```

生产构建与本地预览：

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，可以直接用于任意静态网页托管。

## 测试

推荐逻辑单元测试：

```bash
npm test
```

浏览器端到端验收需要先启动本地服务，并确保本机安装 Google Chrome：

```bash
npm run dev
# 在另一个终端运行
npm run qa:browser
```

测试脚本覆盖首页、推荐生成、来源标注、建议转记录、刷新后数据保留、修改、删除、反馈看板、设置影响推荐、移动端导航与横向溢出检查。实际结果见 [TEST_REPORT.md](TEST_REPORT.md)。

## 数据持久化

LocalStorage 键名：

- `weiheng-settings-v2`：个性化设置
- `weiheng-records-v2`：饮食记录及餐后反馈
- `weiheng-memory-v2`：待确认、已确认和已停用的长期记忆

首次打开时包含 7 条明确标注为“示例”的演示记录，便于展示看板。用户可以在“个性设置 → 重置演示数据”中恢复初始示例。清除浏览器站点数据也会重新初始化。

## 产品截图

| 决定一餐 | 饮食记录 |
| --- | --- |
| ![决定一餐](evidence/decision-desktop.png) | ![饮食记录](evidence/records-desktop.png) |

| 饮食反馈 | 个性设置 |
| --- | --- |
| ![饮食反馈](evidence/insights-desktop.png) | ![个性设置](evidence/settings-desktop.png) |

![餐后反馈形成长期记忆候选](evidence/memory-desktop.png)

| 移动端首页 | 移动端推荐 |
| --- | --- |
| ![移动端首页](evidence/home-mobile.png) | ![移动端推荐](evidence/decision-mobile.png) |

## 技术架构

```text
React 19 + TypeScript + Vite
├── 页面与交互
│   ├── Dashboard / 今日
│   ├── Decision / 决定一餐
│   ├── Records / 饮食记录
│   ├── Insights / 饮食反馈
│   └── Preferences / 个性设置
├── 状态与存储
│   ├── React state
│   └── LocalStorage
├── 推荐层
│   ├── 本地可解释规则引擎（默认）
│   └── 可选 AI endpoint 适配器
├── 可选模型层
│   └── Node.js 原生 HTTP 代理
└── 自动化
    ├── Vitest 单元测试
    └── Playwright Core + 本机 Chrome E2E
```

核心目录：

```text
味衡_WEIHENG_v3/
├── src/
│   ├── components/             界面组件与布局
│   ├── pages/                  五个产品页面
│   ├── data/meals.ts           餐食目录与设置选项
│   ├── lib/recommendation.ts   本地推荐与忌口过滤
│   ├── lib/memory.ts           餐后反馈到长期记忆
│   ├── lib/recommendationService.ts  可选 AI 接口适配
│   ├── lib/storage.ts          LocalStorage 数据层
│   ├── lib/nutrition.ts        估算汇总与趋势数据
│   └── styles.css              完整视觉系统与响应式样式
├── server/ai-proxy.mjs         可选 OpenAI-compatible 模型代理
├── scripts/qa-smoke.mjs        Chrome 端到端验收
├── evidence/                   桌面和移动端截图
└── dist/                       已生成的生产构建
```

## AI 能力说明

### 当前默认：本地规则

默认情况下，推荐由 `src/lib/recommendation.ts` 完成。它不是大模型，主要进行：

1. 按用户忌口与过敏原过滤不安全候选。
2. 对食材覆盖、可用时间、预算、饮食目标、偏好、餐食热度与近期重复进行加权排序。
3. 将用户确认的偏好或回避记忆作为可见的额外权重。
4. 根据实际命中条件生成推荐理由和替代方案。

这种方式无需密钥、可离线运行、结果可解释，但餐食目录规模有限，对自然语言的理解只覆盖关键词级匹配。

### 可选：真实大模型

如需接入 OpenAI-compatible 模型：

1. 密钥只能存在服务端环境变量中。
2. 启动代理：

```bash
export AI_API_KEY="your_server_side_key"
export AI_BASE_URL="https://api.openai.com/v1"
export AI_MODEL="gpt-4.1-mini"
export ALLOWED_ORIGIN="http://127.0.0.1:5173"
npm run ai:server
```

3. 在前端 `.env.local` 中设置：

```bash
VITE_AI_ENDPOINT=http://127.0.0.1:8787/api/recommend
```

4. 重新启动 `npm run dev`。

代理会要求模型只能从传入的餐食目录中选择，并在服务端再次执行忌口过滤。模型返回的餐食 ID 必须存在于安全目录中，否则请求失败；前端会自动回退到本地规则，并显示提示。

**本次交付没有提供或使用真实模型 API Key，因此“真实大模型在线调用”部分只完成了可配置接入代码，未对具体供应商进行在线验收。** 当前截图和演示中的推荐均为本地规则结果。

## 数据与安全边界

- 前端不包含任何模型密钥。
- 默认版本不上传用户设置与记录，数据只写入当前浏览器。
- 启用模型代理后，当次决策条件、设置、近期餐名和候选目录会发送给所配置的模型供应商；该代理本身不持久化请求。
- 模型代理限制请求体大小、限制允许来源，并对模型返回值做结构验证和食材安全校验。
- 产品没有登录系统、云数据库、真实营养数据库、外卖平台或可穿戴设备连接。
- 营养数字来自精选餐食目录的区间估算，假设常见食材份量与做法，并非称重或实验室测量。
- 本产品不是医疗诊断工具，不提供疾病治疗建议；严重过敏用户仍需核对真实食品标签。

## 部署

### Gitee 仓库管理

在 Gitee 新建空仓库，然后：

```bash
cd 味衡_WEIHENG_v3
git init
git add .
git commit -m "feat: complete WeiHeng AI food decision demo"
git branch -M main
git remote add origin https://gitee.com/<your-name>/<repo>.git
git push -u origin main
```

公开推送仓库需要你的 Gitee 账号授权，本交付未代为执行。

### 静态网页托管

构建：

```bash
npm install
npm run build
```

将 `dist/` 目录部署到 Netlify、Cloudflare Pages、Vercel 或 GitHub Pages。Vite 已设置 `base: "./"`，适用于普通静态子路径。

最直接的 Netlify Drop 流程：

1. 本地执行 `npm run build`。
2. 打开 Netlify Drop。
3. 将整个 `dist/` 目录拖入页面。
4. 获得公开 URL 后，在报名材料中填写。

Gitee Pages 的公开服务状态可能变化；如果当前账号没有可用 Pages 服务，建议继续用 Gitee 管理源码，并使用 Netlify 或 Cloudflare Pages 托管 `dist/`。静态托管只支持本地规则版本，除非另外部署 `server/ai-proxy.mjs` 并配置服务端密钥。

## 已知局限

- 餐食目录目前为 8 条精选用例，不构成完整营养数据库。
- 默认推荐采用加权规则和关键词匹配，不是自然语言大模型推理。
- 营养数据是区间估算，不适合医学、临床或专业运动营养用途。
- 没有账户、多设备同步、图片识别、扫码或外部餐单抓取。
- 示例记录用于展示看板，首次体验时应明确识别其“示例”标签。
- 可选的模型代理尚未用真实供应商密钥在线验证。

## 交付材料

- [PROJECT_SHOWCASE.md](PROJECT_SHOWCASE.md)：完整项目展示材料
- [APPLICATION_DESCRIPTION.md](APPLICATION_DESCRIPTION.md)：报名表项目介绍
- [DEMO_SCRIPT.md](DEMO_SCRIPT.md)：60—90 秒演示脚本
- [TEST_REPORT.md](TEST_REPORT.md)：测试范围与实测结果
- [DEPLOYMENT.md](DEPLOYMENT.md)：Gitee 与静态托管步骤
- [REDESIGN_DECISIONS.md](REDESIGN_DECISIONS.md)：重构方向与取舍
- [ITERATIONS.md](ITERATIONS.md)：三轮实际迭代记录
- [STATUS.md](STATUS.md)：当前进度与未解决问题

## 已有成果与本次新增的边界

工作区原有 `味衡_产品交付/` 静态产品页面、产品设计方案和品牌视觉材料。第一版 React Demo 位于 `味衡_WEIHENG/`，功能重构版位于 `味衡_WEIHENG_v2/`。当前 `味衡_WEIHENG_v3/` 在保留完整功能的同时，重新设计了手机优先的首页、决策工作台、移动导航、餐卡和反馈页面。

因此，报名材料中可以说明“味衡产品概念和早期视觉探索此前已经存在”，但不应把本次重构新增的餐后反馈、长期记忆、LocalStorage 数据层、规则推荐引擎、图表反馈和自动化测试描述为此前的成果。
