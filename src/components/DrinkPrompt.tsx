import { useGameStore } from '@/store/useGameStore';

export function DrinkPrompt({ onActivate }: { onActivate: () => void }) {
  const { currentChoiceId, getCurrentPlot } = useGameStore();
  const plot = getCurrentPlot();

  if (currentChoiceId !== plot?.drink?.id) return null;

  return (
    <div className="mt-4 flex w-full justify-center font-mono pointer-events-auto">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        className="w-full border-2 p-4 text-center text-lg font-bold transition-all duration-300 hover:bg-[var(--color-terminal-amber)] hover:text-black crt-text-glow cursor-pointer"
        style={{
          borderColor: 'var(--color-terminal-amber)',
          color: 'var(--color-terminal-amber)',
          boxShadow: '0 0 15px var(--color-terminal-amber) inset, 0 0 15px var(--color-terminal-amber)',
        }}
      >
        &gt; [ INITIATE_MIXING_INTERFACE ]
      </button>
    </div>
  );
}
