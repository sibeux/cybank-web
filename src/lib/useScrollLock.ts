import { useEffect } from "react";

/**
 * Hook to lock body scroll when any modal or drawer is active.
 * Restores original overflow style on unmount or when locked becomes false.
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [locked]);
}

