# Recipe Book: `/recipes`

Private owner tool: recipes as a swipeable stack of book cards (category, name, description, temp, time, yield, ingredients). Tap a card for the full recipe with a ×1–×6 amount multiplier (in memory, not saved); edit or delete from there. The only page backed by the server today. Design spec: `docs/RECIPIES_UI_V1.md` (geometry §4.1, card §6.2, modal §7); its "Not designed yet" list is outdated, since editing and deleting are built.

## Where to change what

Paths are under `client/features/recipes/` unless shown in full.

| To change | Edit | Also check |
| --- | --- | --- |
| Card look: text, sizes, spacing | `components/book-card.tsx` | Mirror every font, padding or gap change in `ingredientSpace()` in `lib/format.ts`, or rows overflow or leave gaps |
| How many ingredients fit, "+N ingredients" lines | `cardIngredientLayout()` in `lib/format.ts` | Every section with ingredients shows its heading; rows are dealt one section at a time |
| Card size per device, title, dots, counter, gestures, "New recipe" card | `components/recipe-book.tsx` (`--cw`/`--ch` on the stage; `isNewCard`) | A `ResizeObserver` measures the real card for `ingredientSpace()` |
| Stack position, tilt, fade | `lib/geometry.ts` | `--card-dim` in `globals.css` sets darkening per theme |
| Formatting (temp, time, amounts) | `lib/format.ts` | Shared by the card and the modals |
| Viewer (ingredients, steps, note, multiplier, delete) | `components/recipe-modal.tsx` | |
| Editor (fields, rows, reorder) | `components/recipe-edit-modal.tsx`, `components/edit-fields.tsx` | Server Zod schema if a rule changes |
| Loading per request | `components/recipe-book-loader.tsx`, `client/app/recipes/page.tsx` | Loads in the browser (`useLoad`; the route needs the session); the page passes a `fallback` |
| API calls, error text | `api.ts`; error text from `apiErrorMessage()` in `client/lib/api/client.ts` | Failed calls throw, so a modal shows the error and stays open |
| Cleaning API data | `lib/normalize.ts` | Always normalize: the server can send `null` for optional fields |
| Colors | `client/app/globals.css` | Recipe tokens (`surface-spine`, `surface-chip`, `surface-new-card`, `surface-icon-tile`, `surface-ghost`, `foreground-ingredient`, `line-active`) exist in both theme blocks |
| Server rules | `server/src/modules/recipes/` (`recipes.schema.ts`, `.service.ts`, `.repository.ts`) | Tests in `server/tests/recipes.test.ts`, `recipes.service.test.ts` |
| A new recipe field | `shared/modules/recipes.ts` (owned by the user: ask first), schema, repository, `server/prisma/schema.prisma` + migration, `lib/normalize.ts`, editor and viewer | Server tests |

## API

The client calls `/recipes` (`SERVER_API` already ends in `/api/v1`): `GET /` (`page`, `limit` ≤ 100; the client asks for 100), `GET /:id`, `POST /`, `PUT /:id` (replaces the whole recipe), `DELETE /:id`. Names are unique (duplicate → 409); missing → 404. Section, ingredient, step and tag order is stored as `position`; an update rewrites the child rows.
