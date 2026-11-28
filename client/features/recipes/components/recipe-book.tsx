"use client";

import type { Recipe } from "@common/modules/recipes";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/components/sign-out";
import { newId } from "@/lib/id";
import { cn } from "@/lib/utils";
import { createRecipe, deleteRecipe, updateRecipe } from "../api";
import { cardGeometry } from "../lib/geometry";
import { BookCardFront } from "./book-card";
import { PlusIcon } from "./icons";
import { RecipeEditModal } from "./recipe-edit-modal";
import { RecipeModal } from "./recipe-modal";

const DRAG_THRESHOLD = 6;
const DEFAULT_CW = 440;

const blankRecipe = (): Recipe => ({ id: newId(), name: "", category: "Uncategorized", sections: [], steps: [] });

/** `initialRecipes` is `null` when loading them from the server failed. */
export function RecipeBook({ initialRecipes }: { initialRecipes: Recipe[] | null }) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes ?? []);
  // Start on the first recipe; with none, on the New recipe card.
  const [active, setActive] = useState(recipes.length > 0 ? 1 : 0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [multipliers, setMultipliers] = useState<Record<string, number>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [cw, setCw] = useState(DEFAULT_CW);
  const [ch, setCh] = useState(DEFAULT_CW * 1.5);

  const stageRef = useRef<HTMLElement>(null);
  const gesture = useRef({ id: -1, startX: 0, moved: false, captured: false });
  const wasDrag = useRef(false);

  const total = recipes.length + 1; // the New recipe card sits first (index 0), recipes follow
  const spacing = cw * 0.74;

  // Real card width, so ingredient counts and drag distances follow the CSS clamp().
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const probe = el.querySelector<HTMLElement>("[data-card]");
      if (!probe) return;
      setCw(probe.offsetWidth || DEFAULT_CW);
      setCh(probe.offsetHeight || DEFAULT_CW * 1.5);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const go = (i: number) => setActive(Math.max(0, Math.min(total - 1, i)));

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    gesture.current = { id: e.pointerId, startX: e.clientX, moved: false, captured: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.id !== e.pointerId) return;
    let dx = e.clientX - g.startX;
    if (!g.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      g.moved = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId); // only once dragging, so taps still reach the cards
    }
    if (!g.moved) return;
    const atEdge = (dx > 0 && active === 0) || (dx < 0 && active === total - 1);
    if (atEdge) dx *= 0.35;
    setDragX(dx);
  };

  const endGesture = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (g.id !== e.pointerId) return;
    g.id = -1;
    if (!g.moved) return;
    wasDrag.current = true;
    setTimeout(() => (wasDrag.current = false), 0);
    const dx = e.clientX - g.startX;
    if (e.type === "pointerup" && Math.abs(dx) > spacing * 0.22) {
      const n = Math.max(1, Math.round(Math.abs(dx) / spacing));
      go(active + (dx < 0 ? n : -n));
    }
    setDragging(false);
    setDragX(0);
  };

  const onCardClick = (i: number) => {
    if (wasDrag.current) return;
    if (i !== active) return go(i);
    if (i === 0) return setDraft(blankRecipe());
    setOpenId(recipes[i - 1].id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "ArrowLeft") go(active - 1);
    if (e.key === "ArrowRight") go(active + 1);
  };

  const openRecipe = recipes.find((r) => r.id === openId) ?? null;
  const editRecipe = draft ?? recipes.find((r) => r.id === editId) ?? null;
  // The editor replaces the viewer, and hands back to it when closed.
  const startEdit = (recipe: Recipe) => {
    setOpenId(null);
    setEditId(recipe.id);
  };
  const closeEdit = () => {
    if (draft) return setDraft(null);
    setOpenId(editId);
    setEditId(null);
  };
  // Failed requests throw, so the modal that called these can show the error and stay open.
  const saveRecipe = async ({ id, ...input }: Recipe) => {
    if (draft) {
      const created = await createRecipe(input);
      // Newest first, the same order the server lists them in.
      setRecipes((r) => [created, ...r]);
      setActive(1);
      return setDraft(null);
    }
    const saved = await updateRecipe(id, input);
    setRecipes((r) => r.map((x) => (x.id === saved.id ? saved : x)));
    closeEdit();
  };
  const removeRecipe = async (recipe: Recipe) => {
    await deleteRecipe(recipe.id);
    setOpenId(null);
    setRecipes((r) => r.filter((x) => x.id !== recipe.id));
    // One card fewer: stay in place, or step back if the last card was removed.
    setActive((a) => Math.min(a, recipes.length - 1));
  };

  return (
    <main className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden pt-3 pb-1">
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5">
        <ThemeToggle />
        <SignOutButton />
      </div>
      <h1 className="px-6 text-center font-display text-[length:clamp(28px,min(6vw,6dvh),52px)] leading-[1.1] font-bold tracking-[-0.6px]">
        Recipe Book
      </h1>

      <section
        ref={stageRef}
        aria-roledescription="carousel"
        aria-label="Recipes"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        className={cn(
          // The page never scrolls. --reserve is the height of everything but the card: the title
          // (its font size × 1.1 line height) plus ~96px for page padding, stage margins, counter
          // and dots. Width follows the screen width AND height, so on short phones (iPhone SE:
          // ~548px tall in Safari) the card shrinks to keep at least a 1.5 height ratio. Height then
          // fills the space left, up to 2× (tall phones such as the Infinix Note 30: ~393×780).
          // Up to 520px wide so tablets (Xiaomi Pad 6: ~800×1280) fill the screen; book-card.tsx
          // scales its contents up to the same width.
          "[--reserve:calc(96px+1.1*clamp(28px,min(6vw,6dvh),52px))]",
          "[--cw:clamp(200px,min(78vw,calc((100dvh-var(--reserve))/1.5)),520px)] [--stride:calc(var(--cw)*0.74)]",
          "[--ch:clamp(calc(var(--cw)*1.5),calc(100dvh-var(--reserve)),calc(var(--cw)*2))]",
          "relative isolate mt-2 h-[calc(var(--ch)+24px)] w-full touch-pan-y overflow-hidden select-none",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
      >
        {Array.from({ length: total }, (_, i) => {
          const d = i - active + dragX / spacing;
          const g = cardGeometry(d);
          const isActive = i === active;
          const isNewCard = i === 0;
          const recipe = isNewCard ? null : recipes[i - 1];
          const label = recipe
            ? `${recipe.name}, ${recipe.category}. ${isActive ? "Tap to open" : "Show this recipe"}`
            : isActive
              ? "New recipe"
              : "New recipe. Show this card";
          return (
            <Button
              variant="bare"
              key={recipe?.id ?? "new"}
              type="button"
              data-card
              aria-label={label}
              aria-current={isActive ? "true" : undefined}
              tabIndex={g.hidden ? -1 : 0}
              onClick={() => onCardClick(i)}
              style={{
                transform: `translate(-50%,-50%) translateX(calc(var(--stride) * ${g.x})) scale(${g.scale}) rotate(${g.rotate}deg)`,
                opacity: g.opacity,
                filter: `brightness(calc(1 - ${1 - g.brightness} * var(--card-dim)))`,
                zIndex: g.zIndex,
                pointerEvents: g.hidden ? "none" : undefined,
                transition: dragging
                  ? "none"
                  : "transform .42s cubic-bezier(.2,.8,.2,1), opacity .42s ease, filter .42s ease",
              }}
              className={cn(
                "absolute top-1/2 left-1/2 flex h-(--ch) w-(--cw) overflow-hidden rounded-book border text-foreground motion-reduce:transition-none!",
                isActive ? "border-line-active shadow-card-active" : "border-border shadow-card-side",
                !isNewCard && (isActive ? "bg-card" : "bg-surface-ghost"),
                isNewCard
                  ? "flex-col items-center justify-center gap-3 border-2 border-dashed bg-surface-new-card"
                  : undefined,
              )}
            >
              {recipe ? (
                <BookCardFront recipe={recipe} cw={cw} ch={ch} multiplier={multipliers[recipe.id] ?? 1} />
              ) : (
                <>
                  <PlusIcon className="size-14 text-muted-foreground" />
                  <span className="text-cell font-semibold text-muted-foreground">New recipe</span>
                </>
              )}
            </Button>
          );
        })}
      </section>

      <div className="mx-auto mt-1 flex w-full max-w-140 flex-col items-center gap-3 px-6">
        {initialRecipes === null && (
          <p role="alert" className="text-label text-destructive">
            Couldn&apos;t load recipes. Is the server running?
          </p>
        )}
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-label text-foreground-faint tabular">
            {active + 1} / {total}
          </p>
          <div className="flex items-center">
            {Array.from({ length: total }, (_, i) => (
              <Button
                variant="bare"
                // biome-ignore lint/suspicious/noArrayIndexKey: dots mirror the card positions
                key={i}
                type="button"
                aria-label={`Go to ${(i === 0 ? undefined : recipes[i - 1]?.name) ?? "New recipe"}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
                className="touch-target h-5 w-6.5"
              >
                <span
                  className={cn(
                    "h-2 rounded-pill transition-[width] duration-250 motion-reduce:transition-none",
                    i === active ? "w-5.5 bg-primary" : "w-2 bg-input",
                  )}
                />
              </Button>
            ))}
          </div>
        </div>
      </div>

      <RecipeModal
        recipe={openRecipe}
        multiplier={openRecipe ? (multipliers[openRecipe.id] ?? 1) : 1}
        onMultiplierChange={(m) => openRecipe && setMultipliers((all) => ({ ...all, [openRecipe.id]: m }))}
        onEdit={startEdit}
        onDelete={removeRecipe}
        onClose={() => setOpenId(null)}
      />
      <RecipeEditModal
        recipe={editRecipe}
        categories={recipes.map((r) => r.category)}
        isNew={draft !== null}
        onSave={saveRecipe}
        onClose={closeEdit}
      />
    </main>
  );
}
