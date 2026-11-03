import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealPlan } from "@/lib/meal-plans";
import { totalTime } from "@/lib/recipe-search";
import { COST_NOTE, costLabel } from "@/lib/recipe-validation";
import { DeleteRecipeButton } from "../../recipes/[id]/delete-recipe-button";
import { formatQuantity } from "../../recipes/recipe-card";
import { RecipeImage } from "../../recipes/recipe-image";
import { createPlanAction, deletePlanAction } from "../actions";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Meal prep plan · Recipes Made Easy" };

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

function dayLabel(days: number[]) {
  return days.length === 1 ? `Day ${days[0]}` : `Days ${days[0]}–${days[days.length - 1]}`;
}

function scaleText(scale: number) {
  if (scale === 0.5) return "half the recipe";
  if (scale === 1) return "the recipe as written";
  if (scale === 2) return "double the recipe";
  if (scale === 3) return "triple the recipe";
  return `${formatQuantity(scale)} times the recipe`;
}

export default async function MealPlanPage(props: PageProps<"/meal-prep/[id]">) {
  const { id } = await props.params;
  const plan = Number.isInteger(Number(id)) ? await getMealPlan(Number(id)) : null;
  if (!plan) notFound();

  const cooking = plan.recipes.reduce((sum, r) => sum + (totalTime(r) ?? 0), 0);
  const longest = [...plan.recipes].sort((a, b) => (totalTime(b) ?? 0) - (totalTime(a) ?? 0))[0];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/meal-prep" className="mb-6 inline-block text-sm font-medium text-muted hover:text-foreground">
        ← Meal prep
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-2 font-serif text-3xl">Your meal prep plan</h1>
          <p className="text-muted">
            {plan.days} {plan.days === 1 ? "day" : "days"} · {plan.servings}{" "}
            {plan.servings === 1 ? "serving" : "servings"} per meal
            {cooking > 0 && <> · about {formatMinutes(cooking)} of cooking</>}
            {plan.budget && <> · up to {costLabel(plan.budget)} {COST_NOTE}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <PlanForm
            compact
            avoidIds={plan.recipes.map((r) => r.id)}
            action={createPlanAction}
            initial={{
              servings: String(plan.servings),
              days: String(plan.days),
              minutes: String(plan.minutes ?? 120),
              budget: plan.budget ?? "$$",
            }}
          />
          <DeleteRecipeButton kind="plan" title="this meal prep plan" action={deletePlanAction.bind(null, plan.id)} />
        </div>
      </div>

      {plan.recipes.length === 0 ? (
        <p className="text-muted">The recipes in this plan were deleted. Make a new plan instead.</p>
      ) : (
        <>
          {plan.recipes.length > 1 && longest && (
            <p className="mb-6 rounded-lg bg-primary/5 px-4 py-3 text-sm">
              <span className="font-medium">Tip:</span> start with {longest.title}, the longest one, and
              make the others while it cooks.
            </p>
          )}

          <ol className="mb-10 flex flex-col gap-4">
            {plan.recipes.map((recipe) => {
              const minutes = totalTime(recipe);
              const extra = Math.round((recipe.makes - recipe.portions) * 10) / 10;
              return (
                <li key={recipe.id} className="overflow-hidden rounded-2xl border border-line bg-white">
                  <div className="flex flex-col sm:flex-row">
                    <RecipeImage recipe={recipe} className="h-36 sm:h-auto sm:w-48 sm:shrink-0" />
                    <div className="flex flex-col gap-2 p-5">
                      <p className="text-sm font-medium text-primary">{dayLabel(recipe.days)}</p>
                      <h2 className="font-serif text-xl leading-snug">
                        <Link href={`/recipes/${recipe.id}`} className="hover:text-primary">
                          {recipe.title}
                        </Link>
                      </h2>
                      <p className="text-sm text-muted">
                        {[recipe.cuisine, minutes !== null && `${minutes} min`, recipe.cost_bracket]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p>
                        You need {recipe.portions} {recipe.portions === 1 ? "portion" : "portions"}: make{" "}
                        <span className="font-medium">{scaleText(recipe.scale)}</span> (makes {formatQuantity(recipe.makes)}
                        {extra > 0 && <>, {formatQuantity(extra)} extra</>}).
                      </p>
                      {recipe.dislikesFound.length > 0 && (
                        <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
                          Has {recipe.dislikesFound.join(" and ")}, which you&apos;d rather not eat. Leave{" "}
                          {recipe.dislikesFound.length === 1 ? "it" : "them"} out or swap in something you
                          like. Nothing else fit your plan.
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <section className="rounded-2xl border border-line bg-white p-6">
            <h2 className="mb-1 font-serif text-2xl">Shopping list</h2>
            <p className="mb-4 text-sm text-muted">Everything for the whole plan, already scaled.</p>
            <ul className="mb-6 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {plan.shopping.toBuy.map((item) => (
                <li key={`${item.name}|${item.unit}`} className="flex gap-2">
                  <span aria-hidden className="text-muted">
                    ☐
                  </span>
                  <span>
                    {item.quantity !== null && (
                      <span className="font-medium">
                        {formatQuantity(item.quantity)}
                        {item.unit ? ` ${item.unit}` : ""}{" "}
                      </span>
                    )}
                    {item.quantity === null && item.unit && <span className="font-medium">{item.unit} </span>}
                    {item.name}
                  </span>
                </li>
              ))}
            </ul>
            {plan.shopping.staples.length > 0 && (
              <p className="text-sm text-muted">
                <span className="font-medium text-foreground">Check you have: </span>
                {plan.shopping.staples.join(", ")}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
