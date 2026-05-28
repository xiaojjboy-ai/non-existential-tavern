# 非存在主义酒馆 V3 修订版实施计划

> **面向 AI 代理的工作者：** 使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤使用 `- [ ]` 语法跟踪进度。

**目标：** 在不破坏现有 6 个剧情脚本的前提下，以功能开关驱动 A/B 并行策略，完成 V2 编译器收尾并探索 V3 沉浸感实验。

**架构：** Phase 0 收尾编译器强类型；Phase 1 建立功能开关基础设施；Phase 2 A线扩展剧情，B线用功能开关做 UI 实验；Phase 3 评估汇合。禁止第四层交互层、悬浮气泡、拖拽小游戏、XState。

**技术栈：** Next.js 16 + React 19 + TypeScript + Zustand + PixiJS + js-yaml + mitt（B线可选）

---

## 关键技术决策（前置锁定）

### TD-1：行内指令解析方案

**选定：正则 + 白名单枚举（编译时解析）**

理由：现有编译器已是纯正则驱动，对有限的 `[effect:xxx]` 语法正则足够，AST 过度工程化。

行内 effect 格式（仅限视觉/音效，禁止修改游戏状态）：

```
[effect:crt-glitch 300ms]
[effect:screen-shake intensity=2]
[effect:signal-interference 0.5s]
```

编译时正则：`/\[effect:([\w-]+)(?:\s+([^\]]*))?\]/g`

白名单（违者 WARN 并跳过）：

```ts
export const INLINE_EFFECT_WHITELIST = [
  'crt-glitch', 'screen-shake', 'signal-interference',
  'flicker', 'scanline-pause',
] as const;
```

编译后挂载到 `DialogueNode.inlineEffects?`，显示文本中剥除标记。

---

### TD-2：状态管理命名动作函数

遵循现有命名模式（set*, update*, apply*, handle*），新增：

```ts
setFlag(key: string, value: boolean): void
toggleFlag(key: string): void
schedulePause(durationMs: number): void
clearPause(): void
applyRuntimeEffect(effectId: string, params: Record<string, unknown>): void
```

**禁止：** 直接调用匿名 `set({})` 修改状态；所有状态变更必须经命名函数。

---

### TD-3：事件总线决策

**结论：Phase 1 先不引入。** GameCanvas 通过 `store.runtime` 单向读取，无需反向信号。

若 B线触发 Pixi→React 时序协调需求，再引入 mitt：

```ts
// src/lib/eventBus.ts（约 30 行）
import mitt from 'mitt';
type Events = {
  'pixi:transition-complete': { backgroundId: string };
  'pixi:entrance-complete':   { characterId: string };
};
export const eventBus = mitt<Events>();
```

**禁止：** 通过 eventBus 传递游戏状态或触发状态变更。

---

### TD-4：extensionPoint 字段 Schema

仅预留字段，本计划不实现具体交互逻辑：

```ts
extensionPoint?: {
  version: '1.0';
  metadata?: Record<string, unknown>;
  // 禁止：interaction、callback、stateMutation 类字段
};
```

---

## 文件职责表

| 文件 | 本计划变更 | 阶段 |
|---|---|---|
| `src/types/game.ts` | 新增 InlineEffect、ExtensionPoint 类型 | Phase 0 |
| `scripts/compile-scripts.ts` | 输出强类型化，新增行内 effect 解析 | Phase 0+1 |
| `src/store/useGameStore.ts` | 新增 5 个命名 action | Phase 0 |
| `src/lib/featureFlags.ts` | 功能开关注册表（新建，约 40 行） | Phase 1 |
| `src/lib/eventBus.ts` | mitt 事件总线（新建，B线触发才创建） | Phase 2B |
| `src/components/DialogueBox.tsx` | 消费 inlineEffects/schedulePause（B线） | Phase 2B |
| `src/components/GameCanvas.tsx` | 订阅 activeEffects（B线） | Phase 2B |
| `docs/script-format.md` | 追加行内 effect 规范章节 | Phase 1 |
| `脚本/*.md` | **无需修改**，完全向后兼容 | — |

---

## Phase 0：V2 编译器收尾（预估 3 天）

**目标：** 消除编译器 any 类型泄漏，现有 6 个脚本零改动通过强类型编译。

### 任务 0.1：类型扩展

修改 `src/types/game.ts`，追加：

```ts
export const INLINE_EFFECT_WHITELIST = [
  'crt-glitch', 'screen-shake', 'signal-interference',
  'flicker', 'scanline-pause',
] as const;

export type InlineEffectType = typeof INLINE_EFFECT_WHITELIST[number];

export interface InlineEffect {
  type: InlineEffectType;
  params: string;
  raw: string;
}

export interface ExtensionPoint {
  version: '1.0';
  metadata?: Record<string, unknown>;
}
```

在 `DialogueNode` 末尾追加可选字段：

```ts
inlineEffects?: InlineEffect[];
extensionPoint?: ExtensionPoint;
```

验证：`cmd /c npx tsc --noEmit --pretty false`，预期 0 errors。

