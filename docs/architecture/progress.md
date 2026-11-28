# Progress: `/progress`

Private owner page (also `/cms/progress`, after Sales Tracker in the CMS sidebar): how sales are going, drawn from the Sales Tracker's entries. Read only; there is no API of its own. Spec: `docs/specs/2026-11-25-progress-page.md`.

A range filter (7 days, 30 days (default), 90 days, 12 months) scopes everything below it: stat tiles (revenue as the one big number with its change against the previous period of the same length, entries, items sold, best day), **Revenue per day/week/month** (columns, with a table view), **Pace** (running revenue against the previous period, two lines on one axis), **Top products** (by revenue) and **Best weekdays** (average revenue per calendar day, days without sales count as ₱0, up to today).

## Where to change what

Paths are under `client/features/progress/`.

| To change | Edit | Also check |
| --- | --- | --- |
| Ranges, buckets (7/30 days daily, 90 days = 13 weeks ending today, 12 months = calendar months), previous period | `RANGES`, `bucketsFor()` in `lib/progress.ts` | `UNIT` in `components/progress.tsx` |
| Totals, top products, weekday averages, axis ticks and labels | `lib/progress.ts` | Money sums use `sumMoney` / `lineRevenue` from `features/sales-tracker/lib/money.ts` |
| Page layout, header, tiles, which charts show | `components/progress.tsx` | `/progress` shows a theme button (`showThemeToggle`); the CMS has its own in the sidebar |
| Stat tile, change badge | `components/stat-tile.tsx` | Change shows an arrow and a sign, never color alone |
| Column chart (revenue, weekdays) | `components/column-chart.tsx` | Bars ≤ 24px, 4px rounded top; axis labels thin out to stay apart |
| Pace chart and its legend | `components/pace-chart.tsx` | This period solid `--chart-1` with a 10% wash, previous dashed `--chart-2` |
| Top products bars | `components/top-products.tsx` | |
| Tooltip, hover and keyboard, card frame, resize | `components/chart-parts.tsx` | Charts take focus; ← → Home End move the tooltip |
| Chart colors | `--chart-1`, `--chart-2` in both theme blocks of `client/app/globals.css` | Re-check color-vision separation and ≥ 3:1 against `--card` in both modes |
| Loading | `components/progress-loader.tsx`, `client/app/progress/page.tsx`, `client/app/cms/progress/page.tsx` | Loads in the browser (`useLoad`; the route needs the session), the page passes a `fallback`; `null` entries shows "Couldn’t load sales" |

## Rules that must stay true

- Dates are the tracker's Manila `DayKey`s; "today" is computed once in the loader on the server and passed down, so server and browser render the same buckets.
- One axis per chart; charts are hand-drawn SVG (no chart library).
- Text never wears a chart color; marks carry it, and legends or tooltips key it with a short line.
- Product names are matched case-insensitively, like the tracker's day products.
