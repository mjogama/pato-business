import { ProgressLoader } from "@/features/progress/components/progress-loader";

/** The Progress page as it is: charts of the Sales Tracker's entries (read only). */
export default function AdminProgressPage() {
  return (
    <ProgressLoader
      fallback={
        <main className="page-padding flex flex-1 items-center justify-center text-label text-foreground-faint">
          Loading progress…
        </main>
      }
    />
  );
}
