# Conventions

- **Client:** no classes. Call the server only through `client/lib/api/client.ts` (the one exception is auth, which uses axios in `client/lib/api/auth-client.ts`). Read `client/AGENTS.md` first: this Next.js version differs from training data.
- **Server:** OOP only inside `src/modules/`, plain functions elsewhere. Throw `AppError` subclasses; never `try/catch` in controllers. Respond only through `sendSuccess`; only `globalErrorHandler` formats errors.
- **shared/:** types only, imported with `import type`.
- **Env vars:** add to `server/src/app/config/env.ts` or `client/lib/env.ts` plus the `.env.example`; test values in `server/vitest.config.ts`.
- **Imports:** in `server/src/`, packages, a blank line, then project files, each group shortest line first (`npm run imports`). Biome sorts the rest.
- **Never** commit `.env*` (except `.env.example`), `server/src/generated` or `.claude/worktrees/`; never write to the production database without the owner's approval or print its credentials.
- **Commits:** use `/commit` (feature branch, never pushes to `main`). Name branches `<type>/<name>` with no GitHub username, e.g. `feat/recipe-search`, `fix/owner-data-security` (types: `feat`, `fix`, `chore`, `docs`).
- **Done** means `npm run check` passes from the root.

## Adding a feature

0. Write a spec in `docs/specs/`: `<YYYY-MM-DD>-<feature-name>.md` (e.g. `2026-11-23-recipe-search.md`). Copy `_TEMPLATE.md`, fill in scope and design before coding, ask the owner about open questions, fill in **Changes** when done.
1. `shared/modules/<name>.ts`: entity, request bodies, query types.
2. `server/src/modules/<name>/` (`npm run module:create -- <name>`; `recipes/` is the reference): `.schema.ts` (Zod, each `satisfies z.ZodType<SharedType>`), `.repository.ts` (Prisma via `@app/config/db`; models and a migration in `server/prisma/`), `.service.ts`, `.controller.ts`, `.routes.ts`, `.module.ts`.
3. Mount it in `server/src/app/routes/v1/routes.ts`.
4. Tests in `server/tests/` (`/write-module-tests <name>`).
5. Client in `client/features/<name>/` with `api.*<SharedType>(...)`.
6. Update the page's story in `docs/architecture/` (a new page also gets a `CLAUDE.md` in its feature folder importing its story, and a line in `AGENTS.md`), then mark the spec done.
