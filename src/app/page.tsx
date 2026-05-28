'use client';

import { useState } from 'react';
import { GameCanvas } from '@/components/GameCanvas';
import { MixingStation } from '@/components/MixingStation';
import { useGameStore } from '@/store/useGameStore';
import { ChoiceMenu } from '@/components/ChoiceMenu';
import { DebugPanel } from '@/components/DebugPanel';
import { DialogueBox } from '@/components/DialogueBox';
import { DrinkPrompt } from '@/components/DrinkPrompt';

export default function Home() {
  const {
    currentPlotId,
    currentNodeId,
    getAllPlots,
    getCurrentNode,
    getCurrentPlot,
    handleDrinkMix,
    setPlot,
  } = useGameStore();
  
  const [isMixingActive, setIsMixingActive] = useState(false);
  const node = getCurrentNode();
  const plot = getCurrentPlot();

  // 如果找不到当前节点或数据加载失败，提供后备界面
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
      {/* 独立的演出表现模块：立绘、背景切换 */}
      <GameCanvas />
      
      <main className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-12 pointer-events-none select-none crt-scanlines crt-screen crt-aberration">
        {/* 顶部 VCR/HUD 沉浸式状态栏 (纯展示层) */}
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

        {/* 独立的对话框模块，内部嵌套了分支选项与调酒触发器 */}
        <DialogueBox>
          <ChoiceMenu />
          {!isMixingActive && <DrinkPrompt onActivate={() => setIsMixingActive(true)} />}
        </DialogueBox>

        {/* 独立的调酒台交互模块 */}
        {isMixingActive && (
          <MixingStation 
            onCancel={() => setIsMixingActive(false)} 
            onServe={(recipe) => {
              setIsMixingActive(false);
              handleDrinkMix(recipe);
            }} 
          />
        )}

        {/* 独立的调试面板模块 (可以随时拿掉) */}
        <DebugPanel />
      </main>
    </>
  );
}
