import type { Metadata, Viewport } from "next";

import { ProgressLoader } from "@/features/progress/components/progress-loader";

export const metadata: Metadata = {
  title: "Progress · Pato's Pâtisserie",
  description: "How sales are going",
  robots: { index: false },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: "#FFF8EC",
};

export default function ProgressPage() {
  return (
    <ProgressLoader
      showThemeToggle
      fallback={
        <main className="page-padding flex min-h-dvh flex-1 items-center justify-center text-label text-foreground-faint">
          Loading progress…
        </main>
      }
    />
  );
}
