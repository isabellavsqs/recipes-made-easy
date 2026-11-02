"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePlanRequest } from "@/lib/meal-plan-generator";
import { createMealPlan, deleteMealPlan } from "@/lib/meal-plans";

export type PlanFormValues = { servings: string; days: string; minutes: string; budget: string };
export type PlanFormState = { error?: string; values?: PlanFormValues };

export async function createPlanAction(_prev: PlanFormState, formData: FormData): Promise<PlanFormState> {
  const values: PlanFormValues = {
    servings: String(formData.get("servings") ?? ""),
    days: String(formData.get("days") ?? ""),
    minutes: String(formData.get("minutes") ?? ""),
    budget: String(formData.get("budget") ?? ""),
  };
  const result = validatePlanRequest(values);
  if (!result.ok) return { error: result.error, values };

  // A new seed each time, so "Make another plan" picks different recipes.
  const seed = Math.floor(Math.random() * 2 ** 31);
  let created: Awaited<ReturnType<typeof createMealPlan>>;
  try {
    // "Make another plan" sends the recipes of the plan on screen to avoid.
    const avoid = String(formData.get("avoid") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0);
    created = await createMealPlan(result.value, seed, avoid);
  } catch (error) {
    console.error("Creating meal plan failed:", error);
    return { error: "Something went wrong while making your plan. Please try again.", values };
  }
  if ("error" in created) return { error: created.error, values };

  // The dashboard counts meal plans.
  revalidatePath("/", "layout");
  redirect(`/meal-prep/${created.id}`);
}

export async function deletePlanAction(planId: number) {
  await deleteMealPlan(planId);
  revalidatePath("/", "layout");
  redirect("/meal-prep");
}
