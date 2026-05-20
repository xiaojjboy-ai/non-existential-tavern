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
