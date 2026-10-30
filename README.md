# career-archive

把散落各处的职业信息，做成一份可点开、可切换内外双档的单文件 HTML《个人职业档案白皮书》：岗位画像引导 → 真实时间线 → 项目台账 → 三段式深挖 → 白皮书生成 → 归档同步。不绑定行业与岗位。

Turn scattered career notes into a single-file HTML career whitepaper — guided intake, real timeline, project ledger, 3-part deep dives, dual internal/public views. Role-agnostic.

---

## 它解决什么

| 痛点 | 这个 skill 的做法 |
| - | - |
| 简历每改一版就美化一点，真实情况说不清 | **真实口径 vs 简历口径两栏并存**，时间线与薪酬链独立维护 |
| 三年前的项目只记得名字，细节全忘 | 每个项目一份**三段式深挖 md**，可导出 STAR 故事库 |
| 每次述职 / 面试从零重写材料 | 一份白皮书反复复用，项目、曲线、能力模型都在里面 |
| 想让别人看成果，又不想暴露薪资与离职原因 | **内外双档**：同一份 HTML，CSS 一键切换内外两套口径 |

## 七阶段主流程

按顺序推进，任一阶段未收口不进入下一阶段。

| 阶段 | 做什么 | 产出 | 规范 |
| - | - | - | - |
| 0 | 岗位画像与引导（六个必问 → 定岗位族 → 项目清单） | `intake.md` | `references/00` |
| 1 | 资料采集与信源分层（L1 本人 → L4 公开渠道） | 待确认清单 | `references/01` |
| 2 | 真实时间线基线（薪酬阶梯、Gap、外包单列） | `K1-1_经历时间线.md` | `references/01` |
| 3 | 项目全景台账（一项目一行，字段标来源） | 台账表 | `SKILL.md` |
| 4 | 逐项目三段式深挖（背景 / 方案 / 我的角色） | `项目深挖-NN_xx.md` | `references/02` |
| 5 | 生成单文件 HTML 白皮书（甘特 + 弹层 + 双档） | `whitepaper.html` | `references/05`、`references/03` |
| 6 | 归档同步（本地 / 资产库 / 知识库三处落地） | 归档记录 | `references/04` |

## 安装

无第三方依赖，Node.js ≥ 16。

```bash
git clone https://github.com/magictammm/career-archive.git \
  ~/.workbuddy/skills/career-archive
```

放进任意 Agent Skill 目录即可（Claude Skills 同结构：`<skills-dir>/career-archive/SKILL.md`）。

## 快速开始

```bash
# 0. 先做阶段 0：把这份问卷发给用户填
cat assets/intake-questionnaire.md

# 1. 初始化档案目录（含时间线骨架、项目深挖目录、config 骨架）
node scripts/init_archive.cjs --company "公司名" --period "2023.09-2026.08" --out ./我的档案

# 2. 按 references/01 建时间线，按 references/02 逐项目写深挖 md

# 3. 复制 assets/whitepaper_skeleton.html → 填章节与 docdata → 生成白皮书
#    项目数 ≤ 8 时直接手写骨架里的 gantt 更快

# 4. 需要坐标精确的大规模甘特时，填好 archive.config.json 再生成框架页
node scripts/build_framework.cjs ./我的档案/archive.config.json
```

## 目录结构

```
career-archive/
├── SKILL.md                      主流程、硬规则、版本演进记录
├── references/
│   ├── 00-岗位画像与引导.md      六问引导、11 个岗位族的轴与指标、判定与降级
│   ├── 01-信源与时间线.md        信源分层、时间线冲突裁决、薪酬阶梯
│   ├── 02-三段式深挖.md          三段写作要求、好坏示例、常见坑
│   ├── 03-框架页规范.md          甘特坐标、样式、交互、渲染踩坑清单
│   ├── 04-归档与同步.md          资产库结构、知识库同步、频控、证据登记
│   └── 05-白皮书结构与双档.md     章节目录、数据来源、双档 CSS、验收清单
├── assets/
│   ├── whitepaper_skeleton.html        白皮书骨架（样式 + 翻页 + 弹层 + 双档 + 示例章）
│   ├── intake-questionnaire.md         可直接发给用户的问卷（含填写示例）
│   ├── project-deepdive-template.md    三段式空白模板
│   ├── framework_template.html         框架页模板
│   └── archive.config.example.json     框架页数据配置样例
└── scripts/
    ├── init_archive.cjs          初始化档案目录 + config 骨架
    └── build_framework.cjs       读配置 + md 目录 → 生成自包含框架页
```

## 适配岗位

同一套流程，只换「纵轴分层」与「必备量化指标」。已覆盖 11 个岗位族：产品经理、研发、设计、运营、市场、销售、BA、PMO、项目管理、职能岗、硬件/制造。详见 `references/00-岗位画像与引导.md`。

判定规则：**以交付物为准，不以自述岗位为准**——人会高报岗位，交付物不会说谎。

## 注意

- **隐私**：生成的白皮书默认是**内部档**，含薪资、离职原因、外包/派遣、负面复盘。对外分享前务必切到对外档，不要直接发原始 HTML 或 `docdata` 源文件。
- **本仓库不含任何真实个人数据**：所有示例均为 `XX / YY / ZZ` 占位内容，可直接公开使用。
- **不覆盖已有文件**：任何迭代另出新版本（`_v2` / 新文件名），旧版保留。
- **截图自检**：改完白皮书必须用无头浏览器实拍（封面 / 经历章 / 薪资页 / 弹层），不靠肉眼读代码——弹层失效事故就是读代码看不出来的。

## License

MIT
