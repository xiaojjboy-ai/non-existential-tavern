# 数据契约

> 后端实现时的状态变量、触发条件、结局判定逻辑。全部写死在这里——不用猜。

---

## 一、状态变量全集

### 全局状态

```typescript
interface GlobalState {
  currentDay: number;                    // 1-11
  completedDays: number[];               // 已完成的天数列表
  catUnlocked: boolean;                  // Day 2 摸猫后 → true
  catAffinity: number;                   // 0-100，猫的全局亲和度
  gamblerBetrayed: boolean | null;        // null=未到Day9, true=告诉了死神, false=隐瞒了
  cowgirlCatwomanResolution: "reconcile" | "break" | null; // null=未到Day10
  demoComplete: boolean;                 // Day 11 完成后 → true
}
```

### 警探 Lendro

```typescript
interface LendroState {
  trust: number;          // 0-100
  deflection: number;     // 0-100，防御值
  visits: number;         // 1-2
  stage: string;          // "stage_1" | "stage_1_active" | "stage_2"
  flags: {
    told_about_eilas: boolean;  // Day 5 核心揭示后 → true
  };
}
```

### 猫女 Sylvena / Cat

```typescript
interface CatState {
  affinity: number;           // 0-100
  unlocked: boolean;          // Day 2 签契约 → true
  sylvenaLevel: number;       // 1-7。Demo: 1(猫)→3(Day8灵体)→7(Day10完整)
  stage: string;              // 见下方阶段表
  flags: {
    signed_contract: boolean;      // Day 2 碰手
    recognized_wand: boolean;      // Day 4 猫认出法杖
    spirit_manifested: boolean;    // Day 8 灵体初现 ← 关键
    full_memory: boolean;          // Day 10 完整记忆 ← 关键
    received_wand: boolean;        // Day 9 法杖留在吧台
    resolution: "reconcile" | "break" | null;  // Day 10
  };
}
```

**猫女阶段表**

```yaml
cat_stage_1_observer:        # Day 2-7。猫形态，观察。
  sylvena_level: 1
  next: cat_stage_2_guest
  trigger: "affinity ≥ 5 且 spirit_manifested = true"
  
cat_stage_2_guest:           # Day 8。小女孩灵体初现。
  sylvena_level: 3
  next: cat_stage_3_companion
  trigger: "affinity ≥ 8"
  
cat_stage_3_companion:       # Day 8-9 过渡。
  sylvena_level: 3-5
  next: cat_stage_4_full
  trigger: "full_memory = true"
  
cat_stage_4_full:            # Day 10。少女完整显现。
  sylvena_level: 7
```

### 维修师 安尼尔

```typescript
interface EnneerState {
  openness: number;             // 0-100
  mikeResistance: number;       // 0-100（老麦对他的抗拒，越低越好）
  blueprintRevealed: boolean;   // 图纸是否展示过
  visits: number;               // 1-2
  stage: string;
  flags: {
    resolution: "compromise" | "romantic" | "seal" | null; // 维修师三结局
  };
}
```

### 牛仔

```typescript
interface CowgirlState {
  defense: number;          // 0-100（越低越真实）
  openness: number;         // 0-100
  visits: number;           // 1-3
  stage: string;
  flags: {
    tried_to_take_cat: boolean;  // Day 3
    saw_spirit: boolean;         // Day 8 ← 关键
    resolution: "reconcile" | "break" | null;  // Day 10
  };
}
```

### 赌徒 Aletor

```typescript
interface AletorState {
  trust: number;          // 0-100
  relaxation: number;     // 0-100
  visits: number;         // 1-3
  stage: string;
  flags: {
    told_death_location: boolean | null;  // null=未到, true=告诉, false=隐瞒
    watch_smashed: boolean;               // Day 9
    wand_returned: boolean;               // Day 9
  };
}
```

### 死神 Lethus

```typescript
interface LethusState {
  visits: number;         // 0-1
  flags: {
    met_gambler_in_tavern: boolean;  // Day 9
    gambler_toasted: boolean;        // Day 9 碰杯发生
  };
}
```

### 哲学神

```typescript
interface PhilosopherState {
  visits: number;  // 0-1。达到 1 即 Demo 完成。
}
```

---

## 二、解锁条件表

```typescript
const UNLOCK_CONDITIONS: Record<number, Condition[]> = {
  2:  [],  // Day 1 完成自动解锁
  3:  [],  // Day 2 完成自动解锁
  4:  [],  // Day 3 完成自动解锁
  5:  [],  // Day 4 完成自动解锁
  6:  [],  // Day 5 完成自动解锁
  7:  [],  // Day 6 完成自动解锁
  8:  [
    { variable: "cat.affinity", operator: ">=", value: 5 }
  ],
  9:  [
    { variable: "aletor.visits", operator: ">=", value: 2 },
    { variable: "aletor.relaxation", operator: ">=", value: 10 }
  ],
  10: [
    { variable: "cowgirl.visits", operator: ">=", value: 2 },
    { variable: "cowgirl.flags.saw_spirit", operator: "==", value: true },
    { variable: "cat.affinity", operator: ">=", value: 8 }
  ],
  11: []   // Day 10 完成自动解锁
};
```

