"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SignOutButton } from "@/features/auth/components/sign-out";
import { formatPeso } from "@/features/sales-tracker/lib/money";
import { groupByDay } from "@/features/sales-tracker/lib/totals";
import type { DayKey, SalesEntry } from "@/features/sales-tracker/types";

import {
  bucketsFor,
  change,
  cumulative,
  formatDayKey,
  RANGES,
  type RangeId,
  summarize,
  topProducts,
  totalsPerBucket,
  weekdayAverages,
} from "../lib/progress";
import { ChartCard } from "./chart-parts";
import { ColumnChart } from "./column-chart";
import { PaceChart, PaceLegend } from "./pace-chart";
import { Delta, StatTile } from "./stat-tile";
import { TopProducts } from "./top-products";

const UNIT: Record<RangeId, string> = { "7d": "day", "30d": "day", "90d": "week", "12m": "month" };

const plural = (count: number, word: string, many = `${word}s`) =>
  `${count.toLocaleString("en-PH")} ${count === 1 ? word : many}`;

/**
 * The Progress page: how sales are going, from the Sales Tracker's entries. The range filter scopes
 * every tile and chart below it. `entries` is `null` when loading failed.
 */
export function Progress({
  entries,
  today,
  showThemeToggle = false,
}: {
  entries: SalesEntry[] | null;
  today: DayKey;
  showThemeToggle?: boolean;
}) {
  const [range, setRange] = useState<RangeId>("30d");
  const days = useMemo(() => groupByDay(entries ?? []), [entries]);

  const view = useMemo(() => {
    const { current, previous } = bucketsFor(range, today);
    const totals = totalsPerBucket(days, current);
    const previousTotals = totalsPerBucket(days, previous);
    const summary = summarize(days, current);
    const previousSummary = summarize(days, previous);
    return {
      current,
      previous,
      totals,
      summary,
      previousSummary,
      pace: cumulative(totals),
      previousPace: cumulative(previousTotals),
      products: topProducts(days, current),
      weekdays: weekdayAverages(days, current, today),
    };
  }, [days, range, today]);

  const meta = RANGES.find((r) => r.id === range) ?? RANGES[1];
  const unit = UNIT[range];
  const { summary, previousSummary } = view;

  return (
    <main className="page-padding mx-auto flex w-full max-w-content flex-1 flex-col gap-section">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-display-fluid font-bold tracking-display text-foreground">Progress</h1>
          <p className="m-0 mt-1 text-body text-muted-foreground">
            How sales are going, from the{" "}
            <Link href="/sales-tracker" className="font-medium text-honey underline-offset-4 hover:underline">
              Sales Tracker
            </Link>
            .
          </p>
        </div>
        {showThemeToggle && (
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <SignOutButton />
          </div>
        )}
      </header>

      <ToggleGroup
        aria-label="Date range"
        variant="chip"
        size="chip"
        spacing={2.5}
        value={[range]}
        onValueChange={(next) => next[0] && setRange(next[0] as RangeId)}
        className="scrollbar-none max-w-full overflow-x-auto rounded-none p-1"
      >
        {RANGES.map((r) => (
          <ToggleGroupItem key={r.id} value={r.id}>
            {r.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {entries === null ? (
        <p role="alert" className="m-0 rounded-card bg-danger-bg px-5 py-4 text-body text-danger-alert-text">
          Couldn’t load sales. Refresh the page to try again.
        </p>
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              hero
              label="Revenue"
              value={formatPeso(summary.revenue)}
              footnote={<Delta value={change(summary.revenue, previousSummary.revenue)} against={meta.previous} />}
              className="col-span-2 lg:col-span-1"
            />
            <StatTile
              label="Entries"
              value={summary.entries.toLocaleString("en-PH")}
              footnote={<Delta value={change(summary.entries, previousSummary.entries)} against="previous" />}
            />
            <StatTile
              label="Items sold"
              value={summary.items.toLocaleString("en-PH")}
              footnote={<Delta value={change(summary.items, previousSummary.items)} against="previous" />}
            />
            <StatTile
              label="Best day"
              value={summary.bestDay ? formatPeso(summary.bestDay.total) : "—"}
              footnote={
                <p className="m-0 text-label text-muted-foreground">
                  {summary.bestDay
                    ? `${formatDayKey(summary.bestDay.key)} · ${plural(summary.sellingDays, "selling day")}`
                    : "No sales yet"}
                </p>
              }
              className="max-lg:col-span-2"
            />
          </section>

          <ChartCard
            title={`Revenue per ${unit}`}
            subtitle={`${view.current[0].long} to ${view.current[view.current.length - 1].long}`}
          >
            <ColumnChart
              label={`Revenue per ${unit} for the last ${meta.label}, ${formatPeso(summary.revenue)} in total`}
              points={view.totals.map((total) => ({
                key: total.bucket.from,
                short: total.bucket.short,
                long: total.bucket.long,
                value: total.revenue,
                detail: `${plural(total.entries, "entry", "entries")} · ${plural(total.items, "item")}`,
              }))}
            />
            <details className="group text-body">
              <summary className="w-fit cursor-pointer rounded-control text-label font-medium text-muted-foreground hover:text-foreground">
                Show as table
              </summary>
              <div className="mt-3 max-h-80 overflow-auto rounded-control ring-1 ring-border">
                <table className="w-full border-collapse text-left text-label">
                  <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium capitalize">{unit}</th>
                      <th className="px-3 py-2 text-right font-medium">Revenue</th>
                      <th className="px-3 py-2 text-right font-medium">Entries</th>
                      <th className="px-3 py-2 text-right font-medium">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.totals.map((total) => (
                      <tr key={total.bucket.from} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">{total.bucket.long}</td>
                        <td className="px-3 py-2 text-right text-foreground tabular">{formatPeso(total.revenue)}</td>
                        <td className="px-3 py-2 text-right text-foreground-2 tabular">{total.entries}</td>
                        <td className="px-3 py-2 text-right text-foreground-2 tabular">{total.items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </ChartCard>

          <div className="grid gap-section lg:grid-cols-2">
            <ChartCard title="Pace" subtitle={`Running revenue against the ${meta.previous}`} aside={<PaceLegend />}>
              <PaceChart
                current={view.pace}
                previous={view.previousPace}
                buckets={view.current}
                previousBuckets={view.previous}
              />
            </ChartCard>
            <ChartCard title="Top products" subtitle={`By revenue, last ${meta.label}`}>
              <TopProducts products={view.products} />
            </ChartCard>
          </div>

          <ChartCard title="Best weekdays" subtitle="Average revenue per day, days without sales count as ₱0">
            <ColumnChart
              height={200}
              label="Average revenue by weekday"
              points={view.weekdays.map((day) => ({
                key: day.weekday,
                short: day.weekday,
                long: `${day.weekday} average`,
                value: day.average,
                detail: `over ${plural(day.days, "day")}`,
              }))}
            />
          </ChartCard>
        </>
      )}
    </main>
  );
}
