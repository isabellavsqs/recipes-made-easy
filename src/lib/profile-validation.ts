// Checks the onboarding answers before they're saved (PLAN.md feature 8).
// Kept free of database code so it can be tested on its own.

import { COST_BRACKETS } from "@/lib/recipe-validation";

export const DIETS = ["none", "vegetarian", "vegan", "pescatarian"] as const;
export const START_PREFERENCES = ["meal prep", "single recipe"] as const;
export const MAX_GOALS = 3;
export const MAX_DISLIKES = 20;

export type DietType = (typeof DIETS)[number];
export type StartPreference = (typeof START_PREFERENCES)[number];

// The answers as sent by the form (all text).
export type ProfileFormValues = {
  goalIds: string[];
  diet: string;
  allergyIds: string[];
  dislikes: string[];
  applianceIds: string[];
  budget: string;
  startPreference: string;
};

// Clean answers ready to save.
export type ProfileInput = {
  goalIds: number[];
  diet: DietType;
  allergyIds: number[];
  dislikes: string[];
  applianceIds: number[];
  budget: string | null;
  startPreference: StartPreference | null;
};

export type ProfileResult = { ok: true; value: ProfileInput } | { ok: false; error: string };

function ids(values: string[]): number[] {
  return [...new Set(values.map(Number).filter((n) => Number.isInteger(n) && n > 0))];
}

export function validateProfile(form: ProfileFormValues): ProfileResult {
  const goalIds = ids(form.goalIds);
  if (goalIds.length > MAX_GOALS) {
    return { ok: false, error: `Please pick up to ${MAX_GOALS} goals.` };
  }

  const diet = (DIETS as readonly string[]).includes(form.diet) ? (form.diet as DietType) : "none";
  const budget = (COST_BRACKETS as readonly string[]).includes(form.budget) ? form.budget : null;
  const startPreference = (START_PREFERENCES as readonly string[]).includes(form.startPreference)
    ? (form.startPreference as StartPreference)
    : null;

  // Dislikes are free text: trim, drop blanks and repeats ("Onion" = "onion").
  const seen = new Set<string>();
  const dislikes: string[] = [];
  for (const raw of form.dislikes) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name || seen.has(name.toLowerCase())) continue;
    if (name.length > 50) return { ok: false, error: `"${name.slice(0, 20)}…" is too long for a dislike.` };
    seen.add(name.toLowerCase());
    dislikes.push(name);
  }
  if (dislikes.length > MAX_DISLIKES) {
    return { ok: false, error: `Please list up to ${MAX_DISLIKES} dislikes.` };
  }

  return {
    ok: true,
    value: {
      goalIds,
      diet,
      allergyIds: ids(form.allergyIds),
      dislikes,
      applianceIds: ids(form.applianceIds),
      budget,
      startPreference,
    },
  };
}
