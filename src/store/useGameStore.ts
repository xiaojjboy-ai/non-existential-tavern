import { create } from 'zustand';
import type { Command, DialogueNode, GameState, PlotData, RuntimeDebugState, AffinityEffect, MixingRecipe } from '../types/game';
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

interface GameStore extends GameState {
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

  setPlot: (plotId) => {
    const plot = allPlots[plotId];
    set({
      currentPlotId: plotId,
      currentNodeId: findFirstNodeId(plot),
      currentCommandIndex: findFirstPlayableCommandIndex(plot),
      currentChoiceId: null,
      currentDay: String(plot?.meta?.day ?? '01'),
      runtime: getInitialRuntime(plot),
    });
  },

  setNode: (nodeId) => {
    set({ currentNodeId: nodeId, currentChoiceId: null });
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

  nextStep: () => {
    const state = get();
    const plot = state.getCurrentPlot();
    if (!plot || state.currentChoiceId) return;

    for (let i = state.currentCommandIndex + 1; i < plot.commands.length; i++) {
      const command = plot.commands[i];
      const runtime = replayNonBlockingCommands(plot, state.currentCommandIndex + 1, i);

      if (command.type === 'GOTO') {
        set({ currentNodeId: command.params.targetNodeId, currentCommandIndex: i, currentChoiceId: null, runtime });
        return;
      }

      if (command.type === 'CHOICE') {
        set({ currentCommandIndex: i, currentChoiceId: command.params.choiceId, runtime });
        return;
      }

      if (command.type === 'END') {
        set({ currentCommandIndex: i, currentChoiceId: null, runtime });
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
    }));
  }
}));
