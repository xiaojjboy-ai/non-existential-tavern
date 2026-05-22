# 数据结构契约 V2 草案

本文档描述下一阶段要落地的数据结构。当前正式编译链仍使用 `docs/script-format.md` 的 V1 契约；V2 只有在同步更新脚本格式、编译器、类型、harness 和运行时后，才能成为正式输入格式。

## 分层

V2 保留三层脚本结构：

- `指令层`：流程和演出命令。
- `对话层`：对白、旁白和节点级演出效果。
- `数据层`：调酒规则、选项分支、好感度变化、后续关联。

## CommandV2

命令必须由外层 `type` 决定 `params` 的形状，不能出现 `type` 和 `params` 不匹配。

```ts
{
  id: "cmd_01_001",
  type: "BG",
  params: {
    assetId: "tavern_night_rain",
    transition: "fade"
  },
  raw: "[BG tavern_night_rain]"
}
```

命令类型：

- `BG`: `{ assetId, transition? }`
- `BGM`: `{ assetId, action, duration? }`
- `SE`: `{ assetId, volume?, loop? }`
- `LIGHT`: `{ color, intensity, description }`
- `PROP`: `{ propId, action, state? }`
- `ENTER`: `{ characterId, poseId, position }`
- `EXIT`: `{ characterId }`
- `EMO`: `{ characterId, emoId }`
- `PAUSE`: `{ durationMs }`
- `GOTO`: `{ targetNodeId }`
- `CHOICE`: `{ choiceId }`
- `END`: `{}`

## DialogueNodeV2

对白节点可以挂载节点级演出效果。

```yaml
dialogues:
  dlg_01_01:
    id: dlg_01_01
    actor: Lendro
    text: "……还开着？"
    effects:
      soundEffectId: tired_breath
      voiceId: lendro_01_001
      screenShake: false
```

## DrinkRuleV2

V2 调酒不再只有“选中正确酒名”，而是评估玩家调出的配方。

```yaml
drink:
  id: drink_01_01
  correctRecipe:
    ingredients:
      - id: baijiu
        name: 白酒
        volumeOz: 2
    method: build
    glass:
      type: rock
      iceType: none
    garnish: null
  hints:
    - 有什么暖的
    - 随便来点什么
  evaluationRules:
    - id: drink_01_01_correct
      match: all
      conditions:
        - field: ingredient.baijiu.volumeOz
          op: gte
          value: 1.5
        - field: method
          op: eq
          value: build
      gotoNodeId: dlg_01_drink_correct
      affinityEffect:
        character: Lendro
        field: 信任
        value: 1
```

规则：

- `conditions` 是结构化条件，不使用可执行字符串。
- `match: all` 表示全部条件满足；`match: any` 表示任一条件满足。
- `gotoNodeId` 必须指向存在的 `dlg_*` 或 `narr_*`。
- `affinityEffect` 没有效果时写 `null`。

## ChoiceBranchV2

普通选项分支使用显式字段名，和 V1 的 `goto/effect` 区分。

```yaml
branches:
  ch_01_01:
    A:
      gotoNodeId: dlg_01_02a
      effects:
        - character: Lendro
          field: 亲和
          value: 1
      pace: normal
    B:
      gotoNodeId: dlg_01_02b
      effects: []
```

规则：

- `gotoNodeId` 必须指向存在的 `dlg_*` 或 `narr_*`。
- `effects` 是数组；无变化时写 `[]` 或省略。
- `pace` 只能是 `normal`、`tight`、`slow`。
- 结局分支可额外写 `ending`。

## GameSaveSnapshot

存档必须能恢复剧情指针、当前选项、好感度、历史和 runtime 占位状态。

```ts
{
  saveId: "slot_1",
  timestamp: 1779410000000,
  playTimeSeconds: 600,
  currentPlotId: "Day01_警探_第1次",
  currentNodeId: "dlg_01_01",
  currentCommandIndex: 3,
  currentChoiceId: null,
  affinities: { Lendro: { 信任: 1 } },
  unlockedCharacters: ["Lendro"],
  flags: {},
  history: ["ch_01_01:C"],
  runtime: {
    backgroundId: "tavern_night_rain",
    bgmId: "jazz_piano_low",
    activeSpriteId: "Lendro_coat_wet",
    lastCommandRaw: "[ENTER Lendro_coat_wet]",
    ended: false
  }
}
```

## 落地顺序

1. 更新脚本格式文档和模板。
2. 更新 `src/types/game.ts`。
3. 更新 `scripts/compile-scripts.ts`，输出 V2 或 V1/V2 双格式。
4. 更新 `tools/harness/harness.ts`，校验 V2 字段和跨层引用。
5. 更新 `src/store/useGameStore.ts` 和页面调酒 UI。
6. 跑 `npm run compile`、`npx tsc --noEmit --pretty false`、`npm run build`。
