# Prompt log: Feature 8, Onboarding questionnaire

Issue: #26 · Branch: `feature/onboarding-questionnaire` · Agent: Claude Code

I created the Issue and the branch myself.

## Prompts

**Prompt 1**
> new issue and branch created (feature/onboarding-questionnaire). go ahead and build the feature inside the new branch.

**Agent response (summary):** The agent checked that PR #25 was merged and the branch was up to date. It confirmed that the database rules from feature 2 already let each user read and change only their own profile, so no new tables were needed. Then it built feature 8:

- **The questionnaire** at `/onboarding`: 7 questions, one per screen, with a progress bar ("Question 4 of 7"), chips to tap, and Back / Next / Finish. The questions are goals (up to 3), diet, allergies, dislikes, appliances, budget and how to start (meal prep or one recipe).
  - **Dislikes:** type an ingredient and press Enter or **Add**. It suggests ingredients from the library, ignores repeats ("MUSHROOMS" = "mushrooms"), and lets you remove one with ✕.
  - **Without JavaScript,** all 7 questions show on one page and dislikes are typed with commas.
  - All answers are saved together when you press **Finish**.
- **New accounts** go straight to the questionnaire after sign up. Older accounts see a "Tell us about you" card on Home.
- **The Profile page** (`/profile`, new link in the header) shows the answers, with **Edit answers** to change them. The questionnaire opens with the saved answers already filled in.
- **Hard filters (PLAN.md rules):** Browse hides library recipes that contain one of my allergens or don't fit my diet, and says how many are hidden, with a link to Profile (reality log #37).
- **The header** got a fourth link, Profile. On phones the links now have their own row under the logo.
- The answer checks are in `src/lib/profile-validation.ts` and the hard filter is `fitsProfile()` in `src/lib/recipe-search.ts`, both separate so they can be tested on their own.

**Prompt 2** (sent while the agent was working)
> goals and allergies list confirmed. about goals, I would take "eat more protein" out. all the other ones are ok.

**Agent response (summary):** The goals live in the database, so the agent wrote `supabase/migrations/005_remove_protein_goal.sql`, which deletes "Eat more protein" (anyone who picked it just loses that goal). It updated `schema.md` and marked reality log #18 as confirmed by me. I run the SQL in Supabase.

## Problems and decisions along the way

- **Bug: "Next" on question 6 sent the whole form.** The browser test showed "Saving…" on the last question before Finish was pressed. React reused the same button and switched it from **Next** to **Finish** (a submit button) during the click, so the browser treated the click as a submit and skipped the last question. Fixed by making them two separate buttons.
- **Bug: dislikes saved as every ingredient.** After typing "mushrooms" and "Olives", the Profile page listed all ~150 ingredients. The helper reused from the recipe form returns a lookup of *all* ingredients, and the code saved all of it instead of just the names typed. Fixed to save only the named ones. The 20-dislike limit stopped the next save, which is how the second failure showed up.
- **Safer saving:** "questionnaire done" is now saved last, so if something fails halfway it isn't marked as done and can simply be retried.
- **Development hiccup (not an app bug):** the dev server kept an old copy of `src/lib/recipes.ts` in memory and reported that a function "is not a function", although the code was right. Stopping the task didn't stop the server underneath (Windows), so the agent found the old process on port 3000, ended it and started a fresh server.
- **Test mistake:** the test script's "Next" button search also matched Next.js's developer-tools button ("Open Next.js Dev Tools"); fixed by matching the exact name.
- **Decisions:** a budget question added; hard filters on Browse only (reality log #36, #37).

## How it was checked

Logic, with made-up answers:

| Check | Result |
|---|---|
| No answers at all | ✅ saved with "No restrictions" |
| 3 goals / 4 goals | ✅ saved / "Please pick up to 3 goals." |
| Made-up values (`diet=keto`, `$$$$`, `abc` as an allergy) | ✅ ignored |
| Dislikes " Onion ", "onion", "", "  green   peppers " | ✅ "Onion", "green peppers" |
| Hard filter: vegan user vs vegetarian recipe; vegetarian user vs vegan recipe; milk allergy | ✅ hidden; shown; hidden only if the recipe has milk |

Real browser (Playwright with Chromium) on the local app, with a new account:

| Check | Result |
|---|---|
| Sign up | ✅ lands on "Tell us about you", Question 1 of 7 |
| 3 goals picked | ✅ the other goals can't be picked, "3 of 3 picked" |
| Next moves to the next question | ✅ and moves the focus to its heading |
| Dislikes: Enter, Add, a repeat in capitals, remove one | ✅ "mushrooms, Olives" |
| Back keeps answers | ✅ |
| Last question shows Finish (not sent early) | ✅ |
| Finish | ✅ Profile shows every answer exactly |
| Browse as a vegetarian with a milk allergy | ✅ 8 recipes, none with meat, fish or milk; "22 recipes are hidden…" |
| Edit answers: saved answers filled in; switch to no diet, no allergies | ✅ Browse shows all 30 again |
| JavaScript off | ✅ all 7 questions on one page; vegan, peanuts, "tofu, Okra , tofu" saved as "Okra, tofu" |
| Header at 360px | ✅ 4 links on their own row, no sideways scrolling |
| The 2 required tests (sign up now goes to the questionnaire) | ✅ both pass |
| Build and lint | ✅ |

Screenshots: `docs/screenshots/feature-8-onboarding.png`, `docs/screenshots/feature-8-profile.png`
