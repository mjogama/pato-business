import { RecipeBookLoader } from "@/features/recipes/components/recipe-book-loader";

/** The Recipe Book as it is, with its own add, edit and delete. Sized to the space under the CMS top bar. */
export default function AdminRecipesPage() {
  return (
    <div className="flex h-[calc(100dvh-4rem-env(safe-area-inset-top))] min-[900px]:h-dvh min-h-0 flex-col overflow-hidden">
      <RecipeBookLoader
        fallback={
          <main className="flex flex-1 items-center justify-center text-label text-foreground-faint">
            Loading recipes…
          </main>
        }
      />
    </div>
  );
}
