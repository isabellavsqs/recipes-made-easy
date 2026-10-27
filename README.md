# Recipes Made Easy

A personalized recipe website for busy students and professionals: save recipes, plan the week's meal prep and get suggestions that respect your diet, allergies, dislikes and budget.

> Work in progress. See [PLAN.md](PLAN.md) for the full plan.

## Tech stack

- **Next.js 16** (React, TypeScript) for the pages and server logic
- **Supabase** for the PostgreSQL database and sign up / login
- **Tailwind CSS** for styling
- **Vercel** for hosting
- Built with **Claude Code** (prompt logs in [`prompts/`](prompts/))

## Run it locally

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root with your Supabase project's values (Project Settings → API Keys):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your publishable key>
   ```
4. In the Supabase SQL Editor, run each file in [`supabase/migrations/`](supabase/migrations/) in order.
5. Start the app:
   ```bash
   npm run dev
   ```
   Then open http://localhost:3000.
