import Link from "next/link";
import type { RecipeSummary } from "@/lib/recipes";
import { totalTime } from "@/lib/recipe-search";
import { RecipeImage } from "./recipe-image";
import { StarButton } from "./star-button";

// 1.5 -> "1 1/2", 0.33 -> "1/3"; amounts without a common fraction stay decimals.
const FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"], [1 / 4, "1/4"], [1 / 3, "1/3"], [1 / 2, "1/2"], [2 / 3, "2/3"], [3 / 4, "3/4"],
];
export function formatQuantity(quantity: number) {
  const whole = Math.floor(quantity);
  const rest = quantity - whole;
  if (rest < 0.01) return String(whole);
  const fraction = FRACTIONS.find(([value]) => Math.abs(value - rest) < 0.02)?.[1];
  if (!fraction) return String(Math.round(quantity * 100) / 100);
  return whole ? `${whole} ${fraction}` : fraction;
}

export function RecipeCard({
  recipe,
  starred,
  starAction,
}: {
  recipe: RecipeSummary;
  starred: boolean;
  starAction: (star: boolean) => Promise<void>;
}) {
  const minutes = totalTime(recipe);

  // The star sits on top of the photo, outside the link, so clicking it
  // doesn't open the recipe.
  return (
    <div className="relative h-full">
      <Link
        href={`/recipes/${recipe.id}`}
        className="group block h-full overflow-hidden rounded-2xl border border-line bg-white transition hover:border-primary hover:shadow-sm"
      >
        <RecipeImage recipe={recipe} className="h-36" />
        <div className="p-4">
          <h2 className="mb-1 font-serif text-lg leading-snug group-hover:text-primary">
            {recipe.title}
          </h2>
          <p className="text-sm text-muted">
            {[
              recipe.cuisine,
              minutes !== null && `${minutes} min`,
              recipe.cost_bracket,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <StarButton title={recipe.title} starred={starred} action={starAction} size="sm" />
      </div>
    </div>
  );
}
