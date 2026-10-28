# Prompt log: Feature 2, Data model

Issue: #8 · Branch: `feature/data-model` · Agent: Claude Code

## Prompts

**Prompt 1**
> I merged the PR. help me do the next 2 steps

(The two steps were: put the app on Vercel, and build feature 2, the data model.)

**Agent response (summary):** The agent gave me step-by-step Vercel instructions to do myself, since they need my account. Then it wrote `supabase/migrations/002_data_model.sql` from PLAN.md §3:

- All 16 tables from the plan (profiles, goals, allergies, appliances, the user_* links, ingredients, recipes, recipe_* links, stars, meal_plans, meal_plan_items), with primary and foreign keys
- Lookup lists filled in (5 goals, 9 allergens, 4 appliances)
- Database rules: max 3 goals per user, one star per user per recipe, seed recipes have no owner, and every sign up gets an empty profile
- Row Level Security on every table: seed recipes shared read-only, everything else private to its owner

It also wrote `schema.md` with a diagram and a "Plan vs. what was built" table.

## Problems and decisions along the way

- **Bug caught before running:** in the first draft, the stars rule only checked that a star row was *yours*, not that you could see the recipe. User B could have starred User A's private recipe if B guessed its id. The agent spotted this and added a "can this user read this recipe?" check to stars and meal plan items.
- **A test that proved nothing:** the first local check of that rule passed for the wrong reason (B couldn't even find A's recipe, so nothing was inserted). The agent rewrote it to try the recipe's id directly, and the database then blocked it.
- **How it was checked:** before I pasted the SQL into Supabase, the agent ran both migration files on a throwaway local Postgres (PGlite), with stand-ins for Supabase's `auth` schema, and confirmed:
  - B can't see, edit or star A's private recipe, or add it to a meal plan
  - B can't create a recipe in A's name
  - A can't star the same recipe twice, or save a 4th goal
  - Seed recipes are visible to everyone; profiles are created automatically
- **Plan vs. reality:** composite primary keys on link tables, `diet_tags` as a list, and new `created_at` and photo columns on recipes (reality log #15–#19).

## Running it on Supabase and the first deploy

**Prompt 2**
> done. also supabase code ran

**Agent response (summary):** I had set up Vercel and run `002_data_model.sql` in the Supabase SQL Editor. The agent tested both:

- **Live site:** the first deploy returned "Internal Server Error" on every page. The cause was that the Supabase settings weren't in the build: Next.js bakes `NEXT_PUBLIC_` values in at build time, so saving them in Vercel isn't enough without a redeploy. After I checked the variables and clicked **Redeploy**, sign up, log out and log in all worked on the live URL.
- **Vercel warning:** Vercel flagged `NEXT_PUBLIC_` variables as possibly secret. The agent explained that the Supabase URL and *publishable* key are meant to be public (Row Level Security is what protects the data), so I chose "Config". The Supabase *secret* key must never be public.
- **Real database:** with two test accounts, the agent checked: 5 goals, 9 allergies and 4 appliances readable when logged in (nothing when logged out); A's profile was created automatically; B can't see, edit, delete or star A's recipe, or create one in A's name; A can't star twice or save a 4th goal. The test rows were deleted afterwards.
