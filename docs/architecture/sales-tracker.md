# Sales Tracker: `/sales-tracker`

Private owner tool, backed by the server: a month calendar of sales entries (date and time, title, products with price and quantity). Days with sales show a 🦆, a title, products and the day total; the month revenue is a pill in the header. Tap a past or current day to add an entry; long-press (or Shift+Enter) to see the day's entries in a side panel (full width on phones). Design spec: `docs/SALES_TRACKET_UI_V1.md` (rules §4, screens §7, responsive §8).

## Where to change what

Paths are under `client/features/sales-tracker/`.

| To change | Edit | Also check |
| --- | --- | --- |
| Month title, revenue pill (right corner), arrows, Today, theme button | `TitleRow` in `components/calendar-parts.tsx` | Below 1024px: title and controls share the first row, the revenue pill is on its own row at the left |
| Grid and weekday header | `MonthGrid` in `components/calendar-parts.tsx`, `lib/dates.ts` | Container query: ≥ 70rem (7 × `cell-min`) is a 7-column week grid with a header; narrower, the month's days wrap into fewer columns and each cell shows its weekday |
| Day cell (🦆, title, products, total, holiday, size) | `components/day-cell.tsx` | One size everywhere (`h-cell`, ≥ `--spacing-cell-min`); first 3 products then "+N more products" from `dayProducts()` in `lib/totals.ts`; holidays in `lib/holidays.ts` |
| Tap and long-press | `onCellClick` / `viewDay` in `components/sales-tracker.tsx`, `hooks/use-long-press.ts` | |
| Month total | `monthStats()` in `lib/totals.ts`, shown by `TitleRow` | |
| Day panel (all devices; full width on phones) | `components/day-detail.tsx` | |
| Day title (set once, renamed in the day panel) | `components/day-title.tsx`, `dayTitle()` in `lib/totals.ts`, `renameDay` in `components/sales-tracker.tsx` | The entry form shows it read-only once the day has an entry |
| Entry form (fields, suggestions, placement, saving state) | `components/entry-popover.tsx` | `PHONE_QUERY` (< 640px), `ANCHOR_QUERY` (≥ 720px) in `hooks/use-environment.ts`. Fields are filled cards (`bg-surface-field`) with placeholders only (labels are `sr-only`); product rows stack at every width; popover width is `--spacing-popover` (320px) |
| Validation rules and messages | `lib/validation.ts` | Mirror any rule change in `sales-entry.schema.ts` on the server |
| Money format and rounding | `lib/money.ts` | Sums in centavos |
| Loading per request | `components/sales-tracker-loader.tsx`, `client/app/sales-tracker/page.tsx` | Loads in the browser (`useLoad`; the route needs the session), the page passes a `fallback`; `null` entries shows "Couldn’t load sales" |
| Saving, deleting, suggestions refresh | `saveEntry` / `removeEntry` in `components/sales-tracker.tsx` | Failed calls throw, so the popover shows the error and stays open |
| API calls | `api.ts` | Error text from `apiErrorMessage()` in `client/lib/api/client.ts` |
| Cleaning API data | `lib/normalize.ts` | Drops entries without an id or a valid date |
| Server rules | `server/src/modules/sales-entry/` (`.schema.ts`, `.service.ts`, `.repository.ts`) | Tests in `server/tests/sales-entry.test.ts`, `sales-entry.service.test.ts` |
| Contract | `shared/modules/sales-entry.ts` (owned by the user: ask first) | |

## Rules that must stay true

- Dates are Asia/Manila wall-clock time: `LocalDateTime` `YYYY-MM-DDTHH:mm`, `DayKey` `YYYY-MM-DD`.
- No future entries; a future day does nothing. The server allows 5 minutes of clock skew.
- Validation order: date → title (1–60) → each product (name → price > 0 → quantity ≥ 1). Show the first error only.
- A day has one title. Its first entry sets it; later entries reuse it and the entry form shows it read-only. Renaming in the day panel updates every entry of that day (one `PUT` each). Titles are still stored per entry, so older days can mix titles; the latest entry's wins.
- Delete is immediate, with no confirmation.
- Out of scope (spec §2): profit and cost, inventory, multiple users, any link to the menu (product names are free text). Planned later: a year view. Don't build these unasked.

## Differences from the design spec

`docs/SALES_TRACKET_UI_V1.md` is the original design; the built page changed these on purpose:

- **Header (§7.1, §8.1):** month and year, then the controls (theme toggle, ‹ Today ›), then the month revenue pill. One row from 1024px; below that the title and controls share the first row and the pill is on its own row at the left. The pill is 44px tall (spec §7.5/§8.6: a 106px card under the grid).
- **Day cell (§7.3, §8.2):** one size on every device (138px tall, ≥ 160px wide) showing titles, the first 3 products and the total. Phone compact cells are gone: below 70rem the grid wraps into fewer columns and each cell shows its weekday.
- **Day details (§7.6, §8.3, §8.4):** the right-hand side panel on every device, full width on phones. There is no inline Day agenda under the grid.
- **Entry popover (§7.7):** 320px wide, filled placeholder-only fields, stacked product rows. The title is read-only once the day has an entry (rename it in the day panel).

## API

The client calls `/sales-entries` (`SERVER_API` already ends in `/api/v1`): `GET /` (optional `from`/`to` days, inclusive; the client loads every entry once), `GET /product-suggestions` (each name once, case-insensitive, with its latest price, sorted), `GET /:id`, `POST /`, `PUT /:id` (replaces the whole entry), `DELETE /:id`. Missing → 404; a future date → 400.

`sales_entries.date` is a timestamp without a time zone holding Manila wall-clock time, written and read as if it were UTC (`toDbDate` / `fromDbDate` in the repository). Prices are `DECIMAL(10, 2)`; item order is stored as `position`, and an update rewrites the items.
