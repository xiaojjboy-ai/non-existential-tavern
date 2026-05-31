import { create } from 'zustand';
import type { Command, DialogueNode, GameState, PlotData, RuntimeDebugState, AffinityEffect, MixingRecipe, InlineCommand, InteractionRule } from '../types/game';
import { evaluateDrink } from '../engine/DrinkEvaluator';
import allPlotsRaw from '../data/plot-data.json';

const allPlots = allPlotsRaw as unknown as Record<string, PlotData>;
const plotIds = Object.keys(allPlots);
const defaultPlotId = plotIds.find((id) => id.toLowerCase().includes('day01')) ?? plotIds[0] ?? '';

function createEmptyRuntime(): RuntimeDebugState {
  return {
    backgroundId: null,
    bgmId: null,
    activeSpriteId: null,
    lastCommandRaw: null,
    ended: false,
  };
}

function applyRuntimeCommand(runtime: RuntimeDebugState, command: Command): RuntimeDebugState {
  switch (command.type) {
    case 'BG':
      return { ...runtime, backgroundId: command.params.assetId, lastCommandRaw: command.raw };
    case 'BGM':
      return { ...runtime, bgmId: command.params.assetId, lastCommandRaw: command.raw };
    case 'ENTER':
      return { ...runtime, activeSpriteId: command.params.characterId, lastCommandRaw: command.raw };
    case 'EXIT':
      return { ...runtime, activeSpriteId: '', lastCommandRaw: command.raw };
    case 'END':
      return { ...runtime, ended: true, lastCommandRaw: command.raw };
    default:
      return runtime;
  }
}

function replayNonBlockingCommands(plot: PlotData | undefined, fromIndex: number, toIndex: number): RuntimeDebugState {
  if (!plot || toIndex < 0 || fromIndex > toIndex) return createEmptyRuntime();

  let runtime = fromIndex > 0
    ? replayNonBlockingCommands(plot, 0, fromIndex - 1)
    : createEmptyRuntime();

  for (let index = Math.max(0, fromIndex); index <= toIndex && index < plot.commands.length; index += 1) {
    runtime = applyRuntimeCommand(runtime, plot.commands[index]);
  }

  return runtime;
}

function findFirstPlayableCommandIndex(plot: PlotData | undefined) {
  if (!plot) return -1;
  const index = plot.commands.findIndex((command) => command.type === 'GOTO');
  return index >= 0 ? index : -1;
}

function findFirstNodeId(plot: PlotData | undefined) {
  if (!plot) return '';
  const firstGoto = plot.commands.find((command) => command.type === 'GOTO');
  return firstGoto?.params?.targetNodeId ?? plot.dialogueOrder[0] ?? Object.keys(plot.narratives)[0] ?? '';
}

function getInitialRuntime(plot: PlotData | undefined) {
  const firstPlayableIndex = findFirstPlayableCommandIndex(plot);
  return replayNonBlockingCommands(plot, 0, firstPlayableIndex - 1);
}

// ==========================================
// ====== V3 行内指令执行映射 ======
// ==========================================

/** 行内指令产生的对话效果状态 */
export interface DialogueEffectState {
  /** 当前激活的特效类名列表（如 'shake', 'glitch'） */
  activeEffects: string[];
  /** SPRITE 指令的目标立绘 ID */
  spriteOverride: string | null;
  /** 特效是否正在播放 */
  isPlaying: boolean;
}

function createEmptyDialogueEffect(): DialogueEffectState {
  return {
    activeEffects: [],
    spriteOverride: null,
    isPlaying: false,
  };
}

/** 将行内指令类型映射为 CSS 动画类名 */
function mapInlineCommandToEffect(cmd: InlineCommand): string {
  switch (cmd.type) {
    case 'SHAKE': return 'shake';
    case 'GLITCH': return 'glitch';
    case 'FLASH': return 'flash';
    case 'FREEZE': return 'freeze';
    case 'SPRITE': return 'sprite-switch';
    case 'GUNSHOT': return 'gunshot';
    default: return '';
  }
}

