// Checks the recipe form before anything is saved (PLAN.md feature 4).
// Kept free of database code so it can be tested on its own.

export const COST_BRACKETS = ["$", "$$", "$$$"] as const;
export const DIET_TAGS = ["vegan", "vegetarian", "pescatarian"] as const;

export const MAX_SERVINGS = 100;
export const MAX_MINUTES = 24 * 60;

// The form exactly as typed (all text), so it can be shown again on errors.
export type RecipeFormValues = {
  title: string;
  cuisine: string;
  instructions: string;
  prep_minutes: string;
  cook_minutes: string;
  base_servings: string;
  cost_bracket: string;
  diet_tags: string[];
  ingredients: { name: string; quantity: string; unit: string }[];
  allergenIds: number[];
  applianceIds: number[];
};

// Clean, typed values ready to save.
export type RecipeInput = {
  title: string;
  cuisine: string | null;
  instructions: string;
  prep_minutes: number | null;
  cook_minutes: number | null;
  base_servings: number;
  cost_bracket: string | null;
  diet_tags: string[];
  ingredients: { name: string; quantity: number | null; unit: string | null }[];
  allergenIds: number[];
  applianceIds: number[];
};

export type RecipeField =
  | "title"
  | "base_servings"
  | "prep_minutes"
  | "cook_minutes"
  | "ingredients"
  | "instructions";

export type RecipeErrors = Partial<Record<RecipeField, string>>;

export type ValidationResult =
  | { ok: true; value: RecipeInput }
  | { ok: false; errors: RecipeErrors };

function isWholeNumber(text: string) {
  return /^\d+$/.test(text);
}

function optionalMinutes(text: string, label: string): number | null | string {
  if (text === "") return null;
  if (!isWholeNumber(text) || Number(text) > MAX_MINUTES) {
    return `${label} should be a whole number of minutes, like 15.`;
  }
  return Number(text);
}

export function validateRecipe(form: RecipeFormValues): ValidationResult {
  const errors: RecipeErrors = {};

  const title = form.title.trim();
  if (!title) errors.title = "Please give your recipe a title.";

  const servingsText = form.base_servings.trim();
  if (!servingsText) {
    errors.base_servings = "Please say how many servings this makes.";
  } else if (
    !isWholeNumber(servingsText) ||
    Number(servingsText) < 1 ||
    Number(servingsText) > MAX_SERVINGS
  ) {
    errors.base_servings = `Servings should be a whole number from 1 to ${MAX_SERVINGS}.`;
  }

  const prep = optionalMinutes(form.prep_minutes.trim(), "Prep time");
  if (typeof prep === "string") errors.prep_minutes = prep;
  const cook = optionalMinutes(form.cook_minutes.trim(), "Cook time");
  if (typeof cook === "string") errors.cook_minutes = cook;

  // Rows left completely empty are ignored.
  const rows = form.ingredients
    .map((row) => ({
      name: row.name.trim(),
      quantity: row.quantity.trim(),
      unit: row.unit.trim(),
    }))
    .filter((row) => row.name || row.quantity || row.unit);

  const ingredientProblems: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, i) => {
    const label = `Ingredient ${i + 1}`;
    if (!row.name) {
      ingredientProblems.push(`${label} needs a name.`);
    } else if (seen.has(row.name.toLowerCase())) {
      ingredientProblems.push(`"${row.name}" is listed twice.`);
    }
    seen.add(row.name.toLowerCase());
    if (row.quantity && !(Number(row.quantity) > 0)) {
      ingredientProblems.push(`${label}'s amount should be a number, like 2 or 0.5.`);
    }
  });
  if (rows.length === 0) {
    errors.ingredients = "Please add at least one ingredient.";
  } else if (ingredientProblems.length) {
    errors.ingredients = ingredientProblems.join(" ");
  }

  const instructions = form.instructions.trim();
  if (!instructions) errors.instructions = "Please add the steps to make it.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const cost = form.cost_bracket.trim();
  return {
    ok: true,
    value: {
      title,
      cuisine: form.cuisine.trim() || null,
      instructions,
      prep_minutes: prep as number | null,
      cook_minutes: cook as number | null,
      base_servings: Number(servingsText),
      cost_bracket: (COST_BRACKETS as readonly string[]).includes(cost) ? cost : null,
      diet_tags: form.diet_tags.filter((tag) =>
        (DIET_TAGS as readonly string[]).includes(tag),
      ),
      ingredients: rows.map((row) => ({
        name: row.name,
        quantity: row.quantity ? Number(row.quantity) : null,
        unit: row.unit || null,
      })),
      allergenIds: form.allergenIds,
      applianceIds: form.applianceIds,
    },
  };
}
