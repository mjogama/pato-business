import type { Metadata, Viewport } from "next";

import { SalesTrackerLoader } from "@/features/sales-tracker/components/sales-tracker-loader";

export const metadata: Metadata = {
  title: "Sales Tracker · Pato's Pâtisserie",
  description: "Daily revenue calendar",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#FFF8EC",
};

export default function SalesTrackerPage() {
  return (
    <SalesTrackerLoader
      fallback={
        <main className="page-padding flex min-h-dvh flex-1 items-center justify-center text-label text-foreground-faint">
          Loading sales…
        </main>
      }
    />
  );
}