---

### 任务 0.2：编译器强类型化

修改 `scripts/compile-scripts.ts`：

1. 导入 V2 类型：`import type { PlotData, DialogueNode, CommandV2 } from '../src/types/game';`
2. 修改顶层函数签名：`compileScript(...): PlotData`，`parseCommands(...): CommandV2[]`
3. 迭代修复 TypeScript error 直至 0
4. 重新编译全量脚本：`cmd /c npm run compile`，预期 6 脚本全量通过

---

### 任务 0.3：Store 新增命名 Action

修改 `src/store/useGameStore.ts` 和 `src/types/game.ts`（runtime 字段）：

```ts
// runtime 字段追加
pendingPauseMs?: number;
activeEffects?: { effectId: string; params: Record<string, unknown>; expiresAt: number }[];

// Store 接口新增
setFlag: (key: string, value: boolean) => void;
toggleFlag: (key: string) => void;
schedulePause: (durationMs: number) => void;
clearPause: () => void;
applyRuntimeEffect: (effectId: string, params: Record<string, unknown>) => void;
```

实现（handleDrinkMix 之后）：

```ts
setFlag: (key, value) =>
  set((state) => ({ flags: { ...state.flags, [key]: value } })),
toggleFlag: (key) =>
  set((state) => ({ flags: { ...state.flags, [key]: !state.flags[key] } })),
schedulePause: (durationMs) =>
  set((state) => ({ runtime: { ...state.runtime, pendingPauseMs: durationMs } })),
clearPause: () =>
  set((state) => ({ runtime: { ...state.runtime, pendingPauseMs: undefined } })),
applyRuntimeEffect: (effectId, params) =>
  set((state) => ({
    runtime: {
      ...state.runtime,
      activeEffects: [
        ...(state.runtime.activeEffects ?? []),
        { effectId, params, expiresAt: Date.now() + ((params.durationMs as number) ?? 300) },
      ],
    },
  })),
```

**Phase 0 验证门禁：**

```powershell
cmd /c npm run compile
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run build
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

---

## Phase 1：功能开关基础设施（预估 2 天）

**目标：** 建立 A/B 切换机制，不影响现有正式流程。

### 任务 1.1：功能开关注册表

新建 `src/lib/featureFlags.ts`（约 40 行）：

```ts
export const FEATURE_FLAGS = {
  INLINE_EFFECTS:  'INLINE_EFFECTS',
  B_LINE_UI:       'B_LINE_UI',
  EVENT_BUS:       'EVENT_BUS',
} as const;

type FlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

const defaults: Record<FlagKey, boolean> = {
  INLINE_EFFECTS: false,
  B_LINE_UI:      false,
  EVENT_BUS:      false,
};

export function isEnabled(flag: FlagKey): boolean {
  if (typeof window === 'undefined') return defaults[flag];
  const stored = localStorage.getItem(`ff_${flag}`);
  return stored !== null ? stored === 'true' : defaults[flag];
}

export function setFlag(flag: FlagKey, value: boolean): void {
  localStorage.setItem(`ff_${flag}`, String(value));
}
```

---

### 任务 1.2：行内 Effect 解析（编译器）

修改 `scripts/compile-scripts.ts`，在 dialogue 节点解析后追加：

```ts
import { INLINE_EFFECT_WHITELIST } from '../src/types/game';

const INLINE_EFFECT_RE = /\[effect:([\w-]+)(?:\s+([^\]]*))?\]/g;

function parseInlineEffects(text: string): InlineEffect[] {
  const effects: InlineEffect[] = [];
  let m: RegExpExecArray | null;
  while ((m = INLINE_EFFECT_RE.exec(text)) !== null) {
    const type = m[1] as string;
    if (!(INLINE_EFFECT_WHITELIST as readonly string[]).includes(type)) {
      console.warn(`[compile] 未知 effect 类型: ${type}，已跳过`);
      continue;
    }
    effects.push({ type: type as InlineEffectType, params: m[2] ?? '', raw: m[0] });
  }
  return effects;
}
```

调用位置：解析 `dialogue.text` 时同步附加 `inlineEffects` 字段。

---

### 任务 1.3：格式文档补充

修改 `docs/script-format.md`，在对话层章节末尾追加：

```markdown
### 行内 Effect 指令（可选）

在对话文本中嵌入视觉/音效触发，格式：`[effect:类型 参数]`

支持类型（白名单）：
- `crt-glitch` — CRT 故障效果
- `screen-shake` — 画面震动
- `signal-interference` — 信号干扰
- `flicker` — 闪烁
- `scanline-pause` — 扫描线暂停

示例：`「某种声音。[effect:crt-glitch 300ms]」`

