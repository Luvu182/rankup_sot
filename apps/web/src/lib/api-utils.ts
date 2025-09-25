/**
 * Utility functions for preventing duplicate API calls and managing request lifecycle
 */

interface CachedRequest {
  promise: Promise<Response>;
  timestamp: number;
}

// Cache for deduplicating concurrent requests
const requestCache = new Map<string, CachedRequest>();
const CACHE_DURATION = 1000; // 1 second for GET requests

/**
 * Creates a cache key for a request
 */
function getCacheKey(url: string, options?: RequestInit): string {
  const method = options?.method || 'GET';
  const body = options?.body ? JSON.stringify(options.body) : '';
  return `${method}:${url}:${body}`;
}

/**
 * Deduplicates concurrent identical requests
 */
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const cacheKey = getCacheKey(url, options);
  const now = Date.now();
  
  // Only cache GET requests or explicitly safe operations
  const shouldCache = !options?.method || options.method === 'GET';
  
  if (shouldCache) {
    const cached = requestCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_DURATION) {
      console.log('[API] Returning cached request for:', url);
      return cached.promise.then(r => r.clone());
    }
  }
  
  // Create new request
  const promise = fetch(url, options);
  
  if (shouldCache) {
    requestCache.set(cacheKey, { promise, timestamp: now });
    
    // Cleanup after cache duration
    setTimeout(() => {
      requestCache.delete(cacheKey);
    }, CACHE_DURATION);
  }
  
  return promise;
}

/**
 * Hook for managing request lifecycle with AbortController
 */
export function useDeduplicatedRequest() {
  const abortControllerRef = React.useRef<AbortController | null>(null);
  
  React.useEffect(() => {
    return () => {
      // Cleanup: abort any pending requests
      abortControllerRef.current?.abort();
    };
  }, []);
  
  const request = React.useCallback(async (
    url: string,
    options?: RequestInit
  ): Promise<Response> => {
    // Abort previous request if any
    abortControllerRef.current?.abort();
    
    // Create new AbortController
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await deduplicatedFetch(url, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[API] Request aborted:', url);
      }
      throw error;
    }
  }, []);
  
  return { request, abort: () => abortControllerRef.current?.abort() };
}

import React from 'react';

/**
 * Idempotency manager for preventing duplicate operations
 */
class IdempotencyManager {
  private operations = new Map<string, { 
    promise: Promise<any>;
    timestamp: number;
    result?: any;
  }>();
  
  private cooldownMs: number;
  
  constructor(cooldownMs = 5000) {
    this.cooldownMs = cooldownMs;
  }
  
  async execute<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.operations.get(key);
    
    // Return existing operation if within cooldown
    if (existing && now - existing.timestamp < this.cooldownMs) {
      console.log('[Idempotency] Returning existing operation for:', key);
      return existing.promise;
    }
    
    // Execute new operation
    const promise = operation();
    this.operations.set(key, { promise, timestamp: now });
    
    // Store result and cleanup after cooldown
    promise.then(result => {
      const op = this.operations.get(key);
      if (op) {
        op.result = result;
      }
      
      setTimeout(() => {
        this.operations.delete(key);
      }, this.cooldownMs);
    }).catch(() => {
      // Remove failed operations immediately
      this.operations.delete(key);
    });
    
    return promise;
  }
  
  hasRecentOperation(key: string): boolean {
    const existing = this.operations.get(key);
    if (!existing) return false;
    
    const now = Date.now();
    return now - existing.timestamp < this.cooldownMs;
  }
  
  getResult<T>(key: string): T | undefined {
    return this.operations.get(key)?.result;
  }
}

export const globalIdempotencyManager = new IdempotencyManager();

/**
 * Hook for idempotent operations
 */
export function useIdempotentOperation<T>(
  operationKey: string,
  cooldownMs = 5000
) {
  const manager = React.useMemo(
    () => new IdempotencyManager(cooldownMs),
    [cooldownMs]
  );
  
  const execute = React.useCallback(
    (operation: () => Promise<T>) => {
      return manager.execute(operationKey, operation);
    },
    [manager, operationKey]
  );
  
  const hasRecentOperation = React.useCallback(
    () => manager.hasRecentOperation(operationKey),
    [manager, operationKey]
  );
  
  return { execute, hasRecentOperation };
}

/**
 * Request queue for rate limiting
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private concurrency: number;
  private delay: number;
  
  constructor(concurrency = 1, delay = 100) {
    this.concurrency = concurrency;
    this.delay = delay;
  }
  
  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.process();
    });
  }
  
  private async process() {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrency);
      await Promise.all(batch.map(fn => fn()));
      
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }
    
    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();