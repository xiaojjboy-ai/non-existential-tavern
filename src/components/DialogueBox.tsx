import { useMemo, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Typewriter } from '@/components/Typewriter';
import { useGameStore } from '@/store/useGameStore';
import type { InlineCommand } from '@/types/game';

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

/** 将行内指令类型映射为 CSS 动画类名 */
function mapInlineCommandsToClasses(commands: InlineCommand[] | undefined): string {
  if (!commands || commands.length === 0) return '';
  return commands
    .map((cmd) => {
      switch (cmd.type) {
        case 'SHAKE': return 'effect-shake';
        case 'GLITCH': return 'effect-glitch';
        case 'FLASH': return 'effect-flash';
        case 'FREEZE': return 'effect-freeze';
        case 'SPRITE': return 'effect-sprite-switch';
        default: return '';
      }
    })
    .filter(Boolean)
    .join(' ');
}

const BlinkCursor = () => (
  <span
    className="ml-1 inline-block h-[1em] w-[0.6em] align-middle bg-[var(--color-terminal-amber)]"
    style={{ animation: 'cursorBlink 1s infinite' }}
  />
);

export function DialogueBox({ children }: { children?: React.ReactNode }) {
  const {
    currentNodeId,
    currentChoiceId,
    activeInteraction,
    getCurrentNode,
    nextStep,
    executeInlineCommands,
    dialogueEffect,
    clearDialogueEffect,
  } = useGameStore();

  const node = getCurrentNode();

  // Portal 需要 document，挂载后再渲染推进层，避免 SSR 不一致
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const actorLabel = useMemo(() => {
    if (!node) return '';
    if (node.id.startsWith('narr_')) return '旁白';
    return node.actor.trim();
  }, [node]);

  // 逐行推进文本
  const fullText = useMemo(() => formatNodeText(node), [node]);
  const lines = useMemo(() => fullText.split('\n').filter(Boolean), [fullText]);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [lineComplete, setLineComplete] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 节点切换 → 重置逐行状态
  useEffect(() => {
    setCurrentLineIndex(0);
    setLineComplete(false);
    setCompleted(false);
  }, [currentNodeId]);

  // 节点切换 → 执行行内指令（特效）
  useEffect(() => {
    if (node?.inlineCommands && node.inlineCommands.length > 0) {
      executeInlineCommands(node.inlineCommands);
    }
  }, [currentNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 特效播放完成后清除
  useEffect(() => {
    if (dialogueEffect.isPlaying) {
      const timer = setTimeout(() => clearDialogueEffect(), 600);
      return () => clearTimeout(timer);
    }
  }, [dialogueEffect.isPlaying, clearDialogueEffect]);

  const isMultiLine = lines.length > 1;
  const isLastLine = currentLineIndex >= lines.length - 1;
  const currentLine = lines[currentLineIndex] ?? '';

  // 推进逻辑：跳过打字 → 下一行 → 下一节点
  const handleAdvance = useCallback(() => {
    if (currentChoiceId) return; // 有选项/调酒时禁止点击推进
    if (isMultiLine) {
      if (!lineComplete) { setLineComplete(true); return; }
      if (!isLastLine) { setCurrentLineIndex((p) => p + 1); setLineComplete(false); return; }
      nextStep();
      return;
    }
    if (!completed) { setCompleted(true); return; }
    nextStep();
  }, [currentChoiceId, isMultiLine, lineComplete, isLastLine, completed, nextStep]);

  const hint = useMemo(() => {
    if (isMultiLine) {
      if (!lineComplete) return '[ CLICK_TO_SKIP ]';
      if (!isLastLine) return '[ CLICK_FOR_NEXT_LINE ]';
      return '[ CLICK_TO_CONTINUE ]';
    }
    if (!completed) return '[ CLICK_TO_SKIP ]';
    return '[ CLICK_TO_CONTINUE ]';
  }, [isMultiLine, lineComplete, isLastLine, completed]);

  if (!node) return null;

  const effectClasses = mapInlineCommandsToClasses(node.inlineCommands);
  const showAdvanceLayer = !currentChoiceId && !activeInteraction;

  // 面板贴底锚定、向上自然增高（max-h + 内部滚动）；面板本身 pointer-events-none，
  // 正文区点击穿透至全屏推进层，交互元素（选项/调酒）各自重新启用 pointer-events。
  const containerClasses = `absolute bottom-0 inset-x-0 flex flex-col pointer-events-none transition-all duration-300 z-30 max-h-[72vh] overflow-y-auto ${effectClasses}`;

  return (
    <>
      {/* 全屏推进点击层 — 经 Portal 挂到 body，逃出 .bar-counter 的 backdrop-filter 包含块，
          覆盖场景与对话框（避开顶部 HUD）；有选项/调酒/交互时不渲染 */}
      {mounted && showAdvanceLayer && createPortal(
        <div
          className="fixed inset-x-0 bottom-0 z-[60] cursor-pointer"
          style={{ top: '48px' }}
          onClick={handleAdvance}
          aria-hidden
        />,
        document.body,
      )}

      <div
        className={containerClasses}
        style={{
          backgroundColor: 'rgba(10, 10, 10, 0.82)',
          borderTop: '2px solid var(--color-terminal-amber)',
          boxShadow: '0 -8px 28px rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div
          className="flex w-full items-center px-4 py-1"
          style={{ backgroundColor: 'var(--color-terminal-amber)' }}
        >
          <span className="font-mono text-[10px] font-bold text-[#0a0a0a] tracking-widest">
            TERMINAL // DATA_STREAM_ACTIVE
          </span>
        </div>

        {actorLabel && (
          <div
            className="mt-4 mb-3 self-start font-mono font-bold uppercase tracking-widest crt-text-glow"
            style={{
              fontSize: '1.2rem',
              color: 'var(--color-terminal-amber)',
              borderBottom: '2px solid var(--color-terminal-amber)',
              paddingBottom: '4px',
              marginLeft: '10vw',
              marginRight: '10vw',
            }}
          >
            {actorLabel}
          </div>
        )}

        <div
          className="mb-4 min-h-[72px] text-base leading-relaxed whitespace-pre-wrap"
          data-testid="dialogue-text"
          style={{
            fontFamily: 'var(--font-noto)',
            lineHeight: '1.85',
            fontSize: '1.15rem',
            color: 'var(--color-foreground)',
            textShadow: '0 0 2px var(--color-text-dim)',
            paddingLeft: '10vw',
            paddingRight: '10vw',
          }}
        >
          {isMultiLine ? (
            <>
              {lines.slice(0, currentLineIndex).map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
              {lineComplete ? (
                <div>
                  {currentLine}
                  {isLastLine && <BlinkCursor />}
                </div>
              ) : (
                <Typewriter
                  key={`${node.id}-${currentLineIndex}`}
                  text={currentLine}
                  onComplete={() => setLineComplete(true)}
                  speed={20}
                />
              )}
            </>
          ) : completed ? (
            <div>
              {fullText}
              <BlinkCursor />
            </div>
          ) : (
            <Typewriter
              key={node.id}
              text={fullText}
              onComplete={() => setCompleted(true)}
              speed={20}
            />
          )}
        </div>

        {/* 提示文字 */}
        <div className="absolute bottom-4 right-5 flex items-center justify-center">
          <span
            className="font-mono text-[10px] text-[var(--color-terminal-amber)] crt-text-glow pointer-events-none"
            style={{ animation: 'cursorBlink 1.5s infinite' }}
          >
            {currentChoiceId ? '' : hint}
          </span>
        </div>

        {/* children(ChoiceMenu / DrinkPrompt) 与正文同列对齐；自身已含 pointer-events-auto */}
        <div style={{ paddingLeft: '10vw', paddingRight: '10vw', paddingBottom: '1.5rem' }}>
          {children}
        </div>
      </div>
    </>
  );
}
