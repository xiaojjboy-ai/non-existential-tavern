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
// ====== 核心强类型与数据结构规范 (已升级为V2标准) ======
// ==========================================

export type CommandType =
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

export interface CommandParamMap {
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

export type CommandParams<TType extends CommandType = CommandType> = CommandParamMap[TType];

export type Command = {
  [TType in CommandType]: {
    id: string;
    type: TType;
    params: CommandParams<TType>;
    raw: string; // 原始文本，供 Debug 和容错回退使用
  }
}[CommandType];

// 调酒配方原料
export interface Ingredient {
  id: string;      // 材料ID（例如 'gin', 'vodka', 'whisky', 'baijiu'）
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

export type RecipeField =
  | `ingredient.${string}.volumeOz`
  | 'method'
  | 'glass.type'
  | 'glass.iceType'
  | 'garnish';

export type RuleOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'includes';

export interface RecipeCondition {
  field: RecipeField;
  op: RuleOperator;
  value: string | number | boolean | null;
}

export interface AffinityEffect {
  character: string;
  field: '信任' | '关切' | '亲和' | string;
  value: number;
}

export interface EvaluationRule {
  id: string;
  conditions: RecipeCondition[];
  match: 'all' | 'any';
  gotoNodeId: string;              // 满足条件时跳转的节点ID
  affinityEffect: AffinityEffect | null;
}

// 调酒关卡规则
export interface DrinkRule {
  id: string;
  correctRecipe: MixingRecipe;        // 完美的调制配方
  hints: string[];                   // 剧情中逐层揭示的调酒暗示
  evaluationRules: EvaluationRule[]; // 调酒结果的评估与分流规则
}

export interface ChoiceBranch {
  gotoNodeId: string;
  effects?: AffinityEffect[];
  pace?: 'normal' | 'tight' | 'slow';
  ending?: string;
}

// 集成了演出属性的对话节点
export interface DialogueNode {
  id: string;
  actor: string;
  text: string;
  effects?: {
    screenShake?: boolean;           // 是否触发震屏效果
    soundEffectId?: string;          // 说话时的音效ID（如叹气、冷笑）
    voiceId?: string;                // 对白配音文件ID
  };
}

// 单个完整关卡剧情数据
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
