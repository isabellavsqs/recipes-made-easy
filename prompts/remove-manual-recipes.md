# Prompt log: Cleanup, remove manual recipe files

Issue: #16 · Branch: `chore/remove-manual-recipes` · Agent: Claude Code

## Prompts

**Prompt 1**
> I already merged PR#15. Now please remove the manual recipes repo in a small cleanup PR. Also, the 30 library recipes I want YOU to search in the internet and add it the database

**Agent response (summary):** While finishing feature 5, the agent noticed that my two recipe drafts (`manual_recipes/recipe 1 - Shakshuka.txt` and `recipe 2 - Kebbeh.txt`) had been committed by mistake in its feature 3 commit, which used "add everything". It created Issue #16 and this branch, deleted the two files from the repo, and added `/manual_recipes/` to `.gitignore` so future drafts in that folder stay on my computer. (The 30 library recipes are a separate Issue and PR.)

## Problems and decisions along the way

- **Bug in the agent's workflow:** the agent's feature 3 commit staged every file in the folder, including my drafts. Since then it stages only the files it changed.
- The files stay in the Git history of older commits; removing them from history would mean rewriting `main`, which isn't worth it for recipe notes.

## How it was checked

- `git status` shows the folder is ignored after the change.
- The app doesn't use these files, so nothing else changes.
