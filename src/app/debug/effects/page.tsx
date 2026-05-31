'use client';

import { useState } from 'react';

type EffectType = 'shake' | 'glitch' | 'flash' | 'freeze' | 'gunshot';

const effects: EffectType[] = ['shake', 'glitch', 'flash', 'freeze', 'gunshot'];

export default function EffectsDebugPage() {
  const [activeEffect, setActiveEffect] = useState<EffectType | null>(null);
  const [triggerKey, setTriggerKey] = useState(0);
  const [showFlash, setShowFlash] = useState(false);

  const triggerEffect = (effect: EffectType) => {
    setActiveEffect(effect);
    setTriggerKey((prev) => prev + 1);

    if (effect === 'gunshot') {
      setShowFlash(true);
      window.setTimeout(() => setShowFlash(false), 420);
      return;
    }

    setShowFlash(false);
  };

  const effectClass = activeEffect ? `effect-${activeEffect}` : '';

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--color-crt-base)] text-[var(--color-text-main)] crt-screen crt-scanlines crt-aberration">
      {showFlash && (
        <div
          key={`flash-${triggerKey}`}
          className="pointer-events-none fixed inset-0 z-50 mix-blend-color-dodge animate-gunshot-flash"
        />
      )}

      <div className="relative z-10 flex h-screen flex-col items-center justify-center gap-16 p-8">
        <div className="z-20 flex flex-wrap justify-center gap-4 rounded-xl border-2 border-[var(--color-terminal-amber)]/50 bg-black/70 p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
          <div className="mb-2 w-full border-b border-[var(--color-terminal-amber)]/30 pb-2 text-center font-mono text-sm font-bold tracking-widest text-[var(--color-terminal-amber)] opacity-70">
            V3 EFFECT DEBUGGER PANEL
          </div>

          {effects.map((effect) => (
            <button
              key={effect}
              onClick={() => triggerEffect(effect)}
              className="border-2 border-[var(--color-terminal-amber)] px-6 py-3 font-mono text-base font-bold uppercase tracking-widest text-[var(--color-terminal-amber)] transition-all duration-75 hover:bg-[var(--color-terminal-amber)] hover:text-black hover:shadow-[0_0_20px_var(--color-terminal-amber)] active:scale-90 active:bg-white"
            >
              [ {effect} ]
            </button>
          ))}
        </div>

        <div
          key={triggerKey}
          className={`relative flex w-[min(92vw,1040px)] flex-col rounded-2xl border transition-none ${effectClass}`}
          style={{
            backgroundColor: 'rgba(10, 10, 10, 0.82)',
            borderColor: 'rgba(229, 169, 59, 0.75)',
            boxShadow: '0 18px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(229,169,59,0.18) inset',
            backdropFilter: 'blur(6px)',
            willChange: 'transform, filter, clip-path',
          }}
        >
          <div className="flex w-full items-center px-4 py-1" style={{ backgroundColor: 'var(--color-terminal-amber)' }}>
            <span className="font-mono text-[10px] font-bold tracking-widest text-[#0a0a0a]">
              TERMINAL // DATA_STREAM_ACTIVE
            </span>
          </div>

          <div
            className="mt-4 mb-3 self-start font-mono font-bold uppercase tracking-widest crt-text-glow"
            style={{
              fontSize: '1.2rem',
              color: 'var(--color-terminal-amber)',
              borderBottom: '2px solid var(--color-terminal-amber)',
              paddingBottom: '4px',
              marginLeft: 'clamp(1rem, 3vw, 2rem)',
              marginRight: 'clamp(1rem, 3vw, 2rem)',
            }}
          >
            Lendro
          </div>

          <div
            className="mb-8 min-h-[72px] whitespace-pre-wrap text-base leading-relaxed"
            style={{
              fontFamily: 'var(--font-noto)',
              lineHeight: '1.85',
              fontSize: '1.15rem',
              color: 'var(--color-foreground)',
              textShadow: '0 0 2px var(--color-text-dim)',
              paddingLeft: 'clamp(1rem, 3vw, 2rem)',
              paddingRight: 'clamp(1rem, 3vw, 2rem)',
            }}
          >
            你在跟我聊深渊？上周我在东区水沟里捞起来的那具无名尸，也跟我念叨这个。
            <br />
            <br />
            他嘴里塞满了烂泥，还没你这学者斯文。
          </div>
        </div>
      </div>
    </main>
  );
}
