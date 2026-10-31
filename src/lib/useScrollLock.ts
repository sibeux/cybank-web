import { useEffect } from "react";

let lockCount = 0;
let originalOverflow = "";

/**
 * Hook to lock body scroll when any modal or drawer is active.
 * Uses reference counting so nested/stacked modals safely restore scroll.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [locked]);
}


