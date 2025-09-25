# API Duplicate Prevention Best Practices

This directory contains utilities and hooks for preventing duplicate API calls and managing request state in a React/Next.js application.

## Overview

The solution provides multiple layers of protection against duplicate API calls:

1. **Request Deduplication** - Prevents multiple identical concurrent requests
2. **Component Lifecycle Management** - Handles component mount/unmount properly
3. **State Management** - Centralized tracking of request states
4. **Idempotency Support** - Ensures operations can be safely retried
5. **AbortController Integration** - Cancels requests when components unmount

## Core Utilities

### 1. API Utils (`/lib/api-utils.ts`)

#### deduplicatedFetch
Wrapper around fetch that prevents duplicate concurrent requests:

```typescript
const response = await deduplicatedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data })
});
```

#### useDeduplicatedRequest
React hook for deduplicated requests with AbortController:

```typescript
const { executeRequest, abort } = useDeduplicatedRequest();

const response = await executeRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify({ data })
});
```

#### useIdempotentOperation
Hook for operations that should return cached results within a time window:

```typescript
const { execute } = useIdempotentOperation('operation-name', 5000);

const result = await execute('unique-id', async () => {
  // Your operation
});
```

### 2. Lifecycle Hooks (`/lib/hooks/use-prevent-duplicate.ts`)

#### useDebounceCallback
Debounces function calls to prevent rapid firing:

```typescript
const debouncedSearch = useDebounceCallback(
  (query: string) => searchAPI(query),
  500 // 500ms delay
);
```

#### useAsyncOperation
Manages async operations with loading states and cooldown:

```typescript
const operation = useAsyncOperation(
  () => saveData(),
  {
    cooldownMs: 3000,
    onSuccess: (data) => console.log('Success:', data),
    onError: (error) => console.error('Error:', error)
  }
);

// Usage
await operation.execute();
```

#### useSingletonOperation
Ensures only one instance of an operation runs globally:

```typescript
const { execute } = useSingletonOperation({
  key: 'global-sync',
  cooldownMs: 5000
});
```

### 3. Request Manager (`/lib/state/request-manager.ts`)

Centralized state management for requests:

#### useManagedRequest
Complete request lifecycle management with retries:

```typescript
const request = useManagedRequest(
  'request-id',
  () => fetch('/api/data'),
  {
    maxRetries: 3,
    retryDelay: 1000,
    onSuccess: (data) => console.log('Success'),
    onError: (error) => console.error('Failed after retries')
  }
);

await request.execute();
```

## Implementation Examples

### Example 1: Simple API Call with Deduplication

```typescript
import { deduplicatedFetch } from '@/lib/api-utils';

export async function saveProject(data: ProjectData) {
  try {
    const response = await deduplicatedFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to save project');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Save project error:', error);
    throw error;
  }
}
```

### Example 2: Component with Lifecycle Management

```typescript
import { useAsyncOperation, useIsMounted } from '@/lib/hooks/use-prevent-duplicate';

export function ProjectForm() {
  const isMounted = useIsMounted();
  
  const saveOperation = useAsyncOperation(
    async () => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      if (!isMounted()) {
        throw new Error('Component unmounted');
      }
      
      return response.json();
    },
    {
      cooldownMs: 3000,
      onSuccess: () => toast.success('Project saved!'),
      onError: () => toast.error('Failed to save project')
    }
  );

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      saveOperation.execute();
    }}>
      {/* Form fields */}
      <Button 
        type="submit" 
        disabled={saveOperation.isLoading}
      >
        {saveOperation.isLoading ? 'Saving...' : 'Save'}
      </Button>
    </form>
  );
}
```

### Example 3: API Route with Idempotency

```typescript
import { requestManager } from '@/lib/state/request-manager';

export async function POST(request: Request) {
  const { userId } = await auth();
  const { projectId, idempotencyKey } = await request.json();
  
  const requestId = idempotencyKey || `sync-${userId}-${projectId}`;
  
  // Check for duplicate request
  if (requestManager.isRequestInProgress(requestId)) {
    return NextResponse.json(
      { error: 'Operation already in progress' },
      { status: 409 }
    );
  }
  
  // Check for recent success
  const existing = requestManager.getRequest(requestId);
  if (existing?.status === 'success' && 
      Date.now() - existing.timestamp < 300000) {
    return NextResponse.json(existing.data);
  }
  
  // Start new request
  requestManager.startRequest(requestId);
  
  try {
    const result = await performOperation();
    requestManager.completeRequest(requestId, result);
    return NextResponse.json(result);
  } catch (error) {
    requestManager.failRequest(requestId, error);
    throw error;
  }
}
```

## Best Practices

1. **Always use deduplication for API calls** - Prevents accidental duplicate requests
2. **Implement proper cleanup** - Use AbortController and cleanup effects
3. **Add cooldown periods** - Prevent rapid repeated operations
4. **Use idempotency keys** - Make operations safely retryable
5. **Track request state globally** - Prevent race conditions across components
6. **Handle errors gracefully** - Implement retry logic with backoff
7. **Check component mount status** - Avoid state updates on unmounted components

## Migration Guide

To migrate existing components:

1. Replace direct `fetch` calls with `deduplicatedFetch`
2. Wrap async operations in `useAsyncOperation`
3. Add idempotency keys to critical operations
4. Use `useManagedRequest` for complex request flows
5. Implement proper cleanup in useEffect hooks

## Testing

When testing components using these utilities:

1. Mock the request manager for unit tests
2. Test debounce behavior with fake timers
3. Verify cleanup on component unmount
4. Test retry logic and error handling
5. Ensure idempotency works correctly