# Prompt log: Feature 4, Validation

Issue: #12 · Branch: `feature/validations` · Agent: Claude Code

I created the Issue and the branch myself in the VS Code terminal this time.

## Prompts

**Prompt 1**
> already created the issue and new branch through VS code terminal. now move forward by creating the feature 4 from plan.md file

**Agent response (summary):** The agent checked that I was on `feature/validations`, branched from an up-to-date `main`, and read Issue #12. Then it built feature 4:

- **`src/lib/recipe-validation.ts`**: one function, `validateRecipe()`, that checks the form before anything is saved. It is kept separate from the database code so it can be tested on its own.
  - Required: **title**, **servings**, at least **one ingredient**, **instructions** (PLAN.md feature 4)
  - Also checked: servings must be a whole number from 1 to 100; prep and cook time must be whole minutes; each ingredient row needs a name; amounts must be numbers; the same ingredient can't be listed twice
  - Blank-only text (just spaces) counts as blank; completely empty ingredient rows are ignored
- **Friendly messages next to each field**, for example "Please give your recipe a title." or "Please add at least one ingredient.", a red outline on the field, and a summary above the Save button. The cursor jumps to the first field that needs fixing.
- **Required fields are marked with \*.**
- **The form keeps what you typed** when something is wrong. In feature 3, a failed save cleared the whole form.
- The server always runs the checks, so they can't be skipped, even with JavaScript turned off.

## Problems and decisions along the way

- **Bug caught by a screenshot (from feature 3):** on a phone-sized screen, the ingredient amount and unit boxes stretched to full width and squeezed the ingredient *name* box to almost nothing, pushing the ✕ button off the screen. Cause: two conflicting width rules on the same box, where "full width" won. A second cause was that a `<fieldset>` refuses to shrink below its content by default. Both are fixed, and the form was checked at 360px, 420px and 1280px wide with no sideways scrolling.
- **Two more small phone fixes:** "My Recipes" and "Log out" now stay on one line in the header, and a long email in "Hi, …" on Home now wraps instead of making the page scroll sideways.
- **Test mistakes (not app bugs):** the agent's first browser test clicked the header's **Log out** button instead of **Save recipe** (both are submit buttons, and Log out comes first on the page), so it logged itself out. A second run read the *old* error messages before the new ones arrived. Both were fixed in the test script.

## How it was checked

This time the agent used a real browser (Playwright with Chromium) on the local app, logged in as test user A:

| Check | Result |
|---|---|
| Save an empty form | ✅ 4 messages (title, servings, ingredients, instructions); cursor on Title; stays on the page |
| Servings `0`, prep `5.5`, ingredient with amount but no name, "Onion" + "onion", amount `abc` | ✅ a specific message for each one |
| Typed values kept after an error | ✅ title and all 3 ingredient rows still there |
| Remove a row with ✕, fix everything, save | ✅ saved and opens the recipe |
| Edit: blank out the title | ✅ "Please give your recipe a title.", servings still filled in |
| Delete dialog: Cancel, then Yes, delete | ✅ Cancel closes it; Yes deletes and returns to an empty list |
| Same checks with JavaScript off | ✅ messages shown, title kept |
| Phone widths 360 / 420 / 1280 px | ✅ no sideways scrolling |

Screenshot: `docs/screenshots/feature-4-validation.png`
