'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';

/**
 * V3 交互层组件
 * 独立于对话框，挂载在吧台区域内。
 * 监听 activeInteraction，渲染对应的交互 UI（拖拽小游戏等）。
 */
export function InteractionLayer() {
  const { activeInteraction, completeInteraction } = useGameStore();
  const [matchedItems, setMatchedItems] = useState<Set<string>>(new Set());
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  const interaction = activeInteraction;

  const handleDragStart = useCallback((itemId: string) => {
    setDraggedItemId(itemId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // 添加拖拽经过样式
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (!draggedItemId || !interaction?.items) return;

    const item = interaction.items.find((i) => i.id === draggedItemId);
    if (item && item.targetZoneId === zoneId) {
      // 拖拽正确
      setMatchedItems((prev) => {
        const next = new Set(prev);
        next.add(draggedItemId);
        return next;
      });

      // 检查是否所有物件都已放置
      const allMatched = interaction.items.every((i) => 
        matchedItems.has(i.id) || i.id === draggedItemId
      );
      if (allMatched) {
        // 所有物件就位，交互成功
        setTimeout(() => completeInteraction(true), 300);
      }
    }
    setDraggedItemId(null);
  }, [draggedItemId, interaction, matchedItems, completeInteraction]);

  // 鼠标跟随拖拽（备选方案，用于不支持原生 Drag API 的场景）
  const handleMouseDown = useCallback((itemId: string) => {
    setDraggedItemId(itemId);
  }, []);

  const handleMouseUpInZone = useCallback((zoneId: string) => {
    if (!draggedItemId || !interaction?.items) return;

    const item = interaction.items.find((i) => i.id === draggedItemId);
    if (item && item.targetZoneId === zoneId) {
      setMatchedItems((prev) => {
        const next = new Set(prev);
        next.add(draggedItemId!);
        return next;
      });

      const allMatched = interaction.items.every((i) =>
        matchedItems.has(i.id) || i.id === draggedItemId
      );
      if (allMatched) {
        setTimeout(() => completeInteraction(true), 300);
      }
    }
    setDraggedItemId(null);
  }, [draggedItemId, interaction, matchedItems, completeInteraction]);

  if (!interaction) return null;

  // 只有 drag_and_drop 类型有完整 UI，其他类型显示等待提示
  if (interaction.kind === 'drag_and_drop' && interaction.items && interaction.zones) {
    return (
      <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto">
        <div className="text-center">
          <div className="font-mono text-sm tracking-widest text-[var(--color-terminal-amber)] crt-text-glow mb-4">
            {interaction.label}
          </div>
          
          {/* 拖拽物件 */}
          <div className="flex gap-4 mb-6 justify-center">
            {interaction.items.map((item) => {
              const isMatched = matchedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  draggable={!isMatched}
                  onDragStart={() => handleDragStart(item.id)}
                  onMouseDown={() => handleMouseDown(item.id)}
                  className={`drag-item rounded border-2 px-4 py-3 font-mono text-sm ${
                    isMatched ? 'opacity-40 pointer-events-none' : 'border-[var(--color-terminal-amber)] text-[var(--color-terminal-amber)]'
                  }`}
                  style={{
                    backgroundColor: isMatched ? 'oklch(0.2 0.05 140 / 0.2)' : 'oklch(0.15 0.03 30 / 0.8)',
                  }}
                >
                  {item.label}
                </div>
              );
            })}
          </div>

          {/* 目标区域 */}
          <div className="flex gap-6 justify-center">
            {interaction.zones.map((zone) => (
              <div
                key={zone.id}
                onDragOver={(e) => handleDragOver(e)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, zone.id)}
                onMouseUp={() => handleMouseUpInZone(zone.id)}
                className="drop-zone rounded-lg px-8 py-6 min-w-[120px] text-center font-mono text-xs text-[var(--color-text-dim)]"
              >
                {zone.label}
              </div>
            ))}
          </div>

          {/* 跳过按钮 */}
          <button
            onClick={() => completeInteraction(false)}
            className="mt-6 font-mono text-[10px] text-[var(--color-text-dim)] hover:text-[var(--color-terminal-amber)] transition-colors"
          >
            [ SKIP_INTERACTION ]
          </button>
        </div>
      </div>
    );
  }

  // 其他交互类型 — 显示等待提示
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto">
      <div className="text-center">
        <div className="font-mono text-sm tracking-widest text-[var(--color-terminal-amber)] crt-text-glow mb-2">
          {interaction.label}
        </div>
        <div className="font-mono text-[10px] text-[var(--color-text-dim)]">
          INTERACTION_TYPE: {interaction.kind}
        </div>
        <button
          onClick={() => completeInteraction(true)}
          className="mt-4 font-mono text-xs text-[var(--color-terminal-amber)] border border-[var(--color-terminal-amber)] px-3 py-1 rounded hover:bg-[var(--color-terminal-amber)] hover:text-black transition-colors"
        >
          [ COMPLETE ]
        </button>
      </div>
    </div>
  );
}
