"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  COST_BRACKETS,
  DIET_TAGS,
  deleteRecipe,
  saveRecipe,
  type RecipeInput,
} from "@/lib/recipes";

export type RecipeFormState = { error?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optionalText(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  return value === "" ? null : Number(value);
}

function ids(formData: FormData, key: string): number[] {
  return formData.getAll(key).map(Number);
}

function readRecipeForm(formData: FormData): RecipeInput {
  const names = formData.getAll("ingredient_name").map((v) => String(v).trim());
  const quantities = formData.getAll("ingredient_quantity").map((v) => String(v).trim());
  const units = formData.getAll("ingredient_unit").map((v) => String(v).trim());

  const ingredients = names
    .map((name, i) => ({
      name,
      quantity: quantities[i] ? Number(quantities[i]) : null,
      unit: units[i] || null,
    }))
    .filter((ingredient) => ingredient.name !== "");

  const cost = text(formData, "cost_bracket");

  return {
    title: text(formData, "title"),
    cuisine: optionalText(formData, "cuisine"),
    instructions: text(formData, "instructions"),
    prep_minutes: optionalNumber(formData, "prep_minutes"),
    cook_minutes: optionalNumber(formData, "cook_minutes"),
    base_servings: Number(text(formData, "base_servings")),
    cost_bracket: (COST_BRACKETS as readonly string[]).includes(cost) ? cost : null,
    diet_tags: formData
      .getAll("diet_tags")
      .map(String)
      .filter((tag) => (DIET_TAGS as readonly string[]).includes(tag)),
    ingredients,
    allergenIds: ids(formData, "allergen_ids"),
    applianceIds: ids(formData, "appliance_ids"),
  };
}

async function save(
  formData: FormData,
  recipeId?: number,
): Promise<RecipeFormState> {
  let id: number;
  try {
    id = await saveRecipe(readRecipeForm(formData), recipeId);
  } catch (error) {
    console.error("Saving recipe failed:", error);
    return { error: "Something went wrong while saving. Please try again." };
  }
  revalidatePath("/recipes");
  redirect(`/recipes/${id}`);
}

export async function createRecipeAction(
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  return save(formData);
}

export async function updateRecipeAction(
  recipeId: number,
  _prev: RecipeFormState,
  formData: FormData,
): Promise<RecipeFormState> {
  return save(formData, recipeId);
}

export async function deleteRecipeAction(recipeId: number) {
  await deleteRecipe(recipeId);
  revalidatePath("/recipes");
  redirect("/recipes");
}
