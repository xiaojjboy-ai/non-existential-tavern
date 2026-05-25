import { evaluateDrink } from '../src/engine/DrinkEvaluator';
import type { MixingRecipe, DrinkRule } from '../src/types/game';

const recipe: MixingRecipe = {
  ingredients: [
    { id: 'baijiu', name: '白酒', volumeOz: 2 }
  ],
  method: 'build',
  glass: { type: 'rock', iceType: 'none' },
};

const rule: DrinkRule = {
  id: 'drink_01_01',
  correctRecipe: {
    ingredients: [{ id: 'baijiu', name: '白酒', volumeOz: 2 }],
    method: 'build',
    glass: { type: 'rock', iceType: 'none' },
  },
  hints: [],
  evaluationRules: [
    {
      id: 'rule_1',
      match: 'all',
      conditions: [
        { field: 'ingredient.baijiu.volumeOz', op: 'gte', value: 1.5 },
        { field: 'method', op: 'eq', value: 'build' }
      ],
      gotoNodeId: 'dlg_correct',
      affinityEffect: null
    },
    {
      id: 'rule_2_fallback',
      match: 'all',
      conditions: [],
      gotoNodeId: 'dlg_wrong',
      affinityEffect: null
    }
  ]
};

const res = evaluateDrink(recipe, rule);
if (res && res.id === 'rule_1') {
  console.log('Test PASSED: Successfully matched rule_1 with complex rules!');
} else {
  console.error('Test FAILED! Expected rule_1, got:', res);
  process.exit(1);
}
