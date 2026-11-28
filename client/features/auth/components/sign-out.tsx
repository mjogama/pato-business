"use client";

import { LogOutIcon, MonitorSmartphoneIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LOGIN_PATH } from "@/lib/api/auth-client";
import { apiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { logout, logoutEverywhere } from "../api";

/** Signs out (this browser, or every device), then goes to the login page. `error` is set when the call failed. */
function useSignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOut = async (everywhere = false) => {
    setPending(true);
    setError(null);
    try {
      await (everywhere ? logoutEverywhere() : logout());
      window.location.assign(LOGIN_PATH);
    } catch (failure) {
      setError(apiErrorMessage(failure));
      setPending(false);
    }
  };

  return { signOut, pending, error };
}

/**
 * 44×44 round button for the owner pages' headers, next to the theme toggle. Signs out this browser.
 * Hidden inside the CMS, whose sidebar has its own sign-out rows.
 */
export function SignOutButton({ className }: { className?: string }) {
  const { signOut, pending, error } = useSignOut();
  if (usePathname().startsWith("/cms")) return null;
  return (
    <>
      <Button
        variant="secondary"
        size="icon-touch"
        aria-label="Sign out"
        title={error ?? "Sign out"}
        disabled={pending}
        onClick={() => void signOut()}
        className={cn("shrink-0 bg-muted text-foreground", className)}
      >
        <LogOutIcon aria-hidden="true" />
      </Button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}

const ROW =
  "flex min-h-touch w-full items-center justify-start gap-3 rounded-pill px-4.5 text-left text-cell font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60";

const LABEL = "truncate whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none";

/** The CMS sidebar's "Sign out" and "Sign out everywhere" rows. `collapsed` hides the labels (icon rail). */
export function SidebarSignOut({ collapsed }: { collapsed: boolean }) {
  const here = useSignOut();
  const everywhere = useSignOut();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col">
      <Button
        variant="bare"
        className={ROW}
        disabled={here.pending}
        title={collapsed ? "Sign out" : undefined}
        aria-label={collapsed ? "Sign out" : undefined}
        onClick={() => void here.signOut()}
      >
        <LogOutIcon aria-hidden="true" className="size-5 shrink-0" />
        <span className={cn(LABEL, collapsed && "opacity-0")} aria-hidden={collapsed}>
          {here.pending ? "Signing out…" : "Sign out"}
        </span>
      </Button>
      {here.error && !collapsed && (
        <p role="alert" className="px-4.5 pb-1 text-label text-destructive">
          {here.error}
        </p>
      )}
      <Button
        variant="bare"
        className={ROW}
        title={collapsed ? "Sign out everywhere" : undefined}
        aria-label={collapsed ? "Sign out everywhere" : undefined}
        onClick={() => setConfirming(true)}
      >
        <MonitorSmartphoneIcon aria-hidden="true" className="size-5 shrink-0" />
        <span className={cn(LABEL, collapsed && "opacity-0")} aria-hidden={collapsed}>
          Sign out everywhere
        </span>
      </Button>

      <Dialog open={confirming} onOpenChange={(open) => !everywhere.pending && setConfirming(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out everywhere?</DialogTitle>
            <DialogDescription>
              Every phone, tablet and computer signed in to the owner pages is signed out, this one included. You’ll
              need your password to sign in again.
            </DialogDescription>
          </DialogHeader>
          {everywhere.error && (
            <p role="alert" className="text-label text-destructive">
              {everywhere.error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={everywhere.pending} onClick={() => setConfirming(false)}>
              Stay signed in
            </Button>
            <Button variant="destructive" disabled={everywhere.pending} onClick={() => void everywhere.signOut(true)}>
              {everywhere.pending ? "Signing out…" : "Sign out everywhere"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
