import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes";
import { deleteRecipeAction } from "../actions";
import { totalMinutes } from "../recipe-card";
import { RecipeImage } from "../recipe-image";
import { DeleteRecipeButton } from "./delete-recipe-button";

export const metadata: Metadata = { title: "Recipe · Recipes Made Easy" };

export default async function RecipePage(props: PageProps<"/recipes/[id]">) {
  const { id } = await props.params;
  const recipe = Number.isInteger(Number(id)) ? await getRecipe(Number(id)) : null;
  if (!recipe) notFound();

  const minutes = totalMinutes(recipe);
  const facts = [
    recipe.cuisine && { label: "Cuisine", value: recipe.cuisine },
    { label: "Servings", value: String(recipe.base_servings) },
    recipe.prep_minutes !== null && { label: "Prep", value: `${recipe.prep_minutes} min` },
    recipe.cook_minutes !== null && { label: "Cook", value: `${recipe.cook_minutes} min` },
    minutes !== null && { label: "Total", value: `${minutes} min` },
    recipe.cost_bracket && { label: "Cost", value: recipe.cost_bracket },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link
        href={recipe.isMine ? "/recipes" : "/home"}
        className="mb-6 inline-block text-sm font-medium text-muted hover:text-foreground"
      >
        ← {recipe.isMine ? "My Recipes" : "Back"}
      </Link>

      <article className="overflow-hidden rounded-2xl border border-line bg-white">
        <RecipeImage recipe={recipe} className="h-56 sm:h-72" />

        <div className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{recipe.title}</h1>
            {recipe.isMine && (
              <div className="flex gap-2">
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="rounded-full border border-line px-4 py-1.5 text-sm font-medium transition hover:border-primary"
                >
                  Edit
                </Link>
                <DeleteRecipeButton
                  title={recipe.title}
                  action={deleteRecipeAction.bind(null, recipe.id)}
                />
              </div>
            )}
          </div>

          {recipe.diet_tags.length > 0 && (
            <ul className="mb-4 flex flex-wrap gap-2">
              {recipe.diet_tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-primary/10 px-3 py-0.5 text-sm capitalize text-primary"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <dl className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-muted">{fact.label}</dt>
                <dd className="font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-8 sm:grid-cols-[1fr_1.6fr]">
            <section>
              <h2 className="mb-3 font-serif text-xl">Ingredients</h2>
              <ul className="flex flex-col gap-1.5">
                {recipe.ingredients.map((ingredient) => (
                  <li key={ingredient.name}>
                    {ingredient.quantity !== null && (
                      <span className="font-medium">{ingredient.quantity} </span>
                    )}
                    {ingredient.unit && <span className="font-medium">{ingredient.unit} </span>}
                    {ingredient.name}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 font-serif text-xl">Instructions</h2>
              <p className="whitespace-pre-line leading-relaxed">{recipe.instructions}</p>
            </section>
          </div>

          {(recipe.allergens.length > 0 || recipe.appliances.length > 0) && (
            <div className="mt-8 flex flex-col gap-2 border-t border-line pt-6 text-sm">
              {recipe.allergens.length > 0 && (
                <p>
                  <span className="text-muted">Contains: </span>
                  {recipe.allergens.map((a) => a.name).join(", ")}
                </p>
              )}
              {recipe.appliances.length > 0 && (
                <p>
                  <span className="text-muted">Appliances: </span>
                  {recipe.appliances.map((a) => a.name).join(", ")}
                </p>
              )}
            </div>
          )}

          {recipe.source_url && (
            <p className="mt-6 text-sm text-muted">
              Adapted from{" "}
              <a href={recipe.source_url} className="underline" target="_blank" rel="noreferrer">
                the original recipe
              </a>
              {recipe.image_credit && <> · Photo: {recipe.image_credit}</>}
            </p>
          )}
        </div>
      </article>
    </main>
  );
}
