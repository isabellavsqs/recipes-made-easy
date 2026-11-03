import type { Metadata } from "next";
import Link from "next/link";
import { getProfileOptions } from "@/lib/profile";
import { totalTime } from "@/lib/recipe-search";
import { getSuggestions, type SuggestCard } from "@/lib/suggest-recipes";
import { cleanFridge, type Suggestion } from "@/lib/suggestion";
import { RecipeImage } from "../recipes/recipe-image";
import { FridgeForm } from "./fridge-form";

export const metadata: Metadata = { title: "Single Dish · Recipes Made Easy" };

export default async function SuggestPage(props: PageProps<"/suggest">) {
  const params = await props.searchParams;
  const list = (value: string | string[] | undefined) => (Array.isArray(value) ? value : value ? [value] : []);
  // Chips send one "have" per item; without JavaScript it's one text box.
  const fridge = cleanFridge([...list(params.have), ...list(params.have_text).flatMap((t) => t.split(","))]);
  const canShop = params.shop !== "no";

  const [options, result] = await Promise.all([
    getProfileOptions(),
    fridge.length ? getSuggestions(fridge, canShop) : null,
  ]);

  const pick = result ? (result.ready[0] ?? result.needShopping[0]) : undefined;
  const moreReady = result ? result.ready.filter((s) => s !== pick) : [];
  const moreToBuy = result ? result.needShopping.filter((s) => s !== pick) : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      {/* Just finished the questionnaire and chose to start here. */}
      {params.welcome && (
        <p role="status" className="mb-6 rounded-lg bg-primary/10 px-4 py-3 text-primary">
          You&apos;re all set: your answers are saved. Tell us what&apos;s in your fridge to find your first recipe.
        </p>
      )}
      <h1 className="mb-2 font-serif text-3xl">What can I cook?</h1>
      <p className="mb-8 text-muted">
        Tell us what you already have and we&apos;ll find a recipe that uses it, so less goes to waste.
      </p>

      <section className="mb-10 rounded-2xl border border-line bg-white p-6">
        <FridgeForm
          key={fridge.join("|") + canShop}
          initial={fridge}
          canShop={canShop}
          ingredientNames={options.ingredientNames}
        />
      </section>

      {result && !pick && (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center" aria-live="polite">
          <p className="mb-2 font-serif text-xl">
            {canShop ? "No recipe uses these yet" : "Nothing can be made with only what you have"}
          </p>
          <p className="text-muted">
            {canShop
              ? "Try adding a few more things (a meat, a vegetable, rice or pasta), or check the spelling."
              : "Try adding more of what's in your fridge, or answer Yes to see recipes that need a few extra items."}{" "}
            Recipes also have to fit your{" "}
            <Link href="/profile" className="font-medium text-primary underline-offset-2 hover:underline">
              profile
            </Link>
            .
          </p>
        </div>
      )}

      {pick && (
        <div className="flex flex-col gap-10" aria-live="polite">
          <section>
            <h2 className="mb-1 font-serif text-2xl">Our pick</h2>
            {result!.ready.length === 0 && (
              <p className="mb-4 text-muted">
                Nothing can be made with only what you have, so here&apos;s the best use of it with a few extra
                items.
              </p>
            )}
            <SuggestionCard suggestion={pick} big />
          </section>

          {moreReady.length > 0 && (
            <section>
              <h2 className="mb-4 font-serif text-xl">Also ready to cook</h2>
              <div className="flex flex-col gap-3">
                {moreReady.map((s) => (
                  <SuggestionCard key={s.recipe.id} suggestion={s} />
                ))}
              </div>
            </section>
          )}

          {moreToBuy.length > 0 && (
            <section>
              <h2 className="mb-1 font-serif text-xl">With a few extra items</h2>
              <p className="mb-4 text-sm text-muted">These use some of what you have; the rest is listed.</p>
              <div className="flex flex-col gap-3">
                {moreToBuy.map((s) => (
                  <SuggestionCard key={s.recipe.id} suggestion={s} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

function SuggestionCard({ suggestion, big = false }: { suggestion: Suggestion<SuggestCard>; big?: boolean }) {
  const { recipe, using, toBuy, optional, dislikesFound } = suggestion;
  const minutes = totalTime(recipe);
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white ${big ? "border-primary" : "border-line"}`}
    >
      <div className={big ? "flex flex-col" : "flex flex-col sm:flex-row"}>
        <RecipeImage recipe={recipe} className={big ? "h-48 sm:h-64" : "h-32 sm:h-auto sm:w-40 sm:shrink-0"} />
        <div className="flex flex-col gap-2 p-5">
          <h3 className={`font-serif leading-snug ${big ? "text-2xl" : "text-lg"}`}>
            <Link href={`/recipes/${recipe.id}`} className="hover:text-primary">
              {recipe.title}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {[recipe.cuisine, minutes !== null && `${minutes} min`, recipe.cost_bracket].filter(Boolean).join(" · ")}
          </p>
          <p className="text-sm">
            <span className="font-medium text-primary">Uses what you have: </span>
            {using.join(", ")}
          </p>
          {toBuy.length === 0 ? (
            <p className="text-sm font-medium text-primary">✓ You have everything you need.</p>
          ) : (
            <p className="text-sm">
              <span className="font-medium text-accent">To buy ({toBuy.length}): </span>
              {toBuy.join(", ")}
            </p>
          )}
          {optional.length > 0 && (
            <p className="text-sm text-muted">Optional: {optional.join(", ")}</p>
          )}
          {dislikesFound.length > 0 && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent">
              Has {dislikesFound.join(" and ")}, which you&apos;d rather not eat. Leave{" "}
              {dislikesFound.length === 1 ? "it" : "them"} out or swap in something you like.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
