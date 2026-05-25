import type { MixingRecipe, DrinkRule, RecipeCondition, EvaluationRule } from '../types/game';

function extractFieldValue(recipe: MixingRecipe, field: string): string | number | boolean | null | undefined {
  if (field === 'method') return recipe.method;
  if (field === 'glass.type') return recipe.glass.type;
  if (field === 'glass.iceType') return recipe.glass.iceType;
  if (field === 'garnish') return recipe.garnish;

  // Handle nested ingredient fields, e.g., 'ingredient.baijiu.volumeOz'
  if (field.startsWith('ingredient.')) {
    const parts = field.split('.');
    if (parts.length === 3 && parts[2] === 'volumeOz') {
      const ingredientId = parts[1];
      const found = recipe.ingredients.find(i => i.id === ingredientId);
      // If the ingredient is not in the recipe, its volume is 0
      return found ? found.volumeOz : 0;
    }
  }

  return null;
}

function evaluateCondition(recipe: MixingRecipe, condition: RecipeCondition): boolean {
  const actualValue = extractFieldValue(recipe, condition.field);
  const targetValue = condition.value;

  const actualNum = typeof actualValue === 'number' ? actualValue : Number(actualValue);
  const targetNum = typeof targetValue === 'number' ? targetValue : Number(targetValue);

  switch (condition.op) {
    case 'eq':
      return actualValue === targetValue;
    case 'neq':
      return actualValue !== targetValue;
    case 'gt':
      if (typeof actualValue !== 'number' || typeof targetValue !== 'number') return false;
      return actualNum > targetNum;
    case 'gte':
      if (typeof actualValue !== 'number' || typeof targetValue !== 'number') return false;
      return actualNum >= targetNum;
    case 'lt':
      if (typeof actualValue !== 'number' || typeof targetValue !== 'number') return false;
      return actualNum < targetNum;
    case 'lte':
      if (typeof actualValue !== 'number' || typeof targetValue !== 'number') return false;
      return actualNum <= targetNum;
    case 'includes':
      if (typeof actualValue !== 'string' || typeof targetValue !== 'string') return false;
      return actualValue.includes(targetValue);
    default:
      return false;
  }
}

/**
 * Parses a DrinkRule's evaluation rules against a submitted MixingRecipe.
 * Returns the first EvaluationRule that successfully matches the recipe, or null.
 */
export function evaluateDrink(recipe: MixingRecipe, rule: DrinkRule): EvaluationRule | null {
  for (const evalRule of rule.evaluationRules) {
    const isAll = evalRule.match === 'all';
    
    let matchSuccess = isAll ? true : false;

    // A fallback rule with no conditions always matches
    if (evalRule.conditions.length === 0) {
      return evalRule;
    }

    for (const condition of evalRule.conditions) {
      const res = evaluateCondition(recipe, condition);
      if (isAll) {
        if (!res) {
          matchSuccess = false;
          break; // One failed, the 'all' condition fails
        }
      } else {
        if (res) {
          matchSuccess = true;
          break; // One succeeded, the 'any' condition succeeds
        }
      }
    }

    if (matchSuccess) {
      return evalRule;
    }
  }
  
  return null;
}
