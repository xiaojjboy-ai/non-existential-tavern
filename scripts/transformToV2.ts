/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapChineseIngredientToId(name: string) {
  if (name.includes('威士忌')) return 'whisky';
  if (name.includes('白酒') || name.includes('烈酒')) return 'baijiu';
  if (name.includes('金酒')) return 'gin';
  if (name.includes('柠檬')) return 'lemon';
  if (name.includes('苏打') || name.includes('水')) return 'soda';
  return 'soda';
}

export function transformToV2(allPlots: any) {
  for (const plotId of Object.keys(allPlots)) {
    const plot = allPlots[plotId];
    
    // Transform Commands to V2 format
    plot.commands = plot.commands.map((cmd: any, i: number) => {
      const type = cmd.type;
      const rawParams = cmd.params || '';
      const parts = typeof rawParams === 'string' ? rawParams.split(/\s+/) : [];
      let params = cmd.params;
      
      if (typeof rawParams === 'string') {
        switch (type) {
          case 'BG': params = { assetId: parts[0], transition: parts[1] || 'none' }; break;
          case 'BGM': params = { assetId: parts[0], action: 'play' }; break;
          case 'SE': params = { assetId: parts[0] }; break;
          case 'LIGHT': params = { color: parts[0], intensity: 1, description: rawParams }; break;
          case 'PROP': params = { propId: parts[0], action: parts[1] || 'show' }; break;
          case 'ENTER': params = { characterId: parts[0]||'', poseId: parts[1]||'normal', position: parts[2]||'center' }; break;
          case 'EXIT': params = { characterId: rawParams }; break;
          case 'EMO': params = { characterId: parts[0]||'', emoId: parts[1]||'' }; break;
          case 'PAUSE': params = { durationMs: parseInt(rawParams)||1000 }; break;
          case 'GOTO': params = { targetNodeId: rawParams }; break;
          case 'CHOICE': params = { choiceId: rawParams }; break;
          case 'END': params = {}; break;
        }
      }
      return { id: `cmd_${i}`, type, params, raw: cmd.raw };
    });

    // Transform Branches
    if (plot.branches) {
      for (const branchId of Object.keys(plot.branches)) {
        for (const choiceKey of Object.keys(plot.branches[branchId])) {
          const old = plot.branches[branchId][choiceKey];
          plot.branches[branchId][choiceKey] = {
            gotoNodeId: old.goto,
            pace: old.pace,
            ending: old.ending,
            effects: old.effect ? (Array.isArray(old.effect) ? old.effect : [old.effect]) : []
          };
        }
      }
    }

    // Transform DrinkRule to V2
    if (plot.drink) {
      const legacy = plot.drink;
      const rules = [];
      if (legacy.correct_effect) {
        rules.push({
          id: 'correct',
          conditions: [{ field: `ingredient.${mapChineseIngredientToId(legacy.correct)}.volumeOz`, op: 'gt', value: 0 }],
          match: 'all',
          gotoNodeId: legacy.correct_effect.dialogue || '',
          affinityEffect: null
        });
      }
      if (legacy.wrong_effects) {
        for (const [k, v] of Object.entries(legacy.wrong_effects)) {
          rules.push({
            id: k,
            conditions: [{ field: `ingredient.${mapChineseIngredientToId(k)}.volumeOz`, op: 'gt', value: 0 }],
            match: 'all',
            gotoNodeId: (v as any).dialogue || '',
            affinityEffect: null
          });
        }
      }
      plot.drink = {
        id: legacy.id,
        correctRecipe: { ingredients: [{ id: mapChineseIngredientToId(legacy.correct), name: legacy.correct, volumeOz: 1 }], method: 'build', glass: { type: 'rock', iceType: 'none'} },
        hints: [ legacy.hint || '' ],
        evaluationRules: rules
      };
    }
  }
}
