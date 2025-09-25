import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook to prevent duplicate function calls using debounce
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
  
  return debouncedCallback;
}

/**
 * Hook for managing async operations with loading state and preventing duplicates
 */
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options?: {
    cooldownMs?: number;
    onSuccess?: (result: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);
  const lastExecutionRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const execute = useCallback(async () => {
    const now = Date.now();
    const cooldown = options?.cooldownMs ?? 0;
    
    // Check cooldown
    if (now - lastExecutionRef.current < cooldown) {
      console.log('[AsyncOperation] Skipping due to cooldown');
      return result;
    }
    
    // Already loading
    if (loading) {
      console.log('[AsyncOperation] Already loading');
      return result;
    }
    
    lastExecutionRef.current = now;
    setLoading(true);
    setError(null);
    
    try {
      const res = await operation();
      
      if (isMountedRef.current) {
        setResult(res);
        setLoading(false);
        options?.onSuccess?.(res);
      }
      
      return res;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      if (isMountedRef.current) {
        setError(error);
        setLoading(false);
        options?.onError?.(error);
      }
      
      throw error;
    }
  }, [operation, loading, result, options]);
  
  return {
    execute,
    loading,
    error,
    result,
    reset: () => {
      setLoading(false);
      setError(null);
      setResult(null);
    }
  };
}

/**
 * Hook for singleton operations that should only run once globally
 */
const globalOperations = new Set<string>();

export function useSingletonOperation(
  operationId: string,
  operation: () => Promise<void>
) {
  const [isExecuting, setIsExecuting] = useState(false);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Only clean up if this component initiated the operation
      if (isExecuting) {
        globalOperations.delete(operationId);
      }
    };
  }, [operationId, isExecuting]);
  
  const execute = useCallback(async () => {
    if (globalOperations.has(operationId)) {
      console.log(`[SingletonOperation] Operation ${operationId} already executing`);
      return;
    }
    
    console.log(`[SingletonOperation] Starting operation ${operationId}`);
    globalOperations.add(operationId);
    setIsExecuting(true);
    
    try {
      await operation();
      console.log(`[SingletonOperation] Operation ${operationId} completed`);
    } catch (error) {
      console.error(`[SingletonOperation] Operation ${operationId} failed:`, error);
      throw error;
    } finally {
      globalOperations.delete(operationId);
      if (isMountedRef.current) {
        setIsExecuting(false);
      }
    }
  }, [operationId, operation]);
  
  return {
    execute,
    isExecuting,
    isGloballyExecuting: globalOperations.has(operationId)
  };
}

/**
 * Hook to track if component is mounted
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return isMountedRef;
}

/**
 * Hook for safe state updates that only happen if component is mounted
 */
export function useSafeState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const isMountedRef = useIsMounted();
  
  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, [isMountedRef]);
  
  return [state, setSafeState] as const;
}

/**
 * Hook that only runs effect on updates, not on mount
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
) {
  const isMountedRef = useRef(false);
  
  useEffect(() => {
    if (isMountedRef.current) {
      return effect();
    } else {
      isMountedRef.current = true;
    }
  }, deps);
}