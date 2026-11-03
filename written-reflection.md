# Written Reflection

## 1. Plan vs. Reality

I had multiple gaps from my original PLAN.md (e.g., additional rules not accounted for in the ´recipes´ and ´ingredients´ table; cut Instagram import features; no e-mail authentication; no allergen pop-up disclaimer), but the biggest gap was not having 100 recipes in the original database (was cut to only 30).

The plan. [PLAN.md §5](https://github.com/isabellavsqs/recipes-made-easy/blob/main/PLAN.md) said: "Recipe data: 100 recipes in total: the 5 I send plus 95 collected from the internet by the coding agent, with a variety of cuisines and ingredients available in the US." The risk was already in §7: "Collecting 95 recipes from the internet and tagging them correctly takes time and can introduce errors." But the recipes weren't on my cut list, so the plan had no answer for that risk.

What happened. On Oct 27, before any code was written, the agent asked me: "Do you also want to start with fewer internet recipes, say 30, and add more later?" I answered: "I´ll try to finish everything today and friend test tomorrow. yes let´s start with 30 recipes, we can expand later." The agent then asked "Tell me if you meant 30 in total", and I never answered. It was only settled on Nov 1, when I asked it to add "the 30 library recipes". The 30 recipes were added in [PR #20](https://github.com/isabellavsqs/recipes-made-easy/pull/20). The full conversation is in [prompts/recipe-library-size.md](https://github.com/isabellavsqs/recipes-made-easy/blob/main/prompts/recipe-library-size.md) ([PR #38](https://github.com/isabellavsqs/recipes-made-easy/pull/38)), and the change is [reality log #6](https://github.com/isabellavsqs/recipes-made-easy/blob/main/notes/reality-log.md).

Who decided. The agent suggested it and I made the decision.

What it cost. Lower customer appeal, because the whole value proposition of the app is built on the recipe database. It´s very difficult to add recipes one by one, so relying on the available options is extremely important. Because allergies and diet are hard filters, a small library shrinks fast:

- a vegetarian user sees 16 of 30 recipes
- a vegetarian with a milk allergy sees 8
- adding a wheat allergy leaves 6

Six cuisines have only one recipe. In Single Dish, "can't shop" with salmon, broccolini and ramen finds nothing. And "we can expand later" never happened: 65 recipes are still backlogged. The one benefit: with 30 recipes, every allergen tag could be checked and tagged on the safe side.

How I would rewrite the plan. The total wasn't the real problem; the problem was that hard filters and a small library work against each other. On Technologies:

"Recipe data: 35 recipes in total: the 5 I send plus 30 collected from the internet by the coding agent, with a variety of cuisines and ingredients available in the US. The 30 must include at least 10 vegetarian, 5 vegan and 5 wheat-free recipes, and at least 2 per cuisine, so every profile still sees enough choices. After the 10 features are done, add 10 recipes per week, starting with the profiles that see the fewest."

And on Risks and cuts, add: "6. Recipe library size: start with 30 internet recipes instead of 95."

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
