"use client";

import type { ReactNode } from "react";

import { useLoad } from "@/lib/use-load";

import { getRecipes } from "../api";
import { RecipeBook } from "./recipe-book";

const loadRecipes = () => getRecipes();

/** Loads recipes in the browser (the route needs the owner's session), then hands them to the carousel. */
export function RecipeBookLoader({ fallback }: { fallback: ReactNode }) {
  const recipes = useLoad(loadRecipes);
  if (recipes === undefined) return fallback;
  // `null` tells the book the request failed, so it can say so instead of showing an empty book.
  return <RecipeBook initialRecipes={recipes} />;
}
