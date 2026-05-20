# 剧情 Markdown 格式规范 V1

本文档是 `npm run compile` 的唯一脚本格式契约。剧情源文件写在项目根目录的 `脚本/*.md`，模板文件必须以 `模板_` 开头，编译器会跳过。

## 文件结构

每个正式剧情文件必须包含且只依赖以下三层标题，顺序固定：

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
- 三层顺序不能调换。
- `---` 用作视觉分隔；解析以三层标题为准。
- 文件使用 UTF-8 编码。
- 文件名去掉 `.md` 后就是 `plotId`，例如 `Day01_警探_第1次.md` 生成 `Day01_警探_第1次`。

## 指令层

指令层只写流程和演出命令，不写对白正文，不写数值规则。

支持指令：

| 指令 | 格式 | 说明 |
| --- | --- | --- |
| `BG` | `[BG tavern_night_rain]` | 切换背景 |
| `BGM` | `[BGM jazz_piano_low]` | 播放或控制背景音乐 |
| `SE` | `[SE door_open_wind_chime]` | 播放音效 |
| `LIGHT` | `[LIGHT 暖黄偏暗]` | 灯光/色调描述 |
| `PROP` | `[PROP 吧台干净]` | 场景道具描述 |
| `ENTER` | `[ENTER Lendro_coat_wet]` | 角色或立绘入场 |
| `EXIT` | `[EXIT Lendro]` | 角色或立绘退场 |
| `EMO` | `[EMO Lendro 肩线下降]` | 表情/状态变化 |
| `PAUSE` | `[PAUSE 1.5s]` | 停顿 |
| `GOTO` | `[GOTO dlg_01_01]` | 跳到一个 `dlg_*` 或 `narr_*` 节点 |
| `CHOICE` | `[CHOICE ch_01_01]` | 进入普通选项或调酒选项 |
| `END` | `[END]` | 本脚本结束 |

选项跳转行必须紧跟在对应 `[CHOICE]` 后，格式为：

```markdown
[CHOICE ch_01_01]
  A → dlg_01_02a
  B → dlg_01_02b
  C → dlg_01_02c
```

调酒也使用 `CHOICE`：

```markdown
[CHOICE drink_01_01]
  白酒   → dlg_01_drink_correct
  威士忌 → dlg_01_drink_wrong_whisky
```

编译器会校验：

- 每个 `GOTO` 目标必须存在于对话层。
- 每个 `CHOICE` 必须存在于数据层的 `branches`，或等于 `drink.id`。
- 指令层选项跳转和数据层 `branches` / `drink.wrong_effects` 不能互相矛盾。

## 对话层

对话层只写文本节点，不写演出命令，不写选项效果。

节点格式：

```markdown
[dlg_01_01]
Lendro：……还开着？

[narr_01_01]
吧台上留着一个空杯。
```

规则：

- 对话节点 ID 必须以 `dlg_` 开头。
- 旁白节点 ID 必须以 `narr_` 开头。
- 节点 ID 必须单独占一行。
- 节点正文保留换行。
- 对话第一行如果使用 `角色名：正文`，编译器会把冒号前作为 `actor`，冒号后和后续行作为 `text`。
- `narr_*` 统一输出为 `{ actor: "旁白", text }`。

## 数据层

数据层必须包含一个 fenced YAML 代码块：

````markdown
```yaml
meta:
  day: 01
  character: Lendro
  visit: 1
  requires: null
  unlocks:
    - character: Lendro
  next: Day02_维修师_第1次
  resources:
    bg:
      - id: tavern_night_rain
        desc: 酒馆夜间，窗外有雨

drink: null

branches:
  ch_01_01:
    A: { goto: dlg_01_02a, effect: 亲和+1 }
    B: { goto: dlg_01_02b, effect: null }
```
````

必需或约定字段：

- `meta`: 基本信息与资源清单。
- `branches`: 普通选项跳转表。
- `drink`: 没有调酒时写 `null`；有调酒时必须包含 `id`、`available`、`correct`、`wrong_effects`。
- `affinity`: 可选，好感度变化规则。
- `links`: 可选，后续剧情关联。
- `metaphor`: 可选，创作标注。

编译器会校验：

- `branches.*.*.goto` 必须指向存在的 `dlg_*` 或 `narr_*`。
- `drink.correct` 必须存在于 `drink.available`。
- `drink.wrong_effects.*.dialogue` 必须指向存在的节点。
- `metaphor[].anchor` 如果存在，必须指向存在的节点。

## 生成数据

`src/data/plot-data.json` 是生成物，只能通过 `npm run compile` 更新。不要手改这个 JSON。

生成的每个 plot 至少包含：

- `meta`
- `commands`
- `dialogues`
- `dialogueOrder`
- `narratives`
- `branches`
- `drink`
- `affinity`

其中 `commands` 的每项至少包含：

```ts
{
  type: "GOTO" | "CHOICE" | "...",
  params: string,
  raw: string
}
```

`CHOICE` 命令会额外保留 `choices`，用于记录指令层里写出的选项跳转。
