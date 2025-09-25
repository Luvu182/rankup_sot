/**
 * Centralized request state management to prevent race conditions
 */

import { useState, useEffect } from 'react';

export interface RequestState {
  id: string;
  status: 'pending' | 'success' | 'error';
  timestamp: number;
  data?: any;
  error?: Error;
  retryCount: number;
}

/**
 * Global request manager using singleton pattern
 */
class RequestManager {
  private requests: Map<string, RequestState> = new Map();
  private listeners: Set<() => void> = new Set();

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  startRequest(id: string): boolean {
    const existingRequest = this.requests.get(id);
    
    // Check if request is already in progress
    if (existingRequest?.status === 'pending') {
      console.log(`[REQUEST-MANAGER] Request ${id} already in progress`);
      return false;
    }
    
    this.requests.set(id, {
      id,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: existingRequest?.retryCount || 0,
    });
    
    this.notifyListeners();
    return true;
  }

  completeRequest(id: string, data?: any) {
    const request = this.requests.get(id);
    
    if (request) {
      this.requests.set(id, {
        ...request,
        status: 'success',
        data,
        timestamp: Date.now(),
      });
      this.notifyListeners();
    }
  }

  failRequest(id: string, error: Error) {
    const request = this.requests.get(id);
    
    if (request) {
      this.requests.set(id, {
        ...request,
        status: 'error',
        error,
        timestamp: Date.now(),
      });
      this.notifyListeners();
    }
  }

  clearRequest(id: string) {
    this.requests.delete(id);
    this.notifyListeners();
  }

  getRequest(id: string): RequestState | undefined {
    return this.requests.get(id);
  }

  isRequestInProgress(id: string): boolean {
    const request = this.requests.get(id);
    return request?.status === 'pending';
  }

  canRetryRequest(id: string, maxRetries: number = 3): boolean {
    const request = this.requests.get(id);
    if (!request) return true;
    
    return request.status === 'error' && request.retryCount < maxRetries;
  }

  incrementRetryCount(id: string) {
    const request = this.requests.get(id);
    
    if (request) {
      this.requests.set(id, {
        ...request,
        retryCount: request.retryCount + 1,
      });
      this.notifyListeners();
    }
  }

  getAllRequests(): Map<string, RequestState> {
    return new Map(this.requests);
  }
}

// Global singleton instance
export const requestManager = new RequestManager();

/**
 * React hook for using the request manager
 */
export function useRequestManager() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = requestManager.subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, []);

  return {
    startRequest: requestManager.startRequest.bind(requestManager),
    completeRequest: requestManager.completeRequest.bind(requestManager),
    failRequest: requestManager.failRequest.bind(requestManager),
    clearRequest: requestManager.clearRequest.bind(requestManager),
    getRequest: requestManager.getRequest.bind(requestManager),
    isRequestInProgress: requestManager.isRequestInProgress.bind(requestManager),
    canRetryRequest: requestManager.canRetryRequest.bind(requestManager),
    incrementRetryCount: requestManager.incrementRetryCount.bind(requestManager),
    getAllRequests: requestManager.getAllRequests.bind(requestManager),
  };
}

/**
 * Hook for managed requests with automatic state tracking
 */
export function useManagedRequest<T = any>(
  requestId: string,
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  }
) {
  const {
    startRequest,
    completeRequest,
    failRequest,
    getRequest,
    isRequestInProgress,
    canRetryRequest,
    incrementRetryCount,
  } = useRequestManager();

  const execute = async (): Promise<T | null> => {
    // Check if request can be started
    if (!startRequest(requestId)) {
      console.log(`[MANAGED-REQUEST] Request ${requestId} blocked - already in progress`);
      return null;
    }

    try {
      const result = await requestFn();
      completeRequest(requestId, result);
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      failRequest(requestId, err);
      
      // Handle retry logic
      if (canRetryRequest(requestId, options?.maxRetries)) {
        incrementRetryCount(requestId);
        
        // Retry after delay
        if (options?.retryDelay) {
          setTimeout(() => {
            execute();
          }, options.retryDelay);
        }
      } else {
        options?.onError?.(err);
      }
      
      throw err;
    }
  };

  const requestState = getRequest(requestId);
  const isLoading = isRequestInProgress(requestId);

  return {
    execute,
    isLoading,
    data: requestState?.data as T | undefined,
    error: requestState?.error,
    status: requestState?.status,
    retryCount: requestState?.retryCount || 0,
  };
}

/**
 * Create a request mutex to ensure only one instance of a specific operation runs at a time
 */
export class RequestMutex {
  private locks = new Map<string, Promise<any>>();

  async acquire<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Wait for existing lock if any
    const existingLock = this.locks.get(key);
    if (existingLock) {
      console.log(`[MUTEX] Waiting for lock: ${key}`);
      try {
        await existingLock;
      } catch {
        // Ignore errors from previous operations
      }
    }

    // Create new lock
    const lockPromise = operation().finally(() => {
      // Release lock when done
      if (this.locks.get(key) === lockPromise) {
        this.locks.delete(key);
      }
    });

    this.locks.set(key, lockPromise);
    return lockPromise;
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  async waitForUnlock(key: string): Promise<void> {
    const lock = this.locks.get(key);
    if (lock) {
      try {
        await lock;
      } catch {
        // Ignore errors
      }
    }
  }
}

// Global mutex instance
export const globalRequestMutex = new RequestMutex();