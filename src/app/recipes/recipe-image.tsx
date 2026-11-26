import type { RecipeSummary } from "@/lib/recipes";
import { RecipePhoto } from "./recipe-photo";

// The recipe's photo, or a warm colored panel with its first letter when it
// has none (recipes added by users don't have photos yet) or the photo can't
// be loaded (for example, if TheMealDB is down).
// Cards use TheMealDB's smaller photo; the recipe page uses the full one.
export function RecipeImage({
  recipe,
  className = "",
  full = false,
}: {
  recipe: Pick<RecipeSummary, "title" | "image_url">;
  className?: string;
  full?: boolean;
}) {
  const src =
    recipe.image_url && !full && recipe.image_url.startsWith("https://www.themealdb.com/")
      ? `${recipe.image_url}/large`
      : recipe.image_url;
  return <RecipePhoto title={recipe.title} src={src} className={className} lazy={!full} />;
}
