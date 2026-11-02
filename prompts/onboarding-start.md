# Prompt log: Improving CX, onboarding sends you where you chose to start

Issue: #35 · Branch: `improvingCX/onboarding-questionnaire` · Agent: Claude Code

I created the Issue and the branch myself.

## Prompts

**Prompt 1**
> PR merged. now I created the issue and a new branch (improvingCX/onboarding-questionnaire). please fix this issue and send me the new pull request. if any questions ask me

The Issue: *"As the user, when I complete the onboarding questionnaire, I want to directly be sent to the action I chose (either build a meal prep plan or cook a single dish)."*

**Agent response (summary):** Before, Finish always went to Profile, so the last question ("How do you want to start?") didn't change anything. Now:

- **First time:** "Plan my meal prep" opens **Meal Prep** and "Find one recipe" opens **Single Recipe** (What can I cook?). A green "You're all set: your answers are saved…" message replaces the "Saved" message I used to see on Profile.
- **Editing my answers later** (from Profile): still goes back to Profile with "Saved". Being sent into Meal Prep after fixing one dislike would be odd.
- **Start question skipped:** goes to Profile, as before.

The server checks whether the questionnaire was already completed *before* saving, so it knows whether this is the first time.

## Checks

- Real browser, new accounts: meal prep → `/meal-prep?welcome=1`; single recipe → `/suggest?welcome=1`; editing from Profile → `/profile?saved=1`; no start chosen → `/profile?saved=1`; with JavaScript off → `/suggest?welcome=1`. The welcome message disappears after the first search.
- Both tests (`npm test`) still pass.
- Screenshots: `docs/screenshots/onboarding-start-meal-prep.png`, `docs/screenshots/onboarding-start-single-recipe.png`.
