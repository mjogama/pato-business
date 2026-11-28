import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "@/features/auth/components/sign-out";
import type { YearMonth } from "../lib/dates";
import { MONTH_NAMES, monthGrid, WEEKDAYS } from "../lib/dates";
import { holidayOf } from "../lib/holidays";
import type { DayGroup } from "../lib/totals";
import type { DayKey } from "../types";
import type { DayCellHandlers } from "./day-cell";
import { DayCell } from "./day-cell";
import { IconButton, PillButton } from "./ui/buttons";
import { Money } from "./ui/primitives";

/**
 * §7.1: month (700) + year (400), the controls (theme, ‹ Today ›), then the month revenue pill.
 * From 1024px: one row, title left, controls and pill in the right corner. Narrower: the title and the
 * controls share the first row (the controls wrap under the title only when they don't fit), and the
 * pill sits on its own row at the left.
 */
export const TitleRow = ({
  view,
  total,
  onPrev,
  onToday,
  onNext,
}: {
  view: YearMonth;
  total: number;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 lg:flex-nowrap lg:gap-x-6">
    <h1 className="m-0 min-w-0 font-display text-display-fluid tracking-display text-foreground">
      <span className="font-bold">{MONTH_NAMES[view.month]}</span>{" "}
      <span className="font-normal text-foreground-2">{view.year}</span>
    </h1>
    <div className="flex items-center gap-3 max-lg:contents">
      <div className="flex flex-none items-center gap-1.5">
        <ThemeToggle />
        <SignOutButton />
        <nav aria-label="Month" className="flex flex-none items-center gap-1.5">
          <IconButton aria-label="Previous month" onClick={onPrev}>
            <ChevronLeftIcon />
          </IconButton>
          <PillButton onClick={onToday}>Today</PillButton>
          <IconButton aria-label="Next month" onClick={onNext}>
            <ChevronRightIcon />
          </IconButton>
        </nav>
      </div>
      {/* Below 1024px: its own row, left. From 1024px: the rightmost item of the header row. */}
      <div className="max-lg:order-last max-lg:basis-full lg:flex-none">
        <Card
          role="region"
          aria-label={`${MONTH_NAMES[view.month]} revenue`}
          className="box-border h-touch w-fit flex-row items-center justify-center gap-2 rounded-pill bg-muted px-5 py-0 ring-1 ring-border"
        >
          <span className="text-body font-medium tracking-label whitespace-nowrap text-muted-foreground">
            {MONTH_NAMES[view.month]} revenue:
          </span>
          <Money amount={total} className="text-sum leading-none font-bold tracking-display text-honey" />
        </Card>
      </div>
    </div>
  </div>
);

interface MonthGridProps {
  view: YearMonth;
  days: Map<DayKey, DayGroup>;
  maxByMonth: (prefix: string) => number;
  todayKey: DayKey;
  selectedKey: DayKey | null;
  holdingKey: DayKey | null;
  onCellClick: (key: DayKey, event: MouseEvent<HTMLButtonElement>) => void;
  onCellKeyDown: (key: DayKey, event: KeyboardEvent<HTMLButtonElement>) => void;
  cellHandlers: (key: DayKey) => DayCellHandlers;
}

/** §7.2–7.3: Sunday-first weekday header and a 5- or 6-week grid. */
export const MonthGrid = ({
  view,
  days,
  maxByMonth,
  todayKey,
  selectedKey,
  holdingKey,
  onCellClick,
  onCellKeyDown,
  cellHandlers,
}: MonthGridProps) => (
  // Cells keep one size (`h-cell`, at least `cell-min` wide). When 7 of them fit (container ≥ 70rem =
  // 7 × cell-min), it's a normal week grid with a weekday header; narrower, the month's days wrap into
  // as many columns as fit, each cell showing its weekday instead.
  <div className="@container flex min-w-0 flex-col">
    <div aria-hidden="true" className="hidden grid-cols-7 border-b border-border pb-2 @min-[70rem]:grid">
      {WEEKDAYS.map((weekday) => (
        <span key={weekday} className="pr-2.5 text-right text-body font-medium text-muted-foreground">
          {weekday}
        </span>
      ))}
    </div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(var(--spacing-cell-min),1fr))] border-t border-l border-border @min-[70rem]:grid-cols-7 @min-[70rem]:border-t-0">
      {monthGrid(view).map((day) => (
        <DayCell
          key={day.key}
          day={day}
          group={days.get(day.key)}
          maxDayTotal={maxByMonth(day.key.slice(0, 7))}
          holiday={holidayOf(day.key)}
          isToday={day.key === todayKey}
          isSelected={day.key === selectedKey}
          isHolding={day.key === holdingKey}
          onClick={(event) => onCellClick(day.key, event)}
          onKeyDown={(event) => onCellKeyDown(day.key, event)}
          handlers={cellHandlers(day.key)}
        />
      ))}
    </div>
  </div>
);
