# Prompt log: Feature 3, Create / read / update / delete

Issue: #10 · Branch: `feature/crud` · Agent: Claude Code

## Prompts

**Prompt 1**
> gh issue create --title "delete_confirmation" --body "As a user, I want to add a recipe, view my recipe list, open one recipe's detail page, edit it, and delete it with an "are you sure?" confirmation, so that I keep full control of my recipe collection."

**Agent response (summary):** Before running my command, the agent pointed out two problems:

1. The double quotes around `"are you sure?"` sat inside a body that also used double quotes, so the terminal would have cut the body short and the command would fail.
2. The title "delete_confirmation" only named one part of a story that covers all of feature 3.

I chose the title "Feature 3: Create, read, update, delete", and the agent created Issue #10 with the inner quotes changed to single quotes. It then built feature 3:

- **My Recipes** (`/recipes`): a list of only *my* recipes, newest first, with an empty state ("No recipes yet") when there are none
- **Add** (`/recipes/new`): title, cuisine, servings, prep and cook time, cost ($/$$/$$$), diet tags, ingredient rows (amount, unit, name) with "+ Add ingredient", instructions, allergens and appliances
- **Detail** (`/recipes/[id]`): all the fields, plus Edit and Delete buttons on my own recipes only
- **Edit** (`/recipes/[id]/edit`): the same form, filled in
- **Delete**: an "Are you sure you want to delete *[title]*? This can't be undone." dialog with Cancel / Yes, delete
- A friendly 404 page: "This page doesn't exist, or you don't have access to it."
- Ingredient names are matched with existing ones ("rice" reuses "Rice"); new names become my own custom ingredients

## Problems and decisions along the way

- **Type error on the first build:** without generated database types, Supabase assumed each linked row (like a recipe's ingredient) was a list. The agent spelled out the real shape and the build passed.
- **Test script mistakes (not app bugs):** the agent's first automated tries returned 400 and 500 errors. The server logs showed the requests themselves were malformed: the script used the wrong hidden form field names. After fixing the script, everything passed. Worth remembering: an error in a test doesn't always mean the app is broken.
- **No photos on my own recipes yet:** recipes I add show a warm colored panel with the title's first letter. Unsplash photos are planned for the shared library (reality log #20).
- **Known gap left for feature 4 (validation):** there are no friendly messages for blank required fields yet, and if saving fails the form clears what I typed.

## How it was checked

The agent drove the real pages on the local app (the same requests a browser sends) with test users A and B:

| Check | Result |
|---|---|
| A with no recipes sees "No recipes yet" | ✅ |
| A adds "Test garlic rice" (2 ingredients, a blank row, soy, stove) | ✅ saved and opens its detail page; the blank row is ignored |
| Detail shows title, ingredients with amounts, "Contains: Soy", Edit/Delete | ✅ |
| Edit form is filled in with the saved values | ✅ |
| A edits the title, servings, ingredients and allergens | ✅ all changes shown; the removed appliance is gone |
| B's list | ✅ empty ("No recipes yet") |
| B opens A's recipe or its edit page | ✅ 404 not found |
| B replays A's delete form | ✅ nothing happens, A's recipe is still there |
| A deletes the recipe | ✅ back to the list, recipe page is now 404 |
| Logged out, open `/recipes` | ✅ sent to `/login` |

Not checked automatically: clicking in a real browser (the dialog opening, adding and removing ingredient rows). I'll check those myself in review.
