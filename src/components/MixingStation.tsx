import React, { useState } from 'react';
import type { MixMethod, ServingGlass, Ingredient, MixingRecipe } from '../types/game';
import { BAR_INVENTORY } from '../data/bar-inventory';

interface MixingStationProps {
  onServe: (recipe: MixingRecipe) => void;
  onCancel: () => void;
}

export function MixingStation({ onServe, onCancel }: MixingStationProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [method, setMethod] = useState<MixMethod>('build');
  const [glassType, setGlassType] = useState<ServingGlass['type']>('rock');
  const [iceType, setIceType] = useState<ServingGlass['iceType']>('none');

  const totalVolume = ingredients.reduce((sum, ing) => sum + ing.volumeOz, 0);

  const handleAddIngredient = (invId: string) => {
    const invItem = BAR_INVENTORY.find((item) => item.id === invId);
    if (!invItem) return;

    setIngredients((prev) => {
      const existingIdx = prev.findIndex((ing) => ing.id === invId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], volumeOz: next[existingIdx].volumeOz + 0.5 };
        return next;
      }
      return [...prev, { id: invItem.id, name: invItem.name, volumeOz: 0.5 }];
    });
  };

  const handleReset = () => {
    setIngredients([]);
    setMethod('build');
    setGlassType('rock');
    setIceType('none');
  };

  const handleServe = () => {
    if (ingredients.length === 0) return;
    onServe({
      ingredients,
      method,
      glass: { type: glassType, iceType },
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-auto bg-black/80 backdrop-blur-md crt-scanlines"
      onClick={onCancel}
    >
      <div 
        className="flex w-full max-w-4xl flex-col border-2 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-black/95"
        style={{ borderColor: 'var(--color-terminal-amber)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex w-full items-center justify-between border-b-2 px-4 py-2" 
          style={{ borderColor: 'var(--color-terminal-amber)', backgroundColor: 'var(--color-terminal-amber)' }}
        >
          <div className="font-mono text-sm tracking-widest text-black font-bold uppercase">
            TERMINAL // MIXING_STATION_PROTOCOL
          </div>
          <button onClick={onCancel} className="font-mono text-sm tracking-widest text-black font-bold hover:opacity-70 uppercase cursor-pointer">
            [ ABORT ]
          </button>
        </div>

        {/* Main Interface */}
        <div className="flex flex-col md:flex-row h-auto md:h-[65vh] text-[var(--color-terminal-amber)] font-mono selection:bg-[var(--color-terminal-amber)] selection:text-black">
          
          {/* Left Column: Glass & Ice */}
          <div className="flex flex-col flex-1 border-r-2 p-4" style={{ borderColor: 'var(--color-terminal-amber)' }}>
            <h3 className="uppercase tracking-widest font-bold mb-4 border-b pb-2" style={{ borderColor: 'var(--color-terminal-amber)' }}>
              1. Vessel & Temp
            </h3>
            
            <div className="mb-6 flex-1">
              <div className="text-xs opacity-70 mb-2">GLASSWARE:</div>
              <div className="flex flex-col gap-2">
                {(['rock', 'martini', 'collins'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setGlassType(type)}
                    className={`border p-2 text-left transition-colors uppercase cursor-pointer ${glassType === type ? 'bg-[var(--color-terminal-amber)] text-black font-bold' : 'hover:bg-amber-900/30'}`}
                    style={{ borderColor: 'var(--color-terminal-amber)' }}
                  >
                    &gt; {type.padEnd(8, '_')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs opacity-70 mb-2">THERMAL_STATE (ICE):</div>
              <div className="flex flex-col gap-2">
                {(['none', 'cube', 'sphere'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setIceType(type)}
                    className={`border p-2 text-left transition-colors uppercase cursor-pointer ${iceType === type ? 'bg-[var(--color-terminal-amber)] text-black font-bold' : 'hover:bg-amber-900/30'}`}
                    style={{ borderColor: 'var(--color-terminal-amber)' }}
                  >
                    &gt; {type.padEnd(8, '_')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Column: Inventory */}
          <div className="flex flex-col flex-[1.5] border-r-2 p-4" style={{ borderColor: 'var(--color-terminal-amber)' }}>
            <h3 className="uppercase tracking-widest font-bold mb-4 border-b pb-2" style={{ borderColor: 'var(--color-terminal-amber)' }}>
              2. Compounds (+0.5oz/clk)
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-2">
              {BAR_INVENTORY.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddIngredient(item.id)}
                  className="flex flex-col items-center justify-center border-2 p-3 transition-colors group relative cursor-pointer"
                  style={{ 
                    borderColor: 'var(--color-text-dim)', 
                    backgroundColor: 'rgba(0,0,0,0.5)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-terminal-amber)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-text-dim)'; }}
                >
                  <div className="w-8 h-12 border-2 mb-2 flex items-end justify-center transition-colors" style={{ borderColor: 'var(--color-text-dim)' }}>
                    <div className="w-full" style={{ height: '50%', backgroundColor: item.colorHex, opacity: 0.9 }} />
                  </div>
                  <div className="text-xs font-bold truncate w-full text-center text-white">{item.name}</div>
                  <div className="text-[9px] opacity-60 uppercase">{item.id}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Active Mix & Method */}
          <div className="flex flex-col flex-1 p-4 bg-amber-950/20">
            <h3 className="uppercase tracking-widest font-bold mb-4 border-b pb-2" style={{ borderColor: 'var(--color-terminal-amber)' }}>
              3. Active Mixture
            </h3>
            
            <div className="flex items-end gap-4 mb-4">
              <div className="w-6 h-24 border-2 relative flex flex-col justify-end" style={{ borderColor: 'var(--color-terminal-amber)' }}>
                <div 
                  className="w-full bg-[var(--color-terminal-amber)] transition-all duration-300"
                  style={{ height: `${Math.min(100, (totalVolume / 6) * 100)}%` }} // Display up to 6oz visually
                />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold crt-text-glow">{totalVolume.toFixed(1)}</span>
                <span className="text-xs tracking-widest opacity-80">TOTAL_OZ</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 text-xs border p-2" style={{ borderColor: 'var(--color-text-dim)' }}>
              {ingredients.length === 0 ? (
                <span className="opacity-50" style={{ animation: 'cursorBlink 1.5s infinite' }}>AWAITING_INPUT...</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="flex justify-between border-b border-white/10 pb-1">
                      <span>{ing.name}</span>
                      <span className="font-bold text-white">{ing.volumeOz.toFixed(1)} oz</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="text-xs opacity-70 mb-2">TECHNIQUE:</div>
              <div className="flex gap-2">
                {(['build', 'stir', 'shake'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 border py-2 text-center text-xs transition-colors uppercase cursor-pointer ${method === m ? 'bg-[var(--color-terminal-amber)] text-black font-bold' : 'hover:bg-amber-900/30'}`}
                    style={{ borderColor: 'var(--color-terminal-amber)' }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mt-auto pt-4 border-t" style={{ borderColor: 'var(--color-terminal-amber)' }}>
              <button 
                onClick={handleReset}
                className="flex-1 border p-2 text-xs uppercase transition-colors cursor-pointer"
                style={{ borderColor: 'var(--color-text-dim)', color: 'var(--color-text-dim)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-dim)'; e.currentTarget.style.borderColor = 'var(--color-text-dim)'; }}
              >
                Reset
              </button>
              <button 
                onClick={handleServe}
                disabled={ingredients.length === 0}
                className="flex-[2] border-2 p-2 font-bold uppercase transition-all"
                style={{ 
                  borderColor: ingredients.length > 0 ? 'var(--color-terminal-amber)' : 'var(--color-text-dim)',
                  backgroundColor: ingredients.length > 0 ? 'var(--color-terminal-amber)' : 'transparent',
                  color: ingredients.length > 0 ? '#000' : 'var(--color-text-dim)',
                  cursor: ingredients.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {ingredients.length > 0 ? '> EXEC_SERVE' : 'NO_COMPOUND'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
