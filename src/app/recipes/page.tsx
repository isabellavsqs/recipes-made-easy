import type { Metadata } from "next";
import Link from "next/link";
import { listMyRecipes } from "@/lib/recipes";
import { getStarredIds, listStarredRecipes } from "@/lib/stars";
import { setStarAction } from "./actions";
import { RecipeCard } from "./recipe-card";

export const metadata: Metadata = { title: "My Recipes · Recipes Made Easy" };

export default async function MyRecipesPage(props: PageProps<"/recipes">) {
  const { view } = await props.searchParams;
  const showStarred = view === "starred";

  const [recipes, starredIds] = await Promise.all([
    showStarred ? listStarredRecipes() : listMyRecipes(),
    getStarredIds(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl">My Recipes</h1>
        <Link
          href="/recipes/new"
          className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
        >
          + Add recipe
        </Link>
      </div>

      <nav aria-label="Recipe views" className="mb-8 flex gap-2">
        <Tab href="/recipes" active={!showStarred}>
          All
        </Tab>
        <Tab href="/recipes?view=starred" active={showStarred}>
          Starred ({starredIds.size})
        </Tab>
      </nav>

      {recipes.length === 0 ? (
        showStarred ? (
          <EmptyState
            title="No starred recipes yet"
            text="Tap the star on a recipe you love and it will show up here."
            href="/recipes"
            linkText="See all recipes"
          />
        ) : (
          <EmptyState
            title="No recipes yet"
            text="Add a recipe you love cooking and it will show up here."
            href="/recipes/new"
            linkText="Add your first recipe"
          />
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                starred={starredIds.has(recipe.id)}
                starAction={setStarAction.bind(null, recipe.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-foreground text-white"
          : "border border-line bg-white text-muted hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function EmptyState({
  title,
  text,
  href,
  linkText,
}: {
  title: string;
  text: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
      <p className="mb-2 font-serif text-xl">{title}</p>
      <p className="mb-6 text-muted">{text}</p>
      <Link
        href={href}
        className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
      >
        {linkText}
      </Link>
    </div>
  );
}