interface GameStore extends GameState {
  // V3: 行内指令与交互状态
  dialogueEffect: DialogueEffectState;
  activeInteraction: InteractionRule | null;

  setPlot: (plotId: string) => void;
  setNode: (nodeId: string) => void;
  updateAffinity: (character: string, field: string, value: number) => void;
  applyEffect: (effects: AffinityEffect[] | undefined) => void;
  nextStep: () => void;
  handleChoice: (branchId: string, choiceKey: string) => void;
  handleDrinkMix: (recipe: MixingRecipe) => void;
  getCurrentPlot: () => PlotData | undefined;
  getCurrentNode: () => DialogueNode | null;
  getAllPlots: () => Record<string, PlotData>;

  // V3: 行内指令执行与交互管理
  executeInlineCommands: (commands: InlineCommand[]) => void;
  clearDialogueEffect: () => void;
  startInteraction: (interactionId: string) => void;
  completeInteraction: (success: boolean) => void;
}

const defaultPlot = allPlots[defaultPlotId];

export const useGameStore = create<GameStore>((set, get) => ({
  currentDay: String(defaultPlot?.meta?.day ?? '01'),
  currentPlotId: defaultPlotId,
  currentNodeId: findFirstNodeId(defaultPlot),
  currentCommandIndex: findFirstPlayableCommandIndex(defaultPlot),
  currentChoiceId: null,
  affinities: {},
  unlockedCharacters: [],
  history: [],
  flags: {},
  runtime: getInitialRuntime(defaultPlot),

  // V3: 初始状态
  dialogueEffect: createEmptyDialogueEffect(),
  activeInteraction: null,

  setPlot: (plotId) => {
    const plot = allPlots[plotId];
    set({
      currentPlotId: plotId,
      currentNodeId: findFirstNodeId(plot),
      currentCommandIndex: findFirstPlayableCommandIndex(plot),
      currentChoiceId: null,
      currentDay: String(plot?.meta?.day ?? '01'),
      runtime: getInitialRuntime(plot),
      dialogueEffect: createEmptyDialogueEffect(),
      activeInteraction: null,
    });
  },

  setNode: (nodeId) => {
    set({ currentNodeId: nodeId, currentChoiceId: null, dialogueEffect: createEmptyDialogueEffect() });
  },

  updateAffinity: (character, field, value) => set((state) => ({
    affinities: {
      ...state.affinities,
      [character]: {
        ...(state.affinities[character] ?? {}),
        [field]: (state.affinities[character]?.[field] ?? 0) + value,
      },
    },
  })),

  applyEffect: (effects) => {
    if (!effects || effects.length === 0) return;
    for (const effect of effects) {
      get().updateAffinity(effect.character, effect.field, effect.value);
    }
  },

  getCurrentPlot: () => {
    return allPlots[get().currentPlotId];
  },

  getCurrentNode: () => {
    const state = get();
    const plot = state.getCurrentPlot();
    if (!plot) return null;
    return plot.dialogues[state.currentNodeId] ?? plot.narratives[state.currentNodeId] ?? null;
  },

  getAllPlots: () => allPlots,

  // ==========================================
  // ====== V3: 行内指令执行 ======
  // ==========================================

  executeInlineCommands: (commands: InlineCommand[]) => {
    if (!commands || commands.length === 0) return;

    const activeEffects: string[] = [];
    let spriteOverride: string | null = null;

    for (const cmd of commands) {
      if (cmd.type === 'SPRITE' && cmd.args) {
        spriteOverride = cmd.args;
      } else {
        const effect = mapInlineCommandToEffect(cmd);
        if (effect) activeEffects.push(effect);
      }
    }

    set({
      dialogueEffect: {
        activeEffects,
        spriteOverride,
        isPlaying: activeEffects.length > 0 || spriteOverride !== null,
      },
    });
  },

  clearDialogueEffect: () => {
    set({ dialogueEffect: createEmptyDialogueEffect() });
  },

  // ==========================================
  // ====== V3: 交互管理 ======
  // ==========================================

  startInteraction: (interactionId: string) => {
    const plot = get().getCurrentPlot();
    if (!plot?.interactions?.[interactionId]) return;

    set({
      activeInteraction: plot.interactions[interactionId],
    });
  },

  completeInteraction: (success: boolean) => {
    const state = get();
    const interaction = state.activeInteraction;
    if (!interaction) return;

    const gotoNodeId = success ? interaction.successGotoNodeId : (interaction.failGotoNodeId ?? interaction.successGotoNodeId);

    if (success && interaction.successAffinityEffect) {
      state.applyEffect([interaction.successAffinityEffect]);
    }

    set((currentState) => ({
      currentNodeId: gotoNodeId,
      currentChoiceId: null,
      activeInteraction: null,
      history: [...currentState.history, `interact:${interaction.id}:${success ? 'success' : 'fail'}`],
    }));
  },

  nextStep: () => {
    const state = get();
    const plot = state.getCurrentPlot();
    if (!plot || state.currentChoiceId) return;

    for (let i = state.currentCommandIndex + 1; i < plot.commands.length; i++) {
      const command = plot.commands[i];
      const runtime = replayNonBlockingCommands(plot, state.currentCommandIndex + 1, i);

      if (command.type === 'GOTO') {
        set({ currentNodeId: command.params.targetNodeId, currentCommandIndex: i, currentChoiceId: null, runtime, dialogueEffect: createEmptyDialogueEffect() });
        return;
      }

      if (command.type === 'CHOICE') {
        set({ currentCommandIndex: i, currentChoiceId: command.params.choiceId, runtime });
        return;
      }

      if (command.type === 'INTERACT') {
        set({ currentCommandIndex: i, runtime });
        get().startInteraction(command.params.interactionId);
        return;
      }

      if (command.type === 'END') {
        const nextPlotId = plot.meta?.next as string | undefined;
        if (nextPlotId && allPlots[nextPlotId]) {
          const nextPlot = allPlots[nextPlotId];
          set({
            currentPlotId: nextPlotId,
            currentNodeId: findFirstNodeId(nextPlot),
            currentCommandIndex: findFirstPlayableCommandIndex(nextPlot),
            currentChoiceId: null,
            currentDay: String(nextPlot?.meta?.day ?? ''),
            runtime: getInitialRuntime(nextPlot),
            dialogueEffect: createEmptyDialogueEffect(),
            activeInteraction: null,
          });
        } else {
          set({ currentCommandIndex: i, currentChoiceId: null, runtime });
        }
        return;
      }
    }
  },

  handleChoice: (branchId, choiceKey) => {
    const state = get();
    const plot = state.getCurrentPlot();
    if (!plot) return;

    const branch = plot.branches[branchId]?.[choiceKey];
    if (branch) {
      state.applyEffect(branch.effects);
      set((currentState) => ({
        currentNodeId: branch.gotoNodeId,
        currentChoiceId: null,
        history: [...currentState.history, `${branchId}:${choiceKey}`],
        dialogueEffect: createEmptyDialogueEffect(),
      }));
      return;
    }

    if (plot.drink?.id === branchId) {
      const rule = plot.drink.evaluationRules.find(r => r.id === choiceKey);
      if (rule) {
        if (rule.affinityEffect) {
          state.applyEffect([rule.affinityEffect]);
        }
        set((currentState) => ({
          currentNodeId: rule.gotoNodeId,
          currentChoiceId: null,
          history: [...currentState.history, `drink:${rule.id}`],
          dialogueEffect: createEmptyDialogueEffect(),
        }));
      }
    }
  },

  handleDrinkMix: (recipe) => {
    const state = get();
    const plot = state.getCurrentPlot();
    if (!plot || !plot.drink) return;

    const evalRule = evaluateDrink(recipe, plot.drink);
    if (!evalRule) return;

    if (evalRule.affinityEffect) {
      state.applyEffect([evalRule.affinityEffect]);
    }

    set((currentState) => ({
      currentNodeId: evalRule.gotoNodeId,
      currentChoiceId: null,
      history: [...currentState.history, `drink:${evalRule.id}`],
      dialogueEffect: createEmptyDialogueEffect(),
    }));
  }
}));
