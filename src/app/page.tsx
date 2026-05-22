'use client';

import { useCallback, useMemo, useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { useGameStore } from '@/store/useGameStore';
import type { ChoiceBranch, PlotData } from '@/types/game';

function removeActorPrefix(line: string, actor: string) {
  if (!actor) return line;
  const escapedActor = actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return line.replace(new RegExp(`^${escapedActor}[：:]\\s*`), '');
}

function formatNodeText(node: { text: string; actor: string } | null) {
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
    setPlot,
  } = useGameStore();
  const [completedNodeId, setCompletedNodeId] = useState<string | null>(null);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugHovered, setDebugHovered] = useState(false);
  const [hoveredChoiceKey, setHoveredChoiceKey] = useState<string | null>(null);


  const plot = getCurrentPlot();
  const node = getCurrentNode();
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
    console.log('[CLICK] advancing...');
    nextStep();
  }, [activeChoices, nextStep, node]);

  // Debug: expose store for console access
  if (typeof window !== 'undefined') {
    (window as any).__debugNextStep = nextStep;
  }

  if (!node) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-8 text-center font-mono text-white">
        <div className="mb-2 text-xl font-bold text-amber-500">Loading Data Fail-safe</div>
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
      
      {/* 隐藏的辅助全局点击层（确保无处可点时点击全屏依然能推进） */}
      <div 
        className="fixed inset-0 z-10 cursor-pointer" 
        onClick={handleGlobalClick}
      />

      <main className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none crt-scanlines crt-screen crt-aberration">
        {/* 顶部 VCR/HUD 沉浸式状态栏 */}
        <div className="w-full max-w-5xl self-center pointer-events-auto">
          <div
            className="flex w-full items-center justify-between border-b-2 px-4 py-2"
            style={{ borderColor: 'var(--color-terminal-amber)', borderBottomStyle: 'dashed' }}
          >
            <div className="flex items-center gap-4 font-mono text-sm tracking-widest text-[var(--color-phosphor-crimson)] crt-text-glow-crimson font-bold uppercase">
              <span style={{ animation: 'recBlink 2s infinite' }}>● REC</span>
              <span>PLAY</span>
            </div>
            <div className="font-mono text-sm tracking-widest text-[var(--color-terminal-amber)] crt-text-glow uppercase">
              DAY_{String(plot?.meta.day).padStart(2, '0')} : {Array.isArray(plot?.meta.character) ? plot.meta.character.join(', ') : plot?.meta.character}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={currentPlotId}
                onChange={(e) => setPlot(e.target.value)}
                className="rounded border border-[var(--color-terminal-amber)] bg-black/60 px-2 py-1 text-[10px] text-[var(--color-terminal-amber)] cursor-pointer hover:border-[var(--color-phosphor-crimson)] focus:outline-none font-mono"
              >
                {Object.keys(getAllPlots()).map((id) => (
                  <option key={id} value={id} className="bg-zinc-900 text-zinc-200">
                    {id.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              <div className="font-mono text-sm text-[var(--color-terminal-amber)] crt-text-glow opacity-70">
                SYS_OK
              </div>
            </div>
          </div>
        </div>

        {/* CRT 终端对话框 (贴底宽屏模式) */}
        <div 
          className="fixed bottom-0 left-0 flex w-full flex-col pointer-events-auto transition-all duration-300 z-30 overflow-y-auto"
          style={{
            height: '33vh',
            padding: '2rem 10vw',
            backgroundColor: 'var(--color-crt-base)',
            borderTop: '2px solid var(--color-terminal-amber)',
            boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), inset 0 20px 20px -20px var(--color-terminal-amber), 0 -15px 50px rgba(0,0,0,0.95)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleGlobalClick();
          }}
        >
          {/* 终端机面板顶部标签条 */}
          <div 
            className="absolute top-0 left-0 flex w-full items-center px-4 py-1"
            style={{ backgroundColor: 'var(--color-terminal-amber)' }}
          >
            <span className="font-mono text-[10px] font-bold text-[#0a0a0a] tracking-widest">
              TERMINAL // DATA_STREAM_ACTIVE
            </span>
          </div>

          {actorLabel && (
            <div 
              className="mt-6 mb-4 self-start font-mono font-bold uppercase tracking-widest crt-text-glow"
              style={{
                fontSize: '1.2rem',
                color: 'var(--color-terminal-amber)',
                borderBottom: '2px solid var(--color-terminal-amber)',
                paddingBottom: '4px'
              }}
            >
              {actorLabel}
            </div>
          )}
<<<<<<< HEAD

          <div 
            className="mb-8 min-h-[90px] w-full text-base leading-relaxed" 
            data-testid="dialogue-text"
            style={{
              fontFamily: 'var(--font-noto)',
              lineHeight: '1.85',
              fontSize: '1.15rem',
              color: 'var(--color-foreground)',
              textShadow: '0 0 2px var(--color-text-dim)'
            }}
          >
            {isTypingComplete ? (
              <div className="whitespace-pre-wrap">
                {displayText}
                <span className="ml-1 inline-block h-[1em] w-[0.6em] align-middle bg-[var(--color-terminal-amber)]" style={{ animation: 'cursorBlink 1s infinite' }}></span>
              </div>
            ) : (
              <Typewriter
                key={node.id}
                text={displayText}
                onComplete={() => setCompletedNodeId(currentNodeId)}
                speed={20}
              />
            )}
=======
          <div className="mb-12 min-h-[100px] w-full text-xl leading-relaxed" data-testid="dialogue-text">
            <div className="whitespace-pre-wrap">{displayText}</div>
>>>>>>> ea4cf4e (feat: Day02 安尼尔首次来访 + 剧本切换 + 猫咪互动)
          </div>

          {/* 终端命令行选项系统 */}
          {activeChoices && currentChoiceId && (
            <div className="mt-4 flex w-full flex-col gap-3 font-mono">
              <div className="text-xs tracking-widest text-[var(--color-text-dim)] mb-2">AWAITING_INPUT...</div>
              {Object.entries(activeChoices).map(([key, branch]) => {
                const isHovered = hoveredChoiceKey === key;
                return (
                  <button
                    key={key}
                    data-testid={`choice-button-${key}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleChoice(currentChoiceId, key);
                    }}
                    onMouseEnter={() => setHoveredChoiceKey(key)}
                    onMouseLeave={() => setHoveredChoiceKey(null)}
                    className="flex w-full items-center p-3 text-left transition-all duration-75 cursor-pointer border-2 group"
                    style={{
                      backgroundColor: isHovered ? 'var(--color-terminal-amber)' : 'transparent',
                      borderColor: 'var(--color-terminal-amber)',
                      color: isHovered ? '#0a0a0a' : 'var(--color-terminal-amber)',
                      boxShadow: isHovered ? '0 0 15px var(--color-terminal-amber)' : 'none',
                    }}
                  >
                    <span className="mr-4 text-sm font-bold opacity-80">&gt; [EXEC_{key}]</span>
                    <span className="text-sm font-semibold flex-1" style={{ fontFamily: 'var(--font-noto)' }}>
                      {getChoiceLabel(plot, branch)}
                    </span>
                    {isHovered && (
                      <span className="ml-2 font-bold" style={{ animation: 'cursorBlink 0.5s infinite' }}>█</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!activeChoices && (
            <div className="absolute bottom-4 right-5 flex items-center justify-center">
              <span className="font-mono text-[10px] text-[var(--color-terminal-amber)] crt-text-glow" style={{ animation: 'cursorBlink 1.5s infinite' }}>
                [ CLICK_TO_CONTINUE ]
              </span>
            </div>
          )}
        </div>

        {/* 可折叠 Debug Monitor */}
        <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
          {!debugExpanded ? (
            <button
              onClick={() => setDebugExpanded(true)}
              onMouseEnter={() => setDebugHovered(true)}
              onMouseLeave={() => setDebugHovered(false)}
              className="w-10 h-10 border-2 flex items-center justify-center bg-black/90 cursor-pointer transition-all duration-200 shadow-lg text-sm font-mono font-bold"
              style={{ 
                borderColor: debugHovered ? 'var(--color-phosphor-crimson)' : 'var(--color-text-dim)',
                color: debugHovered ? 'var(--color-phosphor-crimson)' : 'var(--color-text-dim)',
                boxShadow: debugHovered ? '0 0 15px var(--color-phosphor-crimson)' : 'none',
                borderRadius: '0' // Hard edges
              }}
              title="Open Debug Monitor"
            >
              DBG
            </button>
          ) : (
            <div 
              className="flex max-w-xs flex-col gap-2 overflow-hidden border-2 p-4 font-mono text-[10px] bg-black/95 relative shadow-2xl"
              style={{ borderColor: 'var(--color-phosphor-crimson)' }}
            >
              <button 
                onClick={() => setDebugExpanded(false)}
                className="absolute top-2 right-2 text-zinc-500 hover:text-[var(--color-phosphor-crimson)] text-[10px] cursor-pointer tracking-widest"
              >
                [X]
              </button>
              <div className="mb-1 border-b border-[var(--color-phosphor-crimson)] pb-1 font-bold uppercase tracking-tighter text-[var(--color-phosphor-crimson)] crt-text-glow-crimson">
                SYSTEM_DEBUG_TRACE
              </div>
              <div className="flex justify-between"><span className="text-[var(--color-text-dim)]">Plot:</span> <span className="ml-2 truncate text-zinc-300">{currentPlotId}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-dim)]">Node:</span> <span className="ml-2 text-zinc-300">{currentNodeId}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-dim)]">Actor:</span> <span className="ml-2 text-zinc-300">{actorLabel || 'None'}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-dim)]">Choice:</span> <span className="ml-2 text-zinc-300" data-testid="debug-choice">{currentChoiceId ?? 'None'}</span></div>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[var(--color-text-dim)] border-t border-[var(--color-text-dim)] pt-1">Affinity:</span>
                <pre className="whitespace-pre-wrap break-all text-zinc-300" data-testid="debug-affinity">{JSON.stringify(affinities)}</pre>
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-[var(--color-text-dim)] border-t border-[var(--color-text-dim)] pt-1">Runtime:</span>
                <pre className="whitespace-pre-wrap break-all text-zinc-300" data-testid="debug-runtime">{JSON.stringify(runtime, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

