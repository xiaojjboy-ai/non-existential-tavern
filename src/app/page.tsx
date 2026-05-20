'use client';

import { useCallback, useMemo, useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { Typewriter } from '@/components/Typewriter';
import { useGameStore } from '@/store/useGameStore';
import type { ChoiceBranch, DialogueNode, PlotData } from '@/types/game';

function removeActorPrefix(line: string, actor: string) {
  if (!actor) return line;
  const escapedActor = actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return line.replace(new RegExp(`^${escapedActor}[：:]\\s*`), '');
}

function formatNodeText(node: DialogueNode | null) {
  if (!node) return '';
  return node.text
    .split(/\r?\n/)
    .map((line) => removeActorPrefix(line, node.actor).trimEnd())
    .join('\n')
    .trim();
}

function getChoiceLabel(plot: PlotData | undefined, branch: ChoiceBranch) {
  if (branch.ending) return branch.ending;

  const targetNode = plot?.dialogues[branch.goto] ?? plot?.narratives[branch.goto];
  if (!targetNode) return branch.goto;

  const preview = formatNodeText(targetNode)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return preview ?? branch.goto;
}

export default function Home() {
  const {
    affinities,
    currentPlotId,
    currentNodeId,
    currentChoiceId,
    getAllPlots,
    getCurrentNode,
    getCurrentPlot,
    handleChoice,
    nextStep,
    runtime,
  } = useGameStore();
  const [completedNodeId, setCompletedNodeId] = useState<string | null>(null);
  const plot = getCurrentPlot();
  const node = getCurrentNode();
  const isTypingComplete = completedNodeId === currentNodeId;
  const displayText = useMemo(() => formatNodeText(node), [node]);
  const actorLabel = useMemo(() => {
    if (!node) return '';
    if (node.id.startsWith('narr_')) return '旁白';
    return node.actor.trim();
  }, [node]);

  const activeChoices = useMemo(() => {
    if (!plot || !currentChoiceId) return null;
    const branchChoices = plot.branches[currentChoiceId];
    if (branchChoices) return branchChoices;

    if (plot.drink?.id === currentChoiceId) {
      const drinkCommand = plot.commands.find((command) => command.type === 'CHOICE' && command.params === currentChoiceId);
      return Object.fromEntries(plot.drink.available.map((drinkName) => {
        const goto = drinkCommand?.choices?.[drinkName]
          ?? plot.drink?.wrong_effects[drinkName]?.dialogue
          ?? '';
        return [drinkName, { goto, effect: drinkName === plot.drink?.correct ? plot.drink?.correct_effect.affinity ?? null : null }];
      }));
    }

    return null;
  }, [currentChoiceId, plot]);

  const handleGlobalClick = useCallback(() => {
    if (!node || activeChoices) return;

    if (!isTypingComplete) {
      setCompletedNodeId(currentNodeId);
      return;
    }

    nextStep();
  }, [activeChoices, currentNodeId, isTypingComplete, nextStep, node]);

  if (!node) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-8 text-center font-mono text-white">
        <div className="mb-2 text-xl font-bold text-amber-400">Loading Data Fail-safe</div>
        <div className="mb-8 max-w-md text-sm text-zinc-500">
          Could not find dialogue node <code className="text-zinc-300">[{currentNodeId}]</code>
          {' '}in plot <code className="text-zinc-300">[{currentPlotId}]</code>.
        </div>

        <div className="w-full max-w-lg rounded border border-white/10 bg-black/50 p-6 text-left">
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-600">Available Plots</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(getAllPlots()).map((plotId) => (
              <span key={plotId} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300">
                {plotId}
              </span>
            ))}
          </div>
          <div className="mt-4 text-[10px] text-zinc-700">Run npm run compile if generated data is stale.</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <GameCanvas />
      <main
        className="relative z-10 flex min-h-screen cursor-pointer flex-col items-center justify-between p-8 text-white md:p-24"
        onClick={handleGlobalClick}
      >
        <div className="z-10 w-full max-w-5xl font-mono text-sm pointer-events-auto">
          <p className="inline-flex max-w-full rounded border border-white/10 bg-black/40 px-4 py-3 text-zinc-200 backdrop-blur">
            Day: {plot?.meta.day} | Character: {Array.isArray(plot?.meta.character) ? plot.meta.character.join(', ') : plot?.meta.character}
          </p>
        </div>

        <div className="relative flex w-full max-w-2xl flex-col items-center justify-center rounded-lg border border-white/10 bg-black/80 p-8 shadow-2xl pointer-events-auto md:p-12">
          {actorLabel && (
            <div className="mb-6 self-start text-2xl font-bold text-amber-400">
              {actorLabel}
            </div>
          )}
          <div className="mb-12 min-h-[100px] w-full text-xl leading-relaxed" data-testid="dialogue-text">
            {isTypingComplete ? (
              <div className="whitespace-pre-wrap">{displayText}</div>
            ) : (
              <Typewriter
                key={node.id}
                text={displayText}
                onComplete={() => setCompletedNodeId(currentNodeId)}
                speed={20}
              />
            )}
          </div>

          {activeChoices && currentChoiceId && (
            <div className="flex w-full flex-col gap-4">
              {Object.entries(activeChoices).map(([key, branch]) => (
                <button
                  key={key}
                  data-testid={`choice-button-${key}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleChoice(currentChoiceId, key);
                  }}
                  className="w-full rounded-md border border-white/20 bg-white/5 p-5 text-left transition-all hover:border-amber-400/50 hover:bg-amber-400/20"
                >
                  <span className="mr-4 font-bold text-amber-400">{key}</span>
                  <span className="text-gray-300">{getChoiceLabel(plot, branch)}</span>
                </button>
              ))}
            </div>
          )}

          {!activeChoices && (
            <div className="text-sm italic text-gray-500 animate-pulse">
              (点击继续...)
            </div>
          )}
        </div>

        <div className="fixed bottom-4 left-4 z-50 flex max-w-xs flex-col gap-2 overflow-hidden rounded-md border border-amber-400/50 bg-black/90 p-4 font-mono text-[10px] pointer-events-auto">
          <div className="mb-1 border-b border-amber-400/20 pb-1 font-bold uppercase tracking-tighter text-amber-400">Debug Monitor</div>
          <div className="flex justify-between"><span className="text-zinc-500">Plot:</span> <span className="ml-2 truncate text-zinc-300">{currentPlotId}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Node:</span> <span className="ml-2 text-zinc-300">{currentNodeId}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Actor:</span> <span className="ml-2 text-zinc-300">{actorLabel || 'None'}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Choice:</span> <span className="ml-2 text-zinc-300" data-testid="debug-choice">{currentChoiceId ?? 'None'}</span></div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500">Affinity:</span>
            <pre className="whitespace-pre-wrap break-all text-zinc-300" data-testid="debug-affinity">{JSON.stringify(affinities)}</pre>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-500">Runtime:</span>
            <pre className="whitespace-pre-wrap break-all text-zinc-300" data-testid="debug-runtime">{JSON.stringify(runtime, null, 2)}</pre>
          </div>
        </div>
      </main>
    </>
  );
}
