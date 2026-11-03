import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { CuisineChart } from "./cuisine-chart";

export const metadata: Metadata = { title: "Dashboard · Recipes Made Easy" };

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const cookbookSize = stats.byCuisine.reduce((sum, row) => sum + row.count, 0);
  const top = stats.byCuisine[0];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">Dashboard</h1>
      <p className="mb-8 text-muted">A quick look at your cooking.</p>

      <div className="mb-8 grid grid-cols-3 gap-2 sm:gap-4">
        <StatTile label="Recipes I added" value={stats.myRecipes} href="/recipes" testId="stat-my-recipes" />
        <StatTile
          label="Starred recipes"
          value={stats.starred}
          href="/recipes?view=starred"
          testId="stat-starred"
        />
        <StatTile label="Meal plans created" value={stats.mealPlans} testId="stat-meal-plans" />
      </div>

      <section className="rounded-2xl border border-line bg-white p-6">
        <h2 className="font-serif text-xl">Recipes by cuisine</h2>
        <p className="mb-4 text-sm text-muted">Recipes you added plus recipes you starred.</p>

        {cookbookSize === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-muted">
              Nothing to show yet. Add a recipe or star one you like.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/recipes/new"
                className="rounded-full bg-primary px-5 py-2.5 font-medium text-white transition hover:bg-primary-dark"
              >
                Add a recipe
              </Link>
              <Link
                href="/browse"
                className="rounded-full border border-line px-5 py-2.5 font-medium transition hover:border-primary"
              >
                Browse recipes
              </Link>
            </div>
          </div>
        ) : (
          <figure>
            <CuisineChart data={stats.byCuisine} />
            <figcaption className="mt-3 text-sm text-muted">
              {cookbookSize} {cookbookSize === 1 ? "recipe" : "recipes"} in{" "}
              {stats.byCuisine.length} {stats.byCuisine.length === 1 ? "group" : "groups"}. The
              most: {top.cuisine} ({top.count}).
            </figcaption>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium text-muted hover:text-foreground">
                Show as table
              </summary>
              <table className="mt-2 w-full max-w-sm text-left">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-1.5 font-medium">Cuisine</th>
                    <th className="py-1.5 text-right font-medium">Recipes</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {stats.byCuisine.map((row) => (
                    <tr key={row.cuisine} className="border-b border-line/60">
                      <td className="py-1.5">{row.cuisine}</td>
                      <td className="py-1.5 text-right">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </figure>
        )}
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  href,
  testId,
}: {
  label: string;
  value: number;
  href?: string;
  testId: string;
}) {
  const body = (
    <>
      <p className="text-xs text-muted sm:text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold sm:text-4xl" data-testid={testId}>
        {value.toLocaleString("en-US")}
      </p>
    </>
  );
  const className = "block rounded-2xl border border-line bg-white p-3 sm:p-5";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-primary`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
