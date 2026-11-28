import type { Metadata, Viewport } from "next";

import { RecipeBookLoader } from "@/features/recipes/components/recipe-book-loader";

export const viewport: Viewport = { themeColor: "#FFF8EC" };

export const metadata: Metadata = { title: "Recipe Book · Pato's Pâtisserie" };

export default function RecipesPage() {
  return (
    <RecipeBookLoader
      fallback={
        <main className="flex flex-1 items-center justify-center text-label text-foreground-faint">
          Loading recipes…
        </main>
      }
    />
  );
}
