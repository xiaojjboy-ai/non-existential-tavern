import { useMemo, useState } from 'react';
import type { PlotData, ChoiceBranch } from '@/types/game';
import { useGameStore } from '@/store/useGameStore';

function formatNodeText(node: { text: string; actor: string } | null) {
  if (!node) return '';
  const escapedActor = node.actor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return node.text
    .split(/\r?\n/)
    .map((line) => line.replace(new RegExp(`^${escapedActor}[：:]\\s*`), '').trimEnd())
    .join('\n')
    .trim();
}

function getChoiceLabel(plot: PlotData | undefined, branch: ChoiceBranch) {
  if (branch.ending) return branch.ending;
  const targetNode = plot?.dialogues[branch.gotoNodeId] ?? plot?.narratives[branch.gotoNodeId];
  if (!targetNode) return branch.gotoNodeId;
  const preview = formatNodeText(targetNode).split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  return preview ?? branch.gotoNodeId;
}

export function ChoiceMenu() {
  const { currentChoiceId, handleChoice, getCurrentPlot } = useGameStore();
  const [hoveredChoiceKey, setHoveredChoiceKey] = useState<string | null>(null);

  const plot = getCurrentPlot();
  const activeChoices = useMemo(() => {
    if (!plot || !currentChoiceId) return null;
    return plot.branches[currentChoiceId] ?? null;
  }, [currentChoiceId, plot]);

  // 如果是调酒或者没有选项，就不渲染这个组件
  if (!activeChoices || !currentChoiceId || currentChoiceId === plot?.drink?.id) return null;

  // 保存一个确定非空的引用供闭包使用，解决 TS2345 报错
  const activeChoiceId = currentChoiceId;

  return (
    <div className="mt-4 flex w-full flex-col gap-3 font-mono pointer-events-auto">
      <div className="text-xs tracking-widest text-[var(--color-text-dim)] mb-2">AWAITING_INPUT...</div>
      {Object.entries(activeChoices).map(([key, branch]) => {
        const isHovered = hoveredChoiceKey === key;
        return (
          <button
            key={key}
            data-testid={`choice-button-${key}`}
            onClick={(event) => {
              event.stopPropagation();
              handleChoice(activeChoiceId, key);
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
  );
}
