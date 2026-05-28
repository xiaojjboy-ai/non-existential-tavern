# Web 架构 V2：完全模块化的数据驱动架构

本项目的前端已经彻底废弃复杂的面向对象（OOP），采用类似**搭积木**一样的完全模块化设计。没有任何面条代码，一切以纯函数与数据流驱动。

---

## 🏗️ 快速总览：积木化拆分与组装

整个主页（Demo）由以下核心积木组装而成。未来加任何新玩法（如推理面板），只需插一个新组件，绝不污染现有流转逻辑！

**组装后的主页 (`src/app/page.tsx`) 结构极其清晰：**

```tsx
<DialogueBox>
  <ChoiceMenu />
  {!isMixingActive && <DrinkPrompt onActivate={() => setIsMixingActive(true)} />}
</DialogueBox>

{isMixingActive && <MixingStation />}

<DebugPanel />
```

**核心积木说明：**
1. **`DialogueBox.tsx`**: 对话交互容器，负责拦截点击、提供底层背景并渲染打字机文字。
2. **`ChoiceMenu.tsx`**: 分支选项模块，读取分支数据并渲染按钮，点击后自动交还控制权。
3. **`DrinkPrompt.tsx` & `MixingStation.tsx`**: 调酒触发器与具体的调酒台面板。
4. **`DebugPanel.tsx`**: 上帝视角调试面板，独立于左下角。发布正式版时只需从 `page.tsx` 中删掉这一行，游戏毫无影响。

> [!IMPORTANT]
> **唯一铁律**：新加的交互组件如果有点击需求，必须在自己内部做隔离，**坚决禁止**将其挂载到 `document.body` 等全局对象上，以免污染全局流转！

---

## ⚙️ 工程记录：三层数据流转与解耦机制

以下是为开发者提供的深入架构解析与工程记录（自 2026-05-28 起生效）。

### 1. 核心设计理念
- **彻底抛弃 OOP 实体类**：摒弃 `EntityManager`、`CharacterEntity` 等复杂的实例维护逻辑，所有状态回归纯 JSON 数据结构。
- **单向数据流 (Zustand)**：以 `src/store/useGameStore.ts` 作为唯一的中央“伪后台”。它负责接收编译好的剧本数据，维护剧情进度、当前节点、调酒判定以及好感度运算，然后将纯数据抛给前端渲染。

### 2. 剧本“三层”数据流的组件映射
经过 `compile-scripts.ts` 编译产生的 `plot-data.json`，在前端严格映射到对应的模块中流转：

#### A. 指令层 (场景与表现)
- **依赖数据**：`commands` 数组（通过 `applyRuntimeCommand` 实时推演为 `runtime` 状态）。
- **负责组件**：`<GameCanvas />`，负责 Pixi 画面、背景替换、立绘切换及特效播放。

#### B. 对话层 (渲染与推进)
- **依赖数据**：`currentNodeId` 指向的 `dialogues` 节点。
- **负责组件**：`<DialogueBox />`。
- **流转机制**：组件内部自带一层 `z-10` 的全屏拦截层实现“点击推进（Click to advance）”，保证只有点击对话背景时才会触发 `nextStep`。

#### C. 数据层 (分歧点与调酒)
- **依赖数据**：当前剧情的 `branches` (选项分支) 以及 `drink` (调酒规则)。
- **负责组件**：
  - `<ChoiceMenu />`：读取当前 ID 对应的选项树。当有选项时，阻断全局 `nextStep`，等待玩家进行选择。
  - `<MixingStation />`：当遇到调酒要求时弹出。通过调用底层的 `DrinkEvaluator.ts` 引擎进行匹配，并将算出的好感度（`AffinityEffect`）和分支结局同步回全局 Store。