**注意**：Day 8 的 cat.affinity ≥ 5 门槛很低——Day 2 摸一次猫 (+3) 就够了。这个条件存在是为了防止"玩家完全不理猫但猫突然变灵体"的逻辑断裂。

---

## 三、结局判定逻辑

### Demo 包含三个核心角色的多结局分支

#### 分支点 1：维修师（结局前夕触发）

取决于前两天的酒品正确率与老麦的态度：
- **结局 A（妥协）**：resolution = "compromise"。烧毁图纸，接受命运当普通工人。
- **结局 B（浪漫）**：resolution = "romantic"。辞去工作，去建造不可能的机器。
- **结局 C（封存）**：resolution = "seal"。将图纸留在吧台送给老麦保管。梦没死，但也不做了。

#### 分支点 2：赌徒+死神（Day 9）

```
玩家在 ch_09_01 选择：
  A: "他不在这里。" → gamblerBetrayed = false
  B: "比你想象的要久。" → gamblerBetrayed = true
```

无论选什么，赌徒都会砸碎怀表并归还法杖。区别在于：
- **结局 A（隐瞒线/选择的尊严）**：赌徒点暖的白酒，带着选择的尊严碰杯。
- **结局 B（告诉线/认命的苦涩）**：赌徒点冷的葡萄酒，带着认命的苦涩碰杯。

#### 分支点 3：牛仔 vs 猫女大纷争（Day 10）

```
玩家在 ch_10_01 选择：
  A: "你们两个说的是一样的东西。" → resolution = "reconcile"
  B: "她说得对——重不会消失。" → resolution = "break"
  C: 沉默 → resolution = "reconcile"（默认走向和解）
```

这个选择决定：
- 和解 → 猫女回学院（客座教授）+ 牛仔放锚点坐标
- 决裂 → 猫女留在窗台 + 牛仔离开不再回来

**这是 Demo 真正的结局分歧点。** 两个结局在 Day 11 哲学神场景中都会有不同的"痕迹"呈现：
- 和解：吧台上有锚点坐标（一抹蓝光）。猫在窗台，帽子没有歪——她不再需要藏着了。
- 决裂：吧台上的锚点坐标位置是空的。猫蜷在窗台——帽子遮住整张脸。窗外有流星划过（或者没有）。

### Demo 完成判定

```
philosopher.visits === 1 → demoComplete = true
```

---

## 四、状态变化事件流（完整时间线）

```
Day 1 结束 → lendro.visits=1, lendro.trust≥10, unlock Day 2
Day 2 结束 → enneer.visits=1, cat.unlocked=true, cat.affinity≥3, unlock Day 3
Day 3 结束 → cowgirl.visits=1, cowgirl.tried_to_take_cat=true, unlock Day 4
Day 4 结束 → aletor.visits=1, cat.recognized_wand=true, unlock Day 5
Day 5 结束 → lendro.visits=2, lendro.told_about_eilas=true, unlock Day 6
Day 6 结束 → aletor.visits=2, aletor.relaxation≥13, unlock Day 7
Day 7 结束 → enneer.visits=2, enneer.blueprint_revealed=true, unlock Day 8

--- 门槛检查 ---
Day 8 解锁需 cat.affinity ≥ 5 → 检查 → ✅ (Day2+投喂已达标)
Day 8 结束 → cowgirl.visits=2, cowgirl.saw_spirit=true, cat.spirit_manifested=true, unlock Day 9

--- 门槛检查 ---
Day 9 解锁需 aletor.visits≥2 且 aletor.relaxation≥10 → 检查 → ✅
Day 9 结束 → aletor.visits=3, gamblerBetrayed=?, aletor.watch_smashed=true, cat.received_wand=true, unlock Day 10

--- 门槛检查 ---
Day 10 解锁需 cowgirl.visits≥2, cowgirl.saw_spirit=true, cat.affinity≥8 → 检查 → ✅
Day 10 结束 → cowgirlCatwomanResolution=?, cat.full_memory=true, unlock Day 11

Day 11 结束 → demoComplete=true → 播放致谢 → 回主菜单
```

---

## 五、调酒正确判定表

```typescript
const DRINK_TABLE: Record<string, Record<number, string>> = {
  lendro:   { 1: "白酒",   5: "威士忌" },
  enneer:   { 2: "啤酒",   7: "啤酒" },
  cowgirl:  { 3: "白酒",   8: "白酒",  10: "露酒" },
  aletor:   { 4: "柠檬水", 6: "威士忌" },
  // Day 9 赌徒的酒取决于 ch_09_01 的选择（白酒或葡萄酒）
  lethus:   { 9: "露酒" },
};
```

