"use client";

import type { ReactNode } from "react";

import { getSalesEntries } from "@/features/sales-tracker/api";
import { dayKeyOf, toLocalDateTime } from "@/features/sales-tracker/lib/dates";
import { useLoad } from "@/lib/use-load";

import { Progress } from "./progress";

const loadEntries = () => getSalesEntries();

/** Loads every sales entry in the browser (the route needs the owner's session); today is Manila's date. */
export function ProgressLoader({
  fallback,
  showThemeToggle = false,
}: {
  fallback: ReactNode;
  showThemeToggle?: boolean;
}) {
  const entries = useLoad(loadEntries);
  if (entries === undefined) return fallback;
  // `null` tells the page the request failed, so it can say so instead of showing empty charts.
  return <Progress entries={entries} today={dayKeyOf(toLocalDateTime(new Date()))} showThemeToggle={showThemeToggle} />;
}
