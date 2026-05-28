# V3 核心体验升级计划 (强交互与表现力重构)

本项目的前端架构将从“纯视觉小说展现”升级为“强交互模拟器”，重点重构脚本编译器、底层状态机与主界面 UI，以支持行内特效指令、拖拽小游戏以及沉浸式吧台视角。

---

### 第一阶段：数据契约与编译器升级 (Data & Compiler)

这一阶段的核心是让引擎能够理解并解析新加入的第四层剧本（`## 交互层`），以及支持在对话层中提取行内命令。

- **scripts/compile-scripts.ts**
  - 更新区块分割逻辑，要求剧本强制包含四个 `##` 标题层。
  - 新增 YAML 解析块，用于解析提取 `## 交互层` 下的小游戏参数字典。

- **src/types/game.ts**
  - 为 `PlotData` 接口追加 `interactions?: Record<string, InteractionRule>` 属性。
  - 追加 `InlineCommand` 类型，支持 `SHAKE`, `GLITCH`, `SPRITE` 等枚举。

- **docs/script-format.md**
  - 正式同步 V3 版本的 4 层书写规范，并在文档中附带“行内指令”及“拖拽交互”的编写示例。

---

### 第二阶段：状态机与解析引擎 (State Machine)

这一阶段将把 Zustand 作为指令的中转站，确保任何行内指令都能触发全局响应。

- **src/store/useGameStore.ts**
  - 新增 `runtime.dialogueEffect` 状态字段（用于通知 UI 抖动或花屏）。
  - 新增 `runtime.activeInteraction` 状态字段，用于阻塞对话并拉起小游戏。
  - 增加 `executeInlineCommands(commands)` 函数，实现从指令到状态的映射修改。

---

### 第三阶段：UI 布局与视觉表现 (Presentation UI)

重构主页 Z 轴，彻底解放对话框。

- **src/app/page.tsx**
  - 重构全屏 Layout：底部 30% 渲染一个半透明的 `z-20` 层充当“吧台物理桌面”。
  - 将 `DialogueBox` 设置为悬浮于此吧台上方的气泡式/面板式组件。

- **src/components/DialogueBox.tsx**
  - **逐行推进引擎**：通过 `\n` 切分节点文本，每次仅呈现当前一句话，点击清屏后再显示下一句。
  - **动态样式接收**：订阅 `useGameStore` 中的 `dialogueEffect`，响应 `shake` 等动画类名。
  - **行内指令剥离**：使用正则 `\[([A-Z_]+)\s*(.*?)\]` 剔除文本中的指令标签，并在文字开始输出前，立刻通过 `executeInlineCommands` 推送给全局状态机。

---

### 第四阶段：物理交互层开发 (Interactive Mini-Games)

真正的交互重头戏。

- **src/components/InteractionLayer.tsx** (全新组件)
  - 独立于对话框的全新组件，挂载在 `page.tsx` 的吧台区域内。
  - 监听 `runtime.activeInteraction`，如果是 `drag_and_drop` 类型，渲染出对应的发光拖拽物件。
  - 引入基础的原生 Drag API 或简单鼠标跟随逻辑。拖拽成功后触发 `nextStep()` 恢复主线进程。