### 调酒后果

| 判定 | trust/openness 变化 | 对话走向 |
|------|-------------------|---------|
| 正确 | +5 | 专用正确台词 |
| 错误 | 0 或 +1（部分角色） | 嫌弃台词 → 部分角色会要求换酒 → 自动给正确酒 |
| 错误但不影响推进 | — | 不会卡关，故事必定继续 |

---

## 六、存档格式（JSON）

```json
{
  "version": "1.0.0",
  "timestamp": 1717000000000,
  "currentDay": 5,
  "completedDays": [1, 2, 3, 4],
  
  "characters": {
    "lendro": {
      "trust": 14,
      "deflection": 73,
      "visits": 1,
      "stage": "stage_1_active",
      "flags": { "told_about_eilas": false }
    },
    "cat": {
      "affinity": 3,
      "unlocked": true,
      "sylvenaLevel": 1,
      "stage": "cat_stage_1_observer",
      "flags": {
        "signed_contract": true,
        "recognized_wand": false,
        "spirit_manifested": false,
        "full_memory": false,
        "received_wand": false,
        "resolution": null
      }
    },
    "enneer": {
      "openness": 20,
      "mikeResistance": 60,
      "blueprintRevealed": false,
      "visits": 1,
      "stage": "stage_1"
    },
    "cowgirl": {
      "defense": 80,
      "openness": 5,
      "visits": 0,
      "stage": "stage_1",
      "flags": { "tried_to_take_cat": false, "saw_spirit": false, "resolution": null }
    },
    "aletor": {
      "trust": 0,
      "relaxation": 5,
      "visits": 0,
      "stage": "stage_1",
      "flags": { "told_death_location": null, "watch_smashed": false, "wand_returned": false }
    },
    "lethus": {
      "visits": 0,
      "flags": { "met_gambler_in_tavern": false, "gambler_toasted": false }
    },
    "philosopher": {
      "visits": 0
    }
  },
  
  "flags": {
    "catUnlocked": true,
    "gamblerBetrayed": null,
    "cowgirlCatwomanResolution": null
  },
  
  "scriptState": null
}
```

---

## 七、关键依赖关系图

```
Day1 (警探1) ──→ Day2 (维修师1+猫)
                       │
                       ├──→ Day3 (牛仔1) ──→ Day4 (赌徒1)
                       │                          │
                       ├──→ Day5 (警探2) ←────────┘
                       │       │
                       ├──→ Day6 (赌徒2) ←────────┘
                       │       │
                       ├──→ Day7 (维修师2) ←───────┘
                       │       │
                       │       ├──→ Day8 (牛仔2+猫女灵体) ← cat.affinity≥5
                       │       │       │
                       │       │       ├──→ Day9 (赌徒3+死神) ← aletor.relaxation≥10
                       │       │       │       │
                       │       │       │       ├──→ Day10 (大纷争) ← cat.affinity≥8, cowgirl.saw_spirit
                       │       │       │       │       │
                       │       │       │       │       └──→ Day11 (哲学神)
                       │       │       │       │
                       └───────┴───────┴───────┘
```

平铺依赖（按触发顺序）：

```
Day 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11
  │     │    │    │    │    │    │    │    │     │
  │     └────┴────┴────┴────┴────┤    │    │     │
  │            cat 亲和累积      │    │    │     │
  │                              │    │    │     │
  └──────────────────────────────┤    │    │     │
        警探 trust 累积          │    │    │     │
                                 │    │    │     │
  ┌──────────────────────────────┘    │    │     │
  │      赌徒 visits/relaxation       │    │     │
  └───────────────────────────────────┘    │     │
                                           │     │
  ┌────────────────────────────────────────┘     │
  │   牛仔 visits + 猫女 saw_spirit              │
  └──────────────────────────────────────────────┘
```

---

## 八、边界情况处理

| 情况 | 处理 |
|------|------|
| 玩家 Day 2 没摸猫 | cat.affinity=0。Day 8 前需要投喂至少 5 点。如果不够 → Day 8 灰掉，提示"猫似乎还不信任你"。 |
| 玩家 Day 6 赌徒 relaxation 没到 10 | 门槛很低——只要调酒正确 + 一个友好选择即可。不满足 → Day 9 灰掉。 |
| 玩家 Day 8 选了让猫女害怕的选项 | 不影响解锁。只是猫女亲和度变化，后续台词微调。不会 block 进度。 |
| 玩家 Day 9 选 A（隐瞒）但想看到碰杯 | 碰杯无论如何都会发生。赌徒决定面对死神。玩家的选择影响的是他"知道有人保护他"还是"知道该自己面对"。 |
| 玩家中途存档再读档 | 状态变量全部持久化。读档恢复当天开始状态（如果是中途存档则恢复精确位置）。 |
| 玩家想重玩某一天 | 需标记后续天的状态为"可能过期"。简单方案：Demo 不支持单天重玩。完整版再做。 |
