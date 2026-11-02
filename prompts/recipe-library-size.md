# Prompt log: Cutting the recipe library from 100 to 30

Agent: Claude Code · Date: Oct 27, 2026 (before any feature was built) · Result: reality log #6, PR #20

PLAN.md §5 said: *"100 recipes in total: the 5 I send plus 95 collected from the internet by the coding agent."* This is the conversation where that changed. The quotes are copied word for word from the session.

## 1. The agent's suggestion (Oct 27, 21:03)

After reading PLAN.md, the agent asked me 10 questions before building anything. Question 9 was about the deadline:

> **9. The deadline is tight.** It's Oct 27 and the app is due Nov 4. The plan has 11 features, plus collecting 95 recipes and the reflection, which needs a friend to test the live app. My suggestion: finish the 7 required features plus the questionnaire by about Oct 31, then the meal prep plan and single recipe suggestion, and cut Instagram if time runs out. **Do you also want to start with fewer internet recipes, say 30, and add more later?**

## 2. My answer (Oct 27, 21:16)

I answered all 10 questions in one message. My answer to question 9 is the part about the recipes:

> 1. keep as is. 2. I changed PLAN.md directly inside github, check if it´s ok. 3. ok works. 4. ok supabase. 5. option b, free stock photos. 6. ok rule system. 7. no, I don´t. 8. yes save it. **9. I´ll try to finish everything today and friend test tomorrow. yes let´s start with 30 recipes, we can expand later.** 10. yes, let´s use my folder: assign - solo app. based on my answers, track what will be changed in "Reality". no need to create the table yet, but just save the log somewhere.

## 3. The agent's follow-up (Oct 27, 21:18)

> - **30 recipes:** I logged this as 30 from the internet plus your 5 of your own. Tell me if you meant 30 in total.

I didn't answer this directly. It was settled when I asked for the library on Nov 1:

> Also, the 30 library recipes I want YOU to search in the internet and add it the database

## What happened next

- **Who decided:** the agent suggested 30 and I said yes ("Agent → Me").
- **Built:** PR #20 (*Browse: shared recipe library*, merged Nov 1) added 30 internet recipes from 7 recipe sites, with rewritten instructions and allergens tagged on the safe side. My 5 real recipes are in My Recipes.
- **Not done:** "we can expand later". The other 65 recipes are still backlogged (PLAN.md §8).
- **Also in my answer:** "I´ll try to finish everything today and friend test tomorrow." The build actually finished on Nov 1, five days later (reality log #10).
