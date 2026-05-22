import type { PixiElements } from '@pixi/react';

export type Actor =
  | 'Lendro'
  | 'Aletor'
  | 'Lethus'
  | 'Sylvena'
  | 'Cat'
  | 'Cowboy'
  | 'Mechanic'
  | 'Zombie'
  | 'PhilosopherGod'
  | 'Robot'
  | 'Bartender'
  | 'System'
  | '旁白'
  | string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type CommandType =
  | 'BG'
  | 'BGM'
  | 'SE'
  | 'LIGHT'
  | 'PROP'
  | 'ENTER'
  | 'EXIT'
  | 'EMO'
  | 'PAUSE'
  | 'GOTO'
  | 'CHOICE'
  | 'END';

export interface Command {
  type: CommandType;
  params: string;
  raw: string;
  choices?: Record<string, string>;
}

export interface Resource {
  id: string;
  desc: string;
}

export interface Meta {
  day: string | number;
  character: string | string[];
  visit: number | string | null;
  requires: unknown;
  unlocks: Array<Record<string, unknown>>;
  next: string | null;
  resources: {
    bg?: Resource[];
    bgm?: Resource[];
    se?: Resource[];
    sprite?: Resource[];
  };
  is_ending?: boolean;
  is_reveal?: boolean;
  ending_variants?: Record<string, string>;
}

export interface AffinityChange {
  id: string;
  trigger: string;
  field: string;
  value: number;
  note: string | null;
}

export interface AffinityRule {
  character: string;
  start: number;
  max: number;
  changes: AffinityChange[];
}

export interface DrinkEffect {
  affinity?: string;
  emotion?: string;
}

export interface DrinkRule {
  id: string;
  available: string[];
  correct: string;
  hint: string;
  correct_effect: DrinkEffect;
  wrong_effects: Record<string, {
    dialogue: string;
    reaction: string;
  }>;
}

export interface ChoiceBranch {
  goto: string;
  effect?: string | string[] | null;
  pace?: 'normal' | 'tight' | 'slow';
  ending?: string;
}

export interface DialogueNode {
  id: string;
  actor: Actor;
  text: string;
  actions?: string[];
}

export interface PlotData {
  meta: Meta;
  affinity?: AffinityRule | AffinityRule[];
  drink: DrinkRule | null;
  branches: Record<string, Record<string, ChoiceBranch>>;
  dialogues: Record<string, DialogueNode>;
  dialogueOrder: string[];
  narratives: Record<string, DialogueNode>;
  commands: Command[];
  links?: unknown;
  metaphor?: unknown;
}

export interface RuntimeDebugState {
  backgroundId: string | null;
  bgmId: string | null;
  activeSpriteId: string | null;
  lastCommandRaw: string | null;
  ended: boolean;
}

export interface GameState {
  currentDay: string;
  currentPlotId: string;
  currentNodeId: string;
  currentCommandIndex: number;
  currentChoiceId: string | null;
  affinities: Record<string, Record<string, number>>;
  unlockedCharacters: string[];
  history: string[];
  flags: Record<string, boolean>;
  runtime: RuntimeDebugState;
}

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
declare global {
  namespace JSX {
    interface IntrinsicElements extends PixiElements {}
  }
}

// ==========================================
// ====== V2 核心强类型与数据结构规范 ======
// ==========================================

export type CommandTypeV2 =
  | 'BG'      // 切换背景
  | 'BGM'     // 背景音乐控制
  | 'SE'      // 音效播放
  | 'LIGHT'   // 灯光色调描述
  | 'PROP'    // 道具摆放与改变
  | 'ENTER'   // 角色立绘入场
  | 'EXIT'    // 角色立绘退场
  | 'EMO'     // 表情姿态微调
  | 'PAUSE'   // 等待停顿
  | 'GOTO'    // 跳转到指定节点
  | 'CHOICE'  // 触发选项面板
  | 'END';    // 关卡/剧情结束

