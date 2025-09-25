"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  useDebounceCallback, 
  useAsyncOperation,
  useSingletonOperation 
} from "@/lib/hooks/use-prevent-duplicate";
import { useDeduplicatedRequest, useIdempotentOperation } from "@/lib/api-utils";
import { useManagedRequest } from "@/lib/state/request-manager";

/**
 * Example component demonstrating all duplicate prevention techniques
 */
export function DuplicatePreventionExample() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result}`]);
  };

  // 1. Debounced search - prevents rapid API calls while typing
  const debouncedSearch = useDebounceCallback(
    async (query: string) => {
      addResult(`Searching for: ${query}`);
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      addResult(`Search completed for: ${query}`);
    },
    500 // 500ms debounce
  );

  // 2. Async operation with lifecycle management
  const saveOperation = useAsyncOperation(
    async () => {
      addResult("Starting save operation...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Math.random() > 0.7) {
        throw new Error("Random save error");
      }
      return { id: Date.now(), message: "Saved successfully" };
    },
    {
      onSuccess: (data) => addResult(`Save success: ${data.message}`),
      onError: (error) => addResult(`Save error: ${error.message}`),
      cooldownMs: 3000 // 3 second cooldown
    }
  );

  // 3. Singleton operation - only one instance across all components
  const { execute: syncDatabase } = useSingletonOperation({
    key: "database-sync",
    cooldownMs: 5000
  });

  const handleDatabaseSync = async () => {
    const result = await syncDatabase(async () => {
      addResult("Starting database sync (singleton)...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      addResult("Database sync completed");
      return "Sync completed";
    });

    if (!result) {
      addResult("Database sync blocked - already running or in cooldown");
    }
  };

  // 4. Deduplicated fetch request
  const { executeRequest: fetchData, abort } = useDeduplicatedRequest();

  const handleFetchData = async () => {
    try {
      addResult("Fetching data with deduplication...");
      const response = await fetchData("/api/data", {
        method: "GET"
      });
      const data = await response.json();
      addResult(`Fetch completed: ${JSON.stringify(data)}`);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        addResult("Fetch aborted");
      } else {
        addResult(`Fetch error: ${(error as Error).message}`);
      }
    }
  };

  // 5. Idempotent operation
  const { execute: performIdempotentAction } = useIdempotentOperation(
    "user-action",
    5000 // 5 second cache
  );

  const handleIdempotentAction = async () => {
    const userId = "user-123";
    const result = await performIdempotentAction(
      userId,
      async () => {
        addResult(`Performing idempotent action for ${userId}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, timestamp: Date.now() };
      }
    );
    addResult(`Idempotent action result: ${JSON.stringify(result)}`);
  };

  // 6. Managed request with global state tracking
  const managedRequest = useManagedRequest(
    "example-managed-request",
    async () => {
      addResult("Executing managed request...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (Math.random() > 0.5) {
        throw new Error("Random managed request error");
      }
      return { data: "Managed request success" };
    },
    {
      maxRetries: 2,
      retryDelay: 1000,
      onSuccess: (data) => addResult(`Managed request success: ${data.data}`),
      onError: (error) => addResult(`Managed request failed after retries: ${error.message}`)
    }
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Duplicate Prevention Examples</h2>
      
      <div className="space-y-4">
        {/* Debounced Search */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">1. Debounced Search</h3>
          <input
            type="text"
            placeholder="Type to search (debounced)..."
            className="border p-2 rounded w-full"
            onChange={(e) => debouncedSearch(e.target.value)}
          />
          <p className="text-sm text-gray-600 mt-1">
            Prevents rapid API calls while typing
          </p>
        </div>

        {/* Async Operation */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">2. Async Operation with Cooldown</h3>
          <Button 
            onClick={() => saveOperation.execute()}
            disabled={saveOperation.isLoading}
          >
            {saveOperation.isLoading ? "Saving..." : "Save Data"}
          </Button>
          {saveOperation.error && (
            <p className="text-red-600 text-sm mt-2">
              Error: {saveOperation.error.message}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Prevents duplicate saves with 3s cooldown
          </p>
        </div>

        {/* Singleton Operation */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">3. Singleton Operation</h3>
          <Button onClick={handleDatabaseSync}>
            Sync Database (Singleton)
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Only one sync can run globally with 5s cooldown
          </p>
        </div>

        {/* Deduplicated Fetch */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">4. Deduplicated Fetch</h3>
          <div className="flex gap-2">
            <Button onClick={handleFetchData}>
              Fetch Data
            </Button>
            <Button onClick={() => abort()} variant="destructive">
              Abort
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Multiple identical requests return the same promise
          </p>
        </div>

        {/* Idempotent Operation */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">5. Idempotent Operation</h3>
          <Button onClick={handleIdempotentAction}>
            Perform Idempotent Action
          </Button>
          <p className="text-sm text-gray-600 mt-1">
            Cached for 5s to prevent duplicate operations
          </p>
        </div>

        {/* Managed Request */}
        <div className="border p-4 rounded">
          <h3 className="font-semibold mb-2">6. Managed Request with Retries</h3>
          <Button 
            onClick={() => managedRequest.execute()}
            disabled={managedRequest.isLoading}
          >
            {managedRequest.isLoading ? "Processing..." : "Execute Managed Request"}
          </Button>
          {managedRequest.retryCount > 0 && (
            <p className="text-orange-600 text-sm mt-1">
              Retry attempt: {managedRequest.retryCount}
            </p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            Global state tracking with automatic retries
          </p>
        </div>
      </div>

      {/* Results Log */}
      <div className="border p-4 rounded bg-gray-50">
        <h3 className="font-semibold mb-2">Activity Log</h3>
        <div className="space-y-1 text-sm font-mono max-h-64 overflow-y-auto">
          {results.map((result, index) => (
            <div key={index} className="text-gray-700">
              {result}
            </div>
          ))}
          {results.length === 0 && (
            <div className="text-gray-500">No activity yet...</div>
          )}
        </div>
      </div>
    </div>
  );
}