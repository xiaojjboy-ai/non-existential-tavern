# 剧情 Markdown 格式规范 V3

> **注意：本文档已升级至 V3 契约。**
>
> 本文档描述了 `npm run compile` 目前遵循的最新 V3 解析法则。具体的强类型和调酒规则的数据结构定义，请一并参考 `docs/data-contract-v2.md`。

## 文件结构

每个正式剧情文件（如 `脚本/Day01_警探_第1次.md`）必须包含前三层标题，第四层（交互层）可选。顺序固定：

```markdown
# 关卡层 — Day 01 警探 Lendro 第1次来访

---

## 指令层

---

## 对话层

---

## 数据层

---

## 交互层
```

规则：
- 前三层标题必须写成 `## 指令层`、`## 对话层`、`## 数据层`。
- `## 交互层` 为 V3 新增的第四层，可选。如果存在，必须位于数据层之后。
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

### V3 行内指令

V3 新增行内特效指令，可以直接写在对话文本中。编译器会自动提取并剥离：

```markdown
[dlg_01_05]
Lendro：[SHAKE] 你说什么？！
```

```markdown
[narr_01_06]
[GLITCH] 墙壁上的影子……扭曲了一瞬。
```

**支持的行内指令类型：**

| 指令 | 效果 | 示例 |
|------|------|------|
| `[SHAKE]` | 震屏效果 | `[SHAKE] 你说什么？！` |
| `[GLITCH]` | 花屏/故障效果 | `[GLITCH] 影子扭曲了` |
| `[SPRITE]` | 立绘切换 | `[SPRITE lendro_angry]` |
| `[FLASH]` | 闪光效果 | `[FLASH] 轰！` |
| `[FREEZE]` | 画面冻结 | `[FREEZE] 时间停止了` |
| `[GUNSHOT]` | 枪击冲击形变 | `[GUNSHOT] 枪口顶住了他的下颌骨` |

带参数的指令格式：`[指令名 参数]`，如 `[SPRITE lendro_angry]`。

V2 特性仍然保留：如果需要在某句话挂载震屏或特殊配音，可以在 `## 数据层` 的 YAML 中利用相同的 `dlg_01_01` ID 补充 `effects`，编译器会自动在生成阶段将它们进行深合并。

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

## 交互层

V3 新增的第四层，可选。用于定义拖拽小游戏等物理交互规则。必须包含一个 fenced YAML 代码块：

```yaml
interact_01_01:
  kind: drag_and_drop
  label: 调配魔法药酒
  items:
    - id: herb_bundle
      label: 药草束
      targetZoneId: cauldron
    - id: crystal_vial
      label: 水晶瓶
      targetZoneId: cauldron
  zones:
    - id: cauldron
      label: 熔炉
  successGotoNodeId: dlg_01_interact_success
  failGotoNodeId: dlg_01_interact_fail
  successAffinityEffect:
    character: En_Neer
    field: 信任
    value: 2
  timeLimitMs: 15000
```

**交互类型（kind）：**

| 类型 | 说明 |
|------|------|
| `drag_and_drop` | 拖拽物件到目标区域 |
| `pour` | 倾倒/注入操作 |
| `shake_device` | 摇晃设备 |
| `click_sequence` | 按序点击 |

**交互规则必填字段：**
- `kind`: 交互类型
- `label`: 交互显示名称
- `successGotoNodeId`: 成功后跳转的对话节点 ID

**交互规则可选字段：**
- `items`: 拖拽物件列表（drag_and_drop 专用）
- `zones`: 目标区域列表（drag_and_drop 专用）
- `failGotoNodeId`: 失败跳转节点
- `successAffinityEffect`: 成功好感度效果
- `timeLimitMs`: 时长限制（毫秒，0 = 无限制）

## 生成数据
自动编译输出至 `src/data/plot-data.json`，包含了严格符合 V3 `PlotData` TypeScript 类型的生成物。禁止手动修改该 JSON。
