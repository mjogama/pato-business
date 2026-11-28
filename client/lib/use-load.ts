"use client";

import { useEffect, useState } from "react";

/**
 * Runs `load` once in the browser, where the owner's session cookies are sent (the Next server can't see them:
 * they belong to the API's site). `undefined` while loading, `null` when it failed. Pass a stable function.
 */
export function useLoad<T>(load: () => Promise<T>): T | null | undefined {
  const [value, setValue] = useState<T | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (result) => !cancelled && setValue(result),
      () => !cancelled && setValue(null),
    );
    return () => {
      cancelled = true;
    };
  }, [load]);

  return value;
}
