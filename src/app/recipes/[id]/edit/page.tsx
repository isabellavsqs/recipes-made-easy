import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { RecipeFormValues } from "@/lib/recipe-validation";
import { getFormOptions, getRecipe } from "@/lib/recipes";
import { updateRecipeAction } from "../../actions";
import { RecipeForm } from "../../recipe-form";

export const metadata: Metadata = { title: "Edit recipe · Recipes Made Easy" };

export default async function EditRecipePage(props: PageProps<"/recipes/[id]/edit">) {
  const { id } = await props.params;
  const recipe = Number.isInteger(Number(id)) ? await getRecipe(Number(id)) : null;
  // Only the recipe's owner can edit it.
  if (!recipe || !recipe.isMine) notFound();

  const { allergies, appliances } = await getFormOptions();

  const initial: RecipeFormValues = {
    title: recipe.title,
    cuisine: recipe.cuisine ?? "",
    instructions: recipe.instructions,
    prep_minutes: recipe.prep_minutes?.toString() ?? "",
    cook_minutes: recipe.cook_minutes?.toString() ?? "",
    base_servings: String(recipe.base_servings),
    cost_bracket: recipe.cost_bracket ?? "",
    diet_tags: recipe.diet_tags,
    ingredients: recipe.ingredients.map((i) => ({
      name: i.name,
      quantity: i.quantity?.toString() ?? "",
      unit: i.unit ?? "",
    })),
    allergenIds: recipe.allergens.map((a) => a.id),
    applianceIds: recipe.appliances.map((a) => a.id),
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="mb-8 font-serif text-3xl">Edit recipe</h1>
      <RecipeForm
        action={updateRecipeAction.bind(null, recipe.id)}
        initial={initial}
        allergies={allergies}
        appliances={appliances}
        submitLabel="Save changes"
        cancelHref={`/recipes/${recipe.id}`}
      />
    </main>
  );
}
