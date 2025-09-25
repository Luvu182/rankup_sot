import { useEffect, useRef } from 'react';

/**
 * useEffect that only runs once, even in React Strict Mode
 * Useful for operations that should not be repeated on re-mount
 */
export function useOnceEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList
) {
  const hasRun = useRef(false);
  const cleanup = useRef<(() => void) | void>();

  useEffect(() => {
    // In development with Strict Mode, effects run twice
    // This ensures it only runs once
    if (!hasRun.current) {
      hasRun.current = true;
      cleanup.current = effect();
    }

    return () => {
      // Only run cleanup if effect has run
      if (cleanup.current) {
        cleanup.current();
      }
      // Reset for next mount (in case component is truly unmounted and remounted)
      hasRun.current = false;
    };
  }, deps);
}

/**
 * Hook to detect if we're in development mode with Strict Mode
 */
export function useIsStrictMode() {
  const renderCount = useRef(0);
  const [isStrictMode, setIsStrictMode] = useState(false);

  useEffect(() => {
    renderCount.current += 1;
    
    // If effect runs twice immediately, we're in Strict Mode
    const timer = setTimeout(() => {
      if (renderCount.current > 1) {
        setIsStrictMode(true);
      }
      renderCount.current = 0;
    }, 10);

    return () => clearTimeout(timer);
  }, []);

  return isStrictMode;
}

import { useState } from 'react';