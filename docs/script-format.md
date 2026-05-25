# 剧情 Markdown 格式规范 V2

> **注意：本文档已全面升级至 V2 契约。**
> 
> 本文档描述了 `npm run compile` 目前遵循的最新 V2 解析法则。具体的 V2 强类型和调酒规则的数据结构定义，请一并参考 `docs/data-contract-v2.md`。

## 文件结构

每个正式剧情文件（如 `脚本/Day01_警探_第1次.md`）必须包含且只依赖以下三层标题，顺序固定：

```markdown
# 关卡层 — Day 01 警探 Lendro 第1次来访

---

## 指令层

---

## 对话层

---

## 数据层
```

规则：
- 三层标题必须写成 `## 指令层`、`## 对话层`、`## 数据层`。
- 文件名去掉 `.md` 后即为 `plotId`。

## 指令层
包含场景流转、道具交互、角色进退场。
V2 更新后，各个指令要求更严密的参数对象。请务必参考 `模板_指令层.md` 中的标准写法：
- `[BG assetId transition]`
- `[ENTER characterId poseId position]`
- `[GOTO targetNodeId]`

## 对话层
保留了原版友好的纯文本写作格式：
```markdown
[dlg_01_01]
Lendro：……还开着？
```
V2 特性：如果需要在某句话挂载震屏或特殊配音，可以在 `## 数据层` 的 YAML 中利用相同的 `dlg_01_01` ID 补充 `effects`，编译器会自动在生成阶段将它们进行深合并。

## 数据层
必须包含一个 fenced YAML 代码块，用于描述复杂的分支和微型调酒规则：

```yaml
meta:
  day: 01
  ...
drink:
  id: drink_01_01
  evaluationRules:
    - id: drink_01_01_correct
      match: all
      conditions:
        - field: ingredient.baijiu.volumeOz
          op: gte
          value: 1.5
      gotoNodeId: dlg_01_drink_correct
      affinityEffect:
        character: Lendro
        field: 信任
        value: 1
branches:
  ch_01_01:
    A:
      gotoNodeId: dlg_01_02a
      effects: []
```
- `drink` 节点下的 `evaluationRules` 已经替代了原来的 `wrong_effects`，请参照上面的 `op: gte` 等微型规则树编写。
- `branches` 节点下的 `goto` 已经全部变更为 `gotoNodeId`。
- 好感度变更被定义为结构体数组 `effects`，支持多个维度变更。

## 生成数据
自动编译输出至 `src/data/plot-data.json`，包含了严格符合 V2 `PlotData` TypeScript 类型的生成物。禁止手动修改该 JSON。