**限制：** 行内指令只允许纯视觉/音效效果，禁止修改游戏状态。
```

**Phase 1 验证门禁：**

```powershell
cmd /c npm run compile
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run build
```

---

## Phase 2A：A 线剧情扩展（预估 3-5 天，可与 2B 并行）

**目标：** 扩展 Day01 后续剧情，不依赖任何新 UI 组件。

### 任务 2A.1：脚本创作

按 `docs/script-format.md` 格式创作新剧情节点（具体内容由剧情 Agent 负责）：

- 目标：`脚本/Day02_*.md` 或 Day01 新分支
- 必须包含 `## 指令层` / `## 对话层` / `## 数据层` 三层
- 遵守 `docs/characters/` 角色语调

### 任务 2A.2：编译 + 数据更新

```powershell
cmd /c npm run compile
```

验证 `src/data/plot-data.json` 已更新，6 + N 脚本全量通过。

### 任务 2A.3：端到端验证

按 Day01 QA 路径走完验证：
`ch_01_01=C → ch_01_02=C → drink_01_01=白酒 → ch_01_03=B → ch_01_04=A`

新剧情节点完整走通，无 console error。

---

## Phase 2B：B 线 UI 实验（预估 3-4 天，可与 2A 并行）

**目标：** 在功能开关保护下，实验行内 effect 渲染和 schedulePause 暂停。

**前提：** Phase 0 + Phase 1 全部通过。

### 任务 2B.1：DialogueBox 消费 inlineEffects

修改 `src/components/DialogueBox.tsx`，在功能开关保护下：

```ts
import { isEnabled, FEATURE_FLAGS } from '../lib/featureFlags';
import { useGameStore } from '../store/useGameStore';

// 在渲染前，若 INLINE_EFFECTS 开关开启
if (isEnabled(FEATURE_FLAGS.INLINE_EFFECTS)) {
  node.inlineEffects?.forEach((effect) => {
    applyRuntimeEffect(effect.type, { params: effect.params, durationMs: 300 });
  });
  if (node.inlineEffects?.some((e) => e.type === 'scanline-pause')) {
    schedulePause(400);
  }
}
```

### 任务 2B.2：GameCanvas 订阅 activeEffects

修改 `src/components/GameCanvas.tsx`，在功能开关保护下订阅 `runtime.activeEffects`，并触发 PixiJS 对应视觉效果。

实现原则：
- 开关关闭时，此代码路径完全不执行
- PixiJS 效果通过 ticker/filter 实现，不修改游戏状态
- Effect 到期后自动清除（`expiresAt < Date.now()`）

**Phase 2B 验证门禁：**

```powershell
# 关闭开关时行为不变
cmd /c npm run build
# 开启开关后（localStorage ff_INLINE_EFFECTS=true）效果正常触发
```

---

## Phase 3：汇合与决策（预估 1 天）

**目标：** 评估 A/B 线成果，决定是否将 B 线实验推广至正式流程。

**决策框架：**

| 评估维度 | A 线 | B 线 |
|---|---|---|
| 稳定性 | 现有测试覆盖 | 需人工验证 |
| 表现力 | 文本驱动 | 视觉增强 |
| 维护成本 | 低 | 中 |
| 向后兼容 | ✅ | ✅（开关保护）|

**决策选项：**
1. **推广 B 线**：翻转功能开关默认值为 true，移除 guard 分支
2. **维持隔离**：B 线保持实验状态，待下一轮评审
3. **放弃 B 线**：删除 B 线代码，回归纯 A 线

**Phase 3 验证门禁：**

```powershell
cmd /c npm run compile
cmd /c npx tsc --noEmit --pretty false
cmd /c npm run build
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

---

## 风险缓解矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 编译器强类型化引入 breaking change | 中 | 高 | Phase 0 逐步修复，每步验证 |
| B 线效果影响 A 线正常流程 | 低 | 高 | 功能开关默认关闭，guard 分支隔离 |
| PixiJS filter 性能问题 | 中 | 中 | 限制同时 activeEffects 数量 ≤ 3 |
| 行内 effect 解析错误破坏文本 | 低 | 中 | 白名单 + WARN 跳过，不抛异常 |
| Phase 2A/2B 并行冲突 | 低 | 低 | 职责表明确隔离文件边界 |

---

## 全程禁止事项

- ❌ 引入第四层"交互层"数据结构
- ❌ 悬浮气泡、拖拽小游戏类交互组件
- ❌ XState 或其他状态机框架
- ❌ 行内指令修改游戏状态（选项、饮品、flags）
- ❌ 直接调用匿名 `set({})` 变更 Store
- ❌ 手动修改 `src/data/plot-data.json`（生成物）
- ❌ 在未通过验证门禁前宣告阶段完成

---

## 快速参考验证命令

```powershell
# 编译脚本
cmd /c npm run compile

# TypeScript 检查
cmd /c npx tsc --noEmit --pretty false

# 开发服务器
cmd /c npm run dev

# 生产构建
cmd /c npm run build

# Lint
cmd /c npm run lint

# Harness 收工检查
powershell -ExecutionPolicy Bypass -File .\harness\policy\guard.ps1 -Stage inspect
```

---

*本计划由 Metis（Pre-Planning Consultant）基于四轮对抗性评审结果生成，2026-05-29。*
*执行前请按 AGENTS.md 规则运行 `.\h developer`。*
