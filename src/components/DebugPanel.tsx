import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

export function DebugPanel() {
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugHovered, setDebugHovered] = useState(false);
  
  const {
    currentPlotId,
    currentNodeId,
    currentChoiceId,
    affinities,
    runtime,
    getCurrentNode,
    nextStep
  } = useGameStore();

  const node = getCurrentNode();
  const actorLabel = node ? (node.id.startsWith('narr_') ? '旁白' : node.actor.trim()) : 'None';

  // Debug: expose store for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __debugNextStep: typeof nextStep }).__debugNextStep = nextStep;
    }
  }, [nextStep]);

  return (
    <div className="fixed bottom-4 left-4 z-[9999] pointer-events-auto text-white">
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
            borderRadius: '0'
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
          <div className="flex justify-between"><span className="text-[var(--color-text-dim)]">Actor:</span> <span className="ml-2 text-zinc-300">{actorLabel}</span></div>
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
  );
}
