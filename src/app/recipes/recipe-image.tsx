import type { RecipeSummary } from "@/lib/recipes";

// The recipe's photo, or a warm colored panel with its first letter when it
// has none (recipes added by users don't have photos yet).
export function RecipeImage({
  recipe,
  className = "",
}: {
  recipe: Pick<RecipeSummary, "title" | "image_url">;
  className?: string;
}) {
  if (recipe.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={recipe.image_url}
        alt=""
        className={`w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`flex w-full items-center justify-center bg-accent/10 font-serif text-5xl text-accent/60 ${className}`}
    >
      {recipe.title.trim()[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
