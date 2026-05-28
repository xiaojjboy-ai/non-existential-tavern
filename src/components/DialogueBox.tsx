import { useMemo, useState, useEffect } from 'react';
import { Typewriter } from '@/components/Typewriter';
import { useGameStore } from '@/store/useGameStore';

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

export function DialogueBox({ children }: { children?: React.ReactNode }) {
  const { currentNodeId, currentChoiceId, getCurrentNode, nextStep } = useGameStore();
  const [completedNodeId, setCompletedNodeId] = useState<string | null>(null);

  const node = getCurrentNode();
  const isTypingComplete = completedNodeId === currentNodeId;
  const displayText = useMemo(() => formatNodeText(node), [node]);
  
  const actorLabel = useMemo(() => {
    if (!node) return '';
    if (node.id.startsWith('narr_')) return '旁白';
    return node.actor.trim();
  }, [node]);

  const handleClickToAdvance = () => {
    if (!node || currentChoiceId) return;
    if (!isTypingComplete) {
      setCompletedNodeId(currentNodeId);
    } else {
      nextStep();
    }
  };

  if (!node) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-10 cursor-pointer" 
        onClick={handleClickToAdvance}
      />
      <div 
        className="fixed bottom-0 left-0 flex w-full flex-col pointer-events-auto transition-all duration-300 z-30 overflow-y-auto"
        style={{
          height: '33vh',
          padding: '2rem 10vw',
          backgroundColor: 'var(--color-crt-base)',
          borderTop: '2px solid var(--color-terminal-amber)',
          boxShadow: 'inset 0 0 60px rgba(0,0,0,0.9), inset 0 20px 20px -20px var(--color-terminal-amber), 0 -15px 50px rgba(0,0,0,0.95)',
        }}
        onClick={handleClickToAdvance}
      >
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
      </div>

      {children}

      {!currentChoiceId && (
        <div className="absolute bottom-4 right-5 flex items-center justify-center">
          <span className="font-mono text-[10px] text-[var(--color-terminal-amber)] crt-text-glow pointer-events-none" style={{ animation: 'cursorBlink 1.5s infinite' }}>
            [ CLICK_TO_CONTINUE ]
          </span>
        </div>
      )}
    </div>
    </>
  );
}
