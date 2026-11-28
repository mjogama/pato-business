"use client";

import type { ReactNode } from "react";

import { useLoad } from "@/lib/use-load";

import { getProductSuggestions, getSalesEntries } from "../api";
import { SalesTracker } from "./sales-tracker";

const loadTracker = () => Promise.all([getSalesEntries().catch(() => null), getProductSuggestions().catch(() => [])]);

/** Loads entries and product suggestions in the browser (the routes need the owner's session), then hands them to the calendar. */
export function SalesTrackerLoader({ fallback }: { fallback: ReactNode }) {
  const loaded = useLoad(loadTracker);
  if (loaded === undefined) return fallback;
  // `null` entries tell the calendar the request failed, so it can say so instead of showing an empty month.
  const [entries, suggestions] = loaded ?? [null, []];
  return <SalesTracker initialEntries={entries} initialSuggestions={suggestions} />;
}
