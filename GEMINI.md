# PillarPro Development Rules & Operational Memory

## 1. Git Push & Remote Deployment Policy (CRITICAL - STRICT ENFORCEMENT)
- **NEVER run `git push` without explicit user permission.**
- Do not push remote commits to GitHub or trigger Vercel deployment builds while features are in active development or local testing.
- Always test and verify changes on the local development server (`npm run dev`, vitest tests) first.
- Only execute `git push` when the user explicitly commands it (e.g. "push to github", "deploy now", "push it").

## 2. Local Testing Workflow
- Always test features locally on `localhost:3000` with the user before finalizing.
- Verify environment variables and credentials locally in `.env.local`.
- Local git staging and local commits are permissible for safety checkpoints, but remote publishing (`git push origin ...`) is strictly gated behind user confirmation.
