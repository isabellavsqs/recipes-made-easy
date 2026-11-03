# Written Reflection

## 1. Plan vs. Reality

I had multiple gaps from my original PLAN.md (e.g., additional rules not accounted for in the ´recipes´ and ´ingredients´ table; cut Instagram import features; no e-mail authentication; no allergen pop-up disclaimer), but the biggest gap was not having 100 recipes in the original database (was cut to only 30).

Line in my plan: “**Recipe data:** 100 recipes in total: the 5 I send plus 95 collected from the internet by the coding agent, with a variety of cuisines and ingredients available in the US.”

PR where things changed: [https://github.com/isabellavsqs/recipes-made-easy/pull/20](https://github.com/isabellavsqs/recipes-made-easy/pull/20)

Quotes from the conversation with agent: [https://github.com/isabellavsqs/recipes-made-easy/pull/38](https://github.com/isabellavsqs/recipes-made-easy/pull/38)

The agent suggested the change and I went along. What it cost me: lower customer appeal, because the whole value proposition of the app is built on the recipe database. It´s very difficult to add one recipe one by one, so relying on the available options is extremely important.

If I would rewrite the section of the plan, this is how it would look like:

On Technologies:

“**Recipe data:** 30 recipes in total, collected from the internet by the coding agent, with a variety of cuisines and ingredients available in the US.”

## 2. The stranger test

Top 3 struggles:

1. Confusing navigation. My husband could not tell what the app could do, and the tabs (“My recipes,” “Meal plan,” “Single recipe”) looked alike. “Single recipe” and “My recipes” were especially hard to tell apart, and there were no instructions to help him
2. Stuck after onboarding. Once he finished the questionnaire, the app only displayed a summary of his answers (basically his Profile tab). He did not know what to do next and had no clear path to his first meal plan or recipe
3. Unclear ingredient field in the Single recipe tab. He did not realize the fridge ingredients field was a data validation list with preset options. The formatting looked odd and gave him no cue about how to use it

I fixed struggle 2 (stuck after onboarding). PR evidence: [https://github.com/isabellavsqs/recipes-made-easy/pull/36](https://github.com/isabellavsqs/recipes-made-easy/pull/36).

Why I chose it:

- It happens at a highest commitment point. The user has just invested effort in the questionnaire, and the fix turns that effort into immediate value instead of a dead end
- The user already told the app what they want to do, so asking them to find it themselves after onboarding was a useless friction
- It blocks activation. Struggles 1 and 3 slow a user down, but this one stops a new user from reaching the product’s core features at all
- It applies to every new user exactly once, so the fix benefits every new sign-up

What I decided not to fix & the tradeoffs involved

- Struggle 1 (tab labels and instructions). Adding in-app guidance is a larger change that touches the whole structure of the app. The new landing flow and the “You’re all set” note already reduce the risk of confusion on first use, so I can observe whether it persists before investing more. Renaming “Single recipe” and “My recipes” to clearly distinct labels is the next priority, since users now land in one of these tabs and may still face that confusion
- Struggle 3 (ingredient field formatting). This affects one feature and only users who choose that path, so its reach is narrower. It is also better fixed after deciding whether the field should remain a validation list or become a clearer multi-select, which is a design decision that deserves more thought than a quick patch
