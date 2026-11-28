"use client";

import {
  ArrowUpRightIcon,
  BookOpenIcon,
  ChartNoAxesColumnIcon,
  ChartSplineIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  HouseIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  UtensilsCrossedIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { SidebarSignOut } from "@/features/auth/components/sign-out";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/cms/landing", live: "/", label: "Landing", Icon: HouseIcon },
  { href: "/cms/menu", live: "/menu", label: "Menu", Icon: UtensilsCrossedIcon },
  { href: "/cms/pre-orders", live: "/menu", label: "Pre-orders", Icon: ClipboardListIcon },
  { href: "/cms/recipes", live: "/recipes", label: "Recipes", Icon: BookOpenIcon },
  { href: "/cms/sales-tracker", live: "/sales-tracker", label: "Sales Tracker", Icon: ChartNoAxesColumnIcon },
  { href: "/cms/progress", live: "/progress", label: "Progress", Icon: ChartSplineIcon },
] as const;

/** Labels stay in place and fade, so the rail never reflows while it resizes. */
const LABEL = "truncate whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none";

const STORAGE_KEY = "pato.admin.sidebar.collapsed";

const NavLink = ({
  href,
  live,
  label,
  Icon,
  collapsed,
  current,
  onSelect,
}: {
  href: string;
  /** The public page this CMS page edits. */
  live: string;
  label: string;
  Icon: (typeof PAGES)[number]["Icon"];
  collapsed: boolean;
  current: boolean;
  onSelect: () => void;
}) => (
  <div className="relative">
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      aria-current={current ? "page" : undefined}
      onClick={onSelect}
      className={cn(
        "relative flex h-11 items-center gap-3 rounded-pill pr-12 pl-4.5 text-cell font-semibold outline-none transition-colors duration-300 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
        current ? "text-primary-foreground" : "text-foreground hover:bg-muted",
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
      <span className={cn(LABEL, collapsed && "opacity-0")} aria-hidden={collapsed}>
        {label}
      </span>
    </Link>
    <a
      href={live}
      inert={collapsed}
      aria-label={`Open the ${label} page`}
      title={`Open the ${label} page`}
      className={cn(
        "absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-pill opacity-70 outline-none transition-opacity duration-200 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
        current ? "text-primary-foreground" : "text-foreground",
        collapsed && "pointer-events-none opacity-0",
      )}
    >
      <ArrowUpRightIcon aria-hidden="true" className="size-4" />
    </a>
  </div>
);

/** Brand, the CMS pages and a link back to the public site. `collapsed` shrinks it to an icon rail. */
const SidebarContent = ({
  collapsed,
  onNavigate,
  onToggle,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  /** Present on the desktop rail only: the round button at the top that opens and closes it. */
  onToggle?: () => void;
}) => {
  const pathname = usePathname();
  // The highlight moves on click, before the page has finished loading, and settles on the real path after.
  const [target, setTarget] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: clear the pending target whenever the path changes
  useEffect(() => setTarget(null), [pathname]);
  const active = PAGES.findIndex((page) => (target ?? pathname).startsWith(page.href));
  return (
    <div className="flex h-full flex-col gap-4 p-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="relative h-11 shrink-0">
        <Link
          href="/cms"
          onClick={onNavigate}
          inert={collapsed}
          className={cn(
            LABEL,
            "absolute inset-y-0 left-4.5 flex items-center font-display text-entry-title font-bold",
            collapsed && "opacity-0",
          )}
        >
          Pato’s CMS
        </Link>
        {onToggle && (
          <Button
            variant="nav"
            size="icon-touch"
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            aria-expanded={!collapsed}
            onClick={onToggle}
            className={cn(
              "absolute top-0 transition-[left] duration-300 ease-in-out motion-reduce:transition-none",
              collapsed ? "left-1.5" : "left-[188px]",
            )}
          >
            {collapsed ? <PanelLeftOpenIcon aria-hidden="true" /> : <PanelLeftCloseIcon aria-hidden="true" />}
          </Button>
        )}
      </div>
      <nav aria-label="CMS pages" className="relative flex flex-1 flex-col content-start gap-1.5">
        <span
          aria-hidden="true"
          style={{ transform: `translateY(calc(${Math.max(active, 0)} * 3.125rem))` }}
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-11 rounded-pill bg-primary transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none",
            active < 0 && "opacity-0",
          )}
        />
        {PAGES.map((page, index) => (
          <NavLink
            key={page.href}
            {...page}
            collapsed={collapsed}
            current={index === active}
            onSelect={() => {
              setTarget(page.href);
              onNavigate?.();
            }}
          />
        ))}
      </nav>
      <div className="flex px-1.5">
        <ThemeToggle />
      </div>
      <a
        href="/"
        target="_blank"
        rel="noreferrer"
        title={collapsed ? "View site" : undefined}
        aria-label={collapsed ? "View site" : undefined}
        className="flex min-h-touch items-center gap-3 rounded-pill px-4.5 text-cell font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ExternalLinkIcon aria-hidden="true" className="size-5 shrink-0" />
        <span className={cn(LABEL, collapsed && "opacity-0")} aria-hidden={collapsed}>
          View site
        </span>
      </a>
      <SidebarSignOut collapsed={collapsed} />
    </div>
  );
};

/**
 * The CMS frame: a sidebar and a slim top bar around the page. From 900px the sidebar is a rail
 * that opens and closes (remembered in this browser); below that it is a drawer from the left.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const title = PAGES.find((page) => pathname.startsWith(page.href))?.label ?? "CMS";

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(STORAGE_KEY, value ? "0" : "1");
      } catch {}
      return !value;
    });
  };

  return (
    <div className="flex min-h-dvh flex-1">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-border bg-surface-2 transition-[width] duration-300 ease-in-out motion-reduce:transition-none min-[900px]:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div className="h-full w-64">
          <SidebarContent collapsed={collapsed} onToggle={toggle} />
        </div>
      </aside>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-72 max-w-[85vw] bg-surface-2 p-0">
          <SheetTitle className="sr-only">CMS pages</SheetTitle>
          <SheetDescription className="sr-only">Go to another page of the CMS.</SheetDescription>
          <SidebarContent collapsed={false} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background px-4 pt-[env(safe-area-inset-top)] min-[900px]:hidden">
          <div className="flex h-16 w-full items-center gap-3">
            <Button
              variant="nav"
              size="icon-touch"
              className="min-[900px]:hidden"
              aria-label="Open sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <MenuIcon aria-hidden="true" />
            </Button>
            <span className="min-w-0 flex-1 truncate font-display text-entry-title font-bold">{title}</span>
          </div>
        </header>
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
