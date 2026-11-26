// The disclaimer from TEAM-PLAN.md §3 (feature 1). Shown on recipe pages,
// Browse, Single Dish and Meal Prep, because the shared recipes' servings,
// times, costs, diet tags and allergens were estimated, not measured.
export const ESTIMATES_NOTE =
  "Servings, times, costs, nutrition, diet tags and allergens are estimates. Always check the ingredients, especially if you have an allergy.";

export function EstimatesNote({ className = "" }: { className?: string }) {
  return <p className={`text-sm text-muted ${className}`}>{ESTIMATES_NOTE}</p>;
}
