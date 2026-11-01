"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { deleteRecipe, saveRecipe } from "@/lib/recipes";
import { starRecipe, unstarRecipe } from "@/lib/stars";
import {
  validateRecipe,
  type RecipeErrors,
  type RecipeFormValues,
} from "@/lib/recipe-validation";

export type RecipeFormState = {
  error?: string;
  errors?: RecipeErrors;
  // What was submitted, so the form can show it again after an error.
  values?: RecipeFormValues;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function all(formData: FormData, key: string): string[] {
  return formData.getAll(key).map(String);
}

function readRecipeForm(formData: FormData): RecipeFormValues {
  const names = all(formData, "ingredient_name");
  const quantities = all(formData, "ingredient_quantity");
  const units = all(formData, "ingredient_unit");

  return {
    title: text(formData, "title"),
    cuisine: text(formData, "cuisine"),
    instructions: text(formData, "instructions"),
    prep_minutes: text(formData, "prep_minutes"),
    cook_minutes: text(formData, "cook_minutes"),
    base_servings: text(formData, "base_servings"),
    cost_bracket: text(formData, "cost_bracket"),
    diet_tags: all(formData, "diet_tags"),
    ingredients: names.map((name, i) => ({
      name,
      quantity: quantities[i] ?? "",
      unit: units[i] ?? "",
    })),
    allergenIds: all(formData, "allergen_ids").map(Number),
    applianceIds: all(formData, "appliance_ids").map(Number),
  };
}

async function save(
  formData: FormData,
  recipeId?: number,
): Promise<RecipeFormState> {
  const values = readRecipeForm(formData);
  const result = validateRecipe(values);
  if (!result.ok) {
    return {
      error: "Some details are missing. Please check the highlighted fields.",
      errors: result.errors,
      values,
    };
  }

  let id: number;
  try {
    id = await saveRecipe(result.value, recipeId);
  } catch (error) {
    console.error("Saving recipe failed:", error);
    return {
      error: "Something went wrong while saving. Please try again.",
      values,
    };
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

// Stars or unstars a recipe. `star` is the state the user sees after their
// click (not "flip it"), so the saved star always matches the screen.
export async function setStarAction(recipeId: number, star: boolean) {
  if (star) {
    if (!(await starRecipe(recipeId))) notFound();
  } else {
    await unstarRecipe(recipeId);
  }
  // Refresh the list, the starred view and the recipe pages.
  revalidatePath("/recipes", "layout");
}
