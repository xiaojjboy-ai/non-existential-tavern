import { create } from 'zustand';
import type { ChoiceBranch, Command, DialogueNode, GameState, PlotData, RuntimeDebugState } from '../types/game';
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
      return { ...runtime, backgroundId: command.params, lastCommandRaw: command.raw };
    case 'BGM':
      return { ...runtime, bgmId: command.params, lastCommandRaw: command.raw };
    case 'ENTER':
      return { ...runtime, activeSpriteId: command.params, lastCommandRaw: command.raw };
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
  return firstGoto?.params ?? plot.dialogueOrder[0] ?? Object.keys(plot.narratives)[0] ?? '';
}

function getInitialRuntime(plot: PlotData | undefined) {
  const firstPlayableIndex = findFirstPlayableCommandIndex(plot);
  return replayNonBlockingCommands(plot, 0, firstPlayableIndex - 1);
}

function getDrinkBranch(plot: PlotData, choiceKey: string): ChoiceBranch | null {
  const drink = plot.drink;
  if (!drink) return null;
  const drinkCommand = plot.commands.find((command) => command.type === 'CHOICE' && command.params === drink.id);

  if (choiceKey === drink.correct) {
    const scriptedGoto = drinkCommand?.choices?.[choiceKey];
    return {
      goto: scriptedGoto ?? Object.keys(plot.dialogues).find((id) => id.includes('drink_correct')) ?? '',
      effect: drink.correct_effect.affinity ?? null,
    };
  }

  const wrongEffect = drink.wrong_effects[choiceKey];
  if (!wrongEffect) return null;

  return {
    goto: wrongEffect.dialogue,
    effect: null,
  };
}

function getAffinityCharacter(plot: PlotData | undefined) {
  if (!plot?.affinity) return null;
  return Array.isArray(plot.affinity) ? (plot.affinity[0]?.character ?? null) : plot.affinity.character;
}

interface GameStore extends GameState {
  setPlot: (plotId: string) => void;
  setNode: (nodeId: string) => void;
  updateAffinity: (character: string, field: string, value: number) => void;
  applyEffect: (effect: string | string[] | null | undefined) => void;
  nextStep: () => void;
  handleChoice: (branchId: string, choiceKey: string) => void;
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

  applyEffect: (effect) => {
    if (!effect) return;

    const character = getAffinityCharacter(get().getCurrentPlot());
    if (!character) return;

    const effects = Array.isArray(effect) ? effect : [effect];

    for (const entry of effects) {
      const match = /^(.+?)([+-]\d+)$/.exec(entry.trim());
      if (!match) continue;

      const [, field, rawValue] = match;
      get().updateAffinity(character, field, Number(rawValue));
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
        set({ currentNodeId: command.params, currentCommandIndex: i, currentChoiceId: null, runtime });
        return;
      }

      if (command.type === 'CHOICE') {
        set({ currentCommandIndex: i, currentChoiceId: command.params, runtime });
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

    const branch = plot.branches[branchId]?.[choiceKey] ?? (
      plot.drink?.id === branchId ? getDrinkBranch(plot, choiceKey) : null
    );
    if (!branch) return;

    state.applyEffect(branch.effect);

    set((currentState) => ({
      currentNodeId: branch.goto,
      currentChoiceId: null,
      history: [...currentState.history, `${branchId}:${choiceKey}`],
    }));
  },
}));
