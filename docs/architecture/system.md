# System and server

## Layout

```
server/src/app/        wiring, plain functions: server.ts (listen, shutdown), app.ts (createApp),
                       config/env.ts (Zod env; use `env`, never process.env), config/db.ts (Prisma),
                       middlewares/, routes/v1/routes.ts (mounts each module's router)
server/src/shared/     @shared/*: errors/AppError.ts, http/response.ts (sendSuccess),
                       middlewares/validate.ts (validate({ body?, query?, params? })), logger.ts (pino; req.log)
server/src/modules/    one folder per feature (classes): recipes/ (reference), sales-entry/, auth/, categories/, products/, menu/ (`GET /menu`, settings), pre-order/ (pre-orders, Resend emails), media/ (Cloudinary uploads), health/ (/health, /ready)
server/prisma/         schema.prisma and migrations
server/tests/          Vitest + Supertest
client/app/            routes: (site)/ (/ and /menu), sales-tracker/, recipes/
client/features/       menu, sales-tracker, recipes (each has a CLAUDE.md pointing to its story)
client/components/     ui/ (shadcn), theme-toggle.tsx
client/lib/            env.ts, theme.ts, api/client.ts (api.get/post/put/patch/delete, isApiError, apiErrorMessage)
shared/                types only (@common/*): http.ts (envelope), modules/<name>.ts (contracts)
scripts/               new-module.mjs, remove-module.mjs
```

## Request path

1. Client: `client/lib/api/client.ts` fetches `SERVER_API` + path (`SERVER_API` ends in `/api/v1`, e.g. `http://localhost:8001/api/v1`), unwraps the envelope, throws `ApiError` with field errors on failure.
2. Server `app.ts` order: request logger, helmet, CORS, `/health` and `/ready`, rate limit, body parsers (`BODY_LIMIT`), compression, v1 routes, not-found, `globalErrorHandler`.
3. Module: `validate(schemas)` → controller → service → repository → Prisma.
4. Envelope: `{ success: true, statusCode, message, data }` or `{ success: false, statusCode, status, message, details?, requestId? }` (`shared/http.ts`).

`/recipes`, `/sales-tracker`, `/` and `/menu` use the server. Each server-backed page follows the same client shape: `features/<name>/api.ts` (calls), `lib/normalize.ts` (cleans responses), a `*-loader.tsx` that passes `null` on a failed load (a server component inside `<Suspense>` for public data; a client component using `useLoad` with a `fallback` prop for owner data, since only the browser has the session cookies), and `apiErrorMessage()` for error text.

## Environment and deployment

- `SERVER_API` is inlined into the client at build time (`client/next.config.ts`); changing it needs a rebuild.
- Database: Postgres on Neon (Singapore). `DATABASE_URL` (pooled) at runtime, `DATABASE_URL_UNPOOLED` for migrations.
- Server: Railway, from `server/Dockerfile`; `npm run migrate:deploy` runs before each deploy. Client: Vercel, with `SERVER_API` set before build.
