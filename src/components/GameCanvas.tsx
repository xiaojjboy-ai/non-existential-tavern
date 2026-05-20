'use client';

import { Application, extend } from '@pixi/react';
import { Container, Graphics, Text } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/useGameStore';

extend({ Container, Graphics, Text });

const BG_CONFIG: Record<string, { main: string; accent: string }> = {
  tavern_night_rain: { main: '#0a0a12', accent: '#1a1a2e' },
  tavern_night_rain_empty: { main: '#05050a', accent: '#0f0f1a' },
  default: { main: '#101010', accent: '#1a1a1a' },
};

const CHARACTER_COLORS: Record<string, string> = {
  Lendro: '#334155',
  '酒保': '#475569',
  System: '#1e293b',
};

export const GameCanvas = () => {
  const { getCurrentNode, runtime } = useGameStore();
  const node = getCurrentNode();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [time, setTime] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setDimensions({ width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) });
        return;
      }

      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    let frameId: number;
    const animate = () => {
      setTime((current) => current + 0.05);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, []);

  const bgId = runtime.backgroundId ?? 'default';
  const config = BG_CONFIG[bgId] ?? BG_CONFIG.default;
  const actor = node?.actor;
  const actorColor = actor ? CHARACTER_COLORS[actor] ?? '#2d3748' : '#2d3748';

  return (
    <div ref={containerRef} className="fixed inset-0 z-0 overflow-hidden bg-[#05050a]">
      <Application
        resizeTo={containerRef}
        background={config.main}
        antialias
        className="h-full w-full"
      >
        <pixiContainer>
          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              graphics.fill({ color: config.accent, alpha: 0.2 });
              graphics.rect(0, dimensions.height * 0.7, dimensions.width, dimensions.height * 0.3);

              const neonAlpha = 0.3 + Math.sin(time) * 0.1;
              graphics.fill({ color: '#38bdf8', alpha: neonAlpha });
              graphics.rect(0, dimensions.height * 0.7, dimensions.width, 2);
            }}
          />

          {actor && actor !== '旁白' && (
            <pixiContainer
              x={dimensions.width / 2}
              y={dimensions.height / 2 + Math.sin(time * 0.5) * 5}
            >
              <pixiGraphics
                draw={(graphics) => {
                  graphics.clear();
                  graphics.fill({ color: actorColor, alpha: 0.3 });
                  graphics.ellipse(0, 50, 80, 200);

                  graphics.fill({ color: actorColor, alpha: 0.8 });
                  graphics.moveTo(-60, 200);
                  graphics.lineTo(-40, -100);
                  graphics.bezierCurveTo(-30, -150, 30, -150, 40, -100);
                  graphics.lineTo(60, 200);
                  graphics.closePath();
                }}
              />
            </pixiContainer>
          )}

          <pixiGraphics
            draw={(graphics) => {
              graphics.clear();
              graphics.fill({ color: '#000000', alpha: 0.1 });
              graphics.rect(0, 0, dimensions.width, dimensions.height);
            }}
          />

          <pixiText
            text={`Ambient: ${bgId}`}
            x={20}
            y={dimensions.height - 40}
            alpha={0.2}
            style={{ fill: 0xffffff, fontSize: 10 }}
          />

          <pixiText
            text={actor && actor !== '旁白' ? String(actor).toUpperCase() : ''}
            x={dimensions.width / 2}
            y={dimensions.height / 2 + 240}
            anchor={0.5}
            alpha={0.5}
            style={{ fill: 0xffffff, fontSize: 14, fontWeight: 'bold', letterSpacing: 4 }}
          />
        </pixiContainer>
      </Application>
    </div>
  );
};
