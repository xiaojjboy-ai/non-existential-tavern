# Task_DialogueBox_布局修复

**人类负责人**：用户
**角色**：developer
**Agent 工具**：Kilo
**接任务**：2026-05-30 — 修复对话框/选项菜单独立成块、点击无反应、播放流程与脚本文本对齐
**完成**：2026-05-30 — 对话框重构为贴底独立块，选项恒在视口内可点，端到端流程验证通过

## 改了什么

- `src/components/DialogueBox.tsx`：
  - 容器由 `absolute inset-0`（被钉死在 33vh 吧台内、选项溢出视口外不可点）改为 `absolute bottom-0 inset-x-0 max-h-[72vh] overflow-y-auto`，贴底锚定、向上自然增高，选项恒在视口底部可见可点。
  - 加半透明深色块背景（`rgba(10,10,10,0.82)`）+ 顶部琥珀边框 + 阴影 + 轻微背景模糊，使对话框成为独立模块。
  - 收窄角色名/正文边距（mt-6→mt-4、mb-8→mb-4、min-h 90→72px）。
  - children(ChoiceMenu/DrinkPrompt) 包一层 10vw 横向 padding + 1.5rem 底部留白，与正文同列对齐。
- 仅本回合改动此一文件；其余工作区改动来自先前会话。

## 怎么验证

- `npx tsc --noEmit --pretty false`：EXITCODE=0，无类型错误。
- agent-browser headless（视口 1264x625）端到端：
  - 第一选项（3 项）实测 bounding box top/bottom 全部 ≤625、`elementFromPoint` 命中按钮自身（此前在 y=693~741 视口外，命中 null）。
  - `find testid choice-button-A click` 真实坐标点击 → 选项消费、推进到 dlg_01_03a。
  - 第二选项（2 项）同样全部在视口内且坐标可命中 → 点击 A → dlg_01_05a。
  - 持续推进至 END 节点（"一个喝酒的地方。你的杯子空了。"），沿途捕获 inline 特效 class：effect-shake / effect-glitch / effect-flash 均正确触发。
  - `agent-browser errors` 无控制台错误。
  - 选项态截图确认：琥珀 TERMINAL 标题条 + 旁白角色名 + 正文 + AWAITING_INPUT + EXEC_A/B/C 三选项完整呈现于视口内，CRT 风格一致。

## 2026-05-30 补充：全程真实坐标点击回归（probe2.js 单行管道探针）

放弃 JSON 探针（PowerShell 多行解析 bug 导致脚本卡顿），改用单行管道分隔字符串探针 `probe2.js`，规避解析问题。全程用真实鼠标坐标（`mouse move X,Y` + `down/up left`）推进，无 JS `.click()` 假阳性。

- 序幕共 **2 个选项**（ch_01_01 3 项 / ch_01_02 2 项），脚本无调酒交互（AGENTS.md 旧 QA 路径含 drink/ch_01_03/04 已过时，以重写后 `脚本/序幕_警探.md` 为准）。
- 推进层 `createPortal` 修复确认：整条流程（约 30 步）全靠点击场景区 (632,200) 命中 z-60 推进层推进，无任何点击失效。
- 选项坐标全部 inView=1：ch_01_01 三项 y=457/517/577、ch_01_02 两项 y=517/577，均落在视口（高 625）内，真实坐标点击命中按钮自身并推进。
- 分支正确性：ch_01_01 点 C(632,577) → dlg_01_03c（"老麦手指骨节…敲了两下"）；ch_01_02 点 A(632,517) → dlg_01_05a（"老麦拿起一瓶空酒瓶"）。
- 特效逐节点核对：narr_01_cultist_confront 触发 `effect-shake`；narr_01_cultist_vanish 触发 `effect-glitch + effect-flash`。
- 终点停在 dlg_01_09（"老麦转过身…一个喝酒的地方。你的杯子空了。"），无残留选项、无继续推进 = END 正常。
- **结论**：三项验收标准（①对话框独立成块且样式一致 ②点击修复 ③流程与脚本文本逐节点对上）全部端到端通过。

## 遗留（待用户决断，与本回合修复无关）

`guard.ps1 inspect` 报 11 项违规，全部来自先前会话累积，非本回合 DialogueBox 改动：
- 3 项 OUT_OF_BOUND 散落文件：`.kilo/openviking-kilo.log`、`--full-page`、`harness/evidence/compile-issues.log`。
- 8 项 FORBIDDEN（developer 禁改 `脚本/`）：先前剧本重构删除 7 个 Day0X 文件 + 新建 `序幕_警探.md`（已 compile PASS 并经本回合端到端验证）。
本回合实际改动（DialogueBox.tsx / globals.css）均在 developer 边界内。是否回退或提权处理剧本重构，请用户决定。