export interface CommandParamMapV2 {
  BG: { assetId: string; transition?: 'fade' | 'slide' | 'none' };
  BGM: { assetId: string; action: 'play' | 'stop' | 'fade_out'; duration?: number };
  SE: { assetId: string; volume?: number; loop?: boolean };
  LIGHT: { color: string; intensity: number; description: string };
  PROP: { propId: string; action: 'show' | 'hide' | 'change'; state?: string };
  ENTER: { characterId: string; poseId: string; position: 'left' | 'center' | 'right' };
  EXIT: { characterId: string };
  EMO: { characterId: string; emoId: string };
  PAUSE: { durationMs: number };
  GOTO: { targetNodeId: string };
  CHOICE: { choiceId: string };
  END: Record<string, never>;
}

export type CommandParamsV2<TType extends CommandTypeV2 = CommandTypeV2> = CommandParamMapV2[TType];

export type CommandV2 = {
  [TType in CommandTypeV2]: {
    id: string;
    type: TType;
    params: CommandParamsV2<TType>;
    raw: string; // 原始文本，供 Debug 和容错回退使用
  }
}[CommandTypeV2];

// 调酒配方原料
export interface Ingredient {
  id: string;      // 材料ID（例如 'gin', 'vodka', 'whisky'）
  name: string;    // 材料中文名
  volumeOz: number; // 加注盎司量
}

// 调酒调制手法
export type MixMethod = 'stir' | 'shake' | 'build'; // 搅拌 / 摇晃 / 直调

// 酒杯与冰块配置
export interface ServingGlass {
  type: 'rock' | 'martini' | 'collins'; // 矮杯 / 鸡尾酒杯 / 高杯
  iceType: 'none' | 'cube' | 'sphere'; // 无冰 / 方冰 / 冰球
}

// 调配出的最终配方
export interface MixingRecipe {
  ingredients: Ingredient[];
  method: MixMethod;
  glass: ServingGlass;
  garnish?: string; // 装饰物，例如“樱桃”、“柠檬片”
}

export type RecipeFieldV2 =
  | `ingredient.${string}.volumeOz`
  | 'method'
  | 'glass.type'
  | 'glass.iceType'
  | 'garnish';

export type RuleOperatorV2 = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'includes';

export interface RecipeConditionV2 {
  field: RecipeFieldV2;
  op: RuleOperatorV2;
  value: string | number | boolean | null;
}

export interface AffinityEffectV2 {
  character: string;
  field: '信任' | '关切' | '亲和';
  value: number;
}

// V2 调酒关卡规则
export interface DrinkRuleV2 {
  id: string;
  correctRecipe: MixingRecipe;        // 完美的调制配方
  hints: string[];                   // 剧情中逐层揭示的调酒暗示
  evaluationRules: Array<{           // 调酒结果的评估与分流规则
    id: string;
    conditions: RecipeConditionV2[];
    match: 'all' | 'any';
    gotoNodeId: string;              // 满足条件时跳转的节点ID
    affinityEffect: AffinityEffectV2 | null;
  }>;
}

export interface ChoiceBranchV2 {
  gotoNodeId: string;
  effects?: AffinityEffectV2[];
  pace?: 'normal' | 'tight' | 'slow';
  ending?: string;
}

// V2 集成了演出属性的对话节点
export interface DialogueNodeV2 {
  id: string;
  actor: string;
  text: string;
  effects?: {
    screenShake?: boolean;           // 是否触发震屏效果
    soundEffectId?: string;          // 说话时的音效ID（如叹气、冷笑）
    voiceId?: string;                // 对白配音文件ID
  };
}

// V2 单个完整关卡剧情数据
export interface PlotDataV2 {
  meta: Meta;
  affinity?: AffinityRule | AffinityRule[];
  drink: DrinkRuleV2 | null;
  branches: Record<string, Record<string, ChoiceBranchV2>>;
  dialogues: Record<string, DialogueNodeV2>;
  dialogueOrder: string[];
  narratives: Record<string, DialogueNodeV2>;
  commands: CommandV2[];
  links?: unknown;
  metaphor?: unknown;
}

// 统一的全局存档快照格式
export interface GameSaveSnapshot {
  saveId: string;
  timestamp: number;
  playTimeSeconds: number;

  // 核心剧情指针
  currentPlotId: string;
  currentNodeId: string;
  currentCommandIndex: number;
  currentChoiceId: string | null;

  // 抉择历史与解锁数据
  affinities: Record<string, Record<string, number>>;
  unlockedCharacters: string[];
  flags: Record<string, boolean>;
  history: string[];
  runtime: RuntimeDebugState;
}
