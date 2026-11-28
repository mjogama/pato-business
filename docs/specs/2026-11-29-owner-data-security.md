# Owner data security

- **Status:** done
- **Date:** 2026-11-29
- **Pages / modules:** `/recipes`, `/sales-tracker`, `/progress`, `/cms/*`; `server/src/modules/{recipes,sales-entry,auth,pre-order}`
- **Requested by:** owner

## Summary

Sales entries and recipes could be read by anyone through the API's public GET routes. They now need the owner's session. Sign-ins and placed pre-orders get their own per-IP rate limits, and the token TTL env vars can be left blank (no expiry) and turned on later just by filling in a value.

## Scope

**In scope**

- `requireAuth` on every `/recipes` and `/sales-entries` route.
- Owner pages load that data in the browser, since only the browser has the API's session cookies.
- `POST /auth/login`: failed attempts limited per IP (`LOGIN_RATE_LIMIT_MAX`, default 5 per 15 min).
- `POST /pre-orders`: limited per IP (`PRE_ORDER_RATE_LIMIT_MAX`, default 10 per hour).
- `JWT_ACCESS_TTL_SECONDS=` / `JWT_REFRESH_TTL_SECONDS=` accepted blank (= never expire).

**Out of scope**

- Logout and revoking sessions; default expiry (the owner keeps never-expiring tokens for now).

## Design

See `docs/architecture/auth.md`. Limits use `createRouteLimiter` (`server/src/app/middlewares/rateLimit.ts`), on top of the global limit. Each limiter's count is in memory, per server instance.

## Changes

- Server: `recipes.routes.ts`, `sales-entry.routes.ts` (auth on reads); `auth.routes.ts`, `pre-order.routes.ts` (limiters); `rateLimit.ts` (`createRouteLimiter`); `env.ts` (blank TTLs, two limit vars); `requireAuth.ts` typed as `AnyRequestHandler` so validated handlers still fit after it.
- Client: `lib/use-load.ts`; recipe, sales-tracker and progress loaders are client components with a `fallback` prop; their six pages pass it instead of `<Suspense>`.
- Env: `server/.env.example` (new keys).
- Tests: reads return 401 without a session; both limits answer 429. `npm run check` passes.
