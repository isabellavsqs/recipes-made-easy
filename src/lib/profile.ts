import "server-only";
import { requireUser } from "@/lib/auth";
import { findOrCreateIngredients, type Option } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import type { DietType, ProfileInput, StartPreference } from "@/lib/profile-validation";

// The logged-in user's onboarding answers (PLAN.md feature 8).
export type Profile = {
  diet: DietType;
  budget: string | null;
  startPreference: StartPreference | null;
  onboardingCompleted: boolean;
  goals: Option[];
  allergies: Option[];
  appliances: Option[];
  dislikes: string[];
};

export async function getProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();
  const [profile, goals, allergies, appliances, dislikes] = await Promise.all([
    supabase
      .from("profiles")
      .select("diet_type, budget_bracket, start_preference, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_goals").select("goals (id, name)").eq("user_id", user.id),
    supabase.from("user_allergies").select("allergies (id, name)").eq("user_id", user.id),
    supabase.from("user_appliances").select("appliances (id, name)").eq("user_id", user.id),
    supabase.from("user_dislikes").select("ingredients (name)").eq("user_id", user.id),
  ]);
  for (const result of [profile, goals, allergies, appliances, dislikes]) {
    if (result.error) throw result.error;
  }

  // See getRecipe(): Supabase can't tell each link points to one row.
  const linked = <K extends string>(rows: unknown, key: K) =>
    (rows as Record<K, Option>[]).map((row) => row[key]).sort((a, b) => a.id - b.id);

  return {
    diet: (profile.data?.diet_type ?? "none") as DietType,
    budget: profile.data?.budget_bracket ?? null,
    startPreference: (profile.data?.start_preference ?? null) as StartPreference | null,
    onboardingCompleted: profile.data?.onboarding_completed ?? false,
    goals: linked(goals.data, "goals"),
    allergies: linked(allergies.data, "allergies"),
    appliances: linked(appliances.data, "appliances"),
    dislikes: (dislikes.data as unknown as { ingredients: { name: string } }[])
      .map((row) => row.ingredients.name)
      .sort((a, b) => a.localeCompare(b)),
  };
}

export type ProfileOptions = {
  goals: Option[];
  allergies: Option[];
  appliances: Option[];
  // Shared ingredient names (not staples), to suggest dislikes.
  ingredientNames: string[];
};

export async function getProfileOptions(): Promise<ProfileOptions> {
  await requireUser();
  const supabase = await createClient();
  const [goals, allergies, appliances, ingredients] = await Promise.all([
    supabase.from("goals").select("id, name").order("id"),
    supabase.from("allergies").select("id, name").order("id"),
    supabase.from("appliances").select("id, name").order("id"),
    supabase
      .from("ingredients")
      .select("name")
      .is("created_by_user_id", null)
      .eq("is_staple", false)
      .order("name"),
  ]);
  for (const result of [goals, allergies, appliances, ingredients]) {
    if (result.error) throw result.error;
  }
  return {
    goals: goals.data!,
    allergies: allergies.data!,
    appliances: appliances.data!,
    ingredientNames: ingredients.data!.map((i) => i.name),
  };
}

// Saves all answers and marks onboarding as done. The lists are replaced
// with what the form sent (so unticking something removes it). "Done" is
// saved last, so if anything fails the questionnaire can simply be retried.
export async function saveProfile(input: ProfileInput): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  // The lookup covers every ingredient the user can see, so pick out only
  // the ones they named.
  const lookup = input.dislikes.length
    ? await findOrCreateIngredients(input.dislikes, user.id)
    : new Map<string, number>();
  const dislikeIds = [...new Set(input.dislikes.map((name) => lookup.get(name.toLowerCase())!))];

  const lists = [
    { table: "user_goals", column: "goal_id", ids: input.goalIds },
    { table: "user_allergies", column: "allergy_id", ids: input.allergyIds },
    { table: "user_appliances", column: "appliance_id", ids: input.applianceIds },
    { table: "user_dislikes", column: "ingredient_id", ids: dislikeIds },
  ];
  for (const { table, column, ids } of lists) {
    const { error: deleteError } = await supabase.from(table).delete().eq("user_id", user.id);
    if (deleteError) throw deleteError;
    if (ids.length) {
      const { error } = await supabase
        .from(table)
        .insert(ids.map((id) => ({ user_id: user.id, [column]: id })));
      if (error) throw error;
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      diet_type: input.diet,
      budget_bracket: input.budget,
      start_preference: input.startPreference,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);
  if (profileError) throw profileError;
}
