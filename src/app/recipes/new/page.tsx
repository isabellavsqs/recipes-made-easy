import type { Metadata } from "next";
import { getFormOptions } from "@/lib/recipes";
import { createRecipeAction } from "../actions";
import { EMPTY_RECIPE, RecipeForm } from "../recipe-form";

export const metadata: Metadata = { title: "Add recipe · Recipes Made Easy" };

export default async function NewRecipePage() {
  const { allergies, appliances } = await getFormOptions();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl">Add a recipe</h1>
      <RecipeForm
        action={createRecipeAction}
        initial={EMPTY_RECIPE}
        allergies={allergies}
        appliances={appliances}
        submitLabel="Save recipe"
        cancelHref="/recipes"
      />
    </main>
  );
}
