# Owner login (`/sc/auth/login`)

A username and password, with sign out (this browser or every device); no signup or reset. Sessions never expire unless a TTL env var is set (blank = no expiry). Spec: `docs/specs/2026-11-24-auth-login.md`.

## How it works

1. `/sc/auth/login` posts to `POST /api/v1/auth/login`. The server checks the bcrypt hash and sets two httpOnly cookies: `access_token` (path `/`) and `refresh_token` (path `/api/v1/auth`). Both are JWTs with no `exp` unless `JWT_ACCESS_TTL_SECONDS` / `JWT_REFRESH_TTL_SECONDS` is set; the cookie `maxAge` follows the same value. Failed sign-ins are limited per IP (`LOGIN_RATE_LIMIT_MAX` per 15 min; successful ones don't count). Each token carries the user's `tokenVersion` (`ver`; tokens without it count as 0).
2. `requireAuth` guards every `/recipes` and `/sales-entries` route (reads included), the owner routes of `/pre-orders`, and the writes of `/products`, `/categories`, `/menu/settings` and `/media`.
3. `RequireAuth` wraps the `/recipes`, `/sales-tracker`, `/progress` and `/cms` layouts. It calls `GET /auth/me`, and sends anyone without a session to `/sc/auth/login?next=<path>`.
4. **Sign out.** `POST /auth/logout` clears both cookies (no session needed). `POST /auth/logout-all` (needs a session) adds 1 to `users.tokenVersion` and clears the cookies: `requireAuth` and `/auth/refresh` refuse any token whose version is older, so every device is signed out. The CMS sidebar has "Sign out" and "Sign out everywhere" (with a confirm); `/recipes`, `/sales-tracker` and `/progress` have a sign-out icon button next to the theme toggle (hidden inside `/cms`).
5. On a 401, `lib/api/auth-client.ts` calls `POST /auth/refresh` once (one request at a time) and retries. The fetch `api` client in `client.ts` does the same in the browser. If refresh fails, the owner goes to the login page.

Accounts are rows in the `users` table, inserted directly in the database. `passwordHash` is a bcrypt hash (`bcryptjs`; `bcrypt.hashSync("password", 10)`).

## Where to change what

| To change | Edit |
| --- | --- |
| Token signing, cookie names, expiry | `server/src/shared/auth/tokens.ts`; TTL env vars in `server/src/app/config/env.ts` |
| Cookie flags (`SameSite`, `Secure`, path) | `cookieOptions` in `server/src/modules/auth/auth.controller.ts` |
| Login rules | `server/src/modules/auth/auth.service.ts` |
| Sign-in and pre-order rate limits | `createRouteLimiter` in `server/src/app/middlewares/rateLimit.ts`; `LOGIN_RATE_LIMIT_MAX`, `PRE_ORDER_RATE_LIMIT_MAX` in `env.ts` |
| Which routes need a session | `requireAuth` in each module's `*.routes.ts` |
| Sign out (routes, cookie clearing) | `logout`, `logoutEverywhere` in `auth.controller.ts`; `tokenVersion` check in `server/src/shared/middlewares/requireAuth.ts` and `auth.service.ts` (`refresh`) |
| Sign-out buttons | `client/features/auth/components/sign-out.tsx` (`SignOutButton`, `SidebarSignOut`) |
| Login page | `client/features/auth/components/login-form.tsx`, `client/app/sc/auth/login/` |
| Client gate | `client/features/auth/components/require-auth.tsx` and the owner page layouts |
| Refresh and redirect | `client/lib/api/auth-client.ts` (the only axios code) |

## Notes

- Production needs `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ chars each, different) on Railway, and the migrations applied (`tokenVersion` is `20261129120000_add_user_token_version`).
- `requireAuth` reads the user's `tokenVersion` on every owner request (one primary-key lookup). Tests mock it in `server/tests/setup.ts`.
- The client (Vercel) and API (Railway) are different sites, so cookies are `SameSite=None; Secure` in production. Browsers that block third-party cookies will not keep the session; the fix is a shared parent domain or a proxy.
- The page gate is client-side; the real protection is `requireAuth` on the API. The session cookies belong to the API's site, so the Next server can't send them: owner data (recipes, sales, progress) loads in the browser through `useLoad` (`client/lib/use-load.ts`) in each `*-loader.tsx`.
