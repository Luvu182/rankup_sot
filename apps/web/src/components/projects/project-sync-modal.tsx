"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { useSingletonOperation, useIsMounted } from "@/lib/hooks/use-prevent-duplicate";
import { globalIdempotencyManager } from "@/lib/api-utils";

interface ProjectSyncModalProps {
  open: boolean;
  projectId: Id<"projects">;
  bigQueryProjectId: string;
  projectName: string;
  projectDomain: string;
  onClose: () => void;
}

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 2000; // 2 seconds

export function ProjectSyncModal({
  open,
  projectId,
  bigQueryProjectId,
  projectName,
  projectDomain,
  onClose,
}: ProjectSyncModalProps) {
  const [status, setStatus] = useState<"syncing" | "success" | "error">("syncing");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedSync = useRef(false);
  const isMounted = useIsMounted();
  
  const updateSyncStatus = useMutation(api.projects.updateSyncStatus);
  
  // Use singleton operation to ensure only one sync happens globally
  const syncOperation = useSingletonOperation(
    `sync-project-${bigQueryProjectId}`,
    async () => await performSync()
  );

  const performSync = async (): Promise<void> => {
    console.log('[SYNC-MODAL] Starting BigQuery sync', { bigQueryProjectId });
    
    // Create AbortController for this request with timeout
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    // Set a timeout for the request (30 seconds)
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log('[SYNC-MODAL] Request timed out after 30 seconds');
    }, 30000);
    
    try {
      // Update status to syncing in Convex
      console.log('[SYNC-MODAL] Setting status to syncing for project:', projectId);
      await updateSyncStatus({
        projectId,
        status: "syncing",
      });

      // Use idempotency manager to prevent duplicate API calls
      const response = await globalIdempotencyManager.execute(
        `sync-bigquery-${bigQueryProjectId}`,
        async () => {
          const res = await fetch('/api/projects/sync-bigquery', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Idempotency-Key': `sync-${bigQueryProjectId}-${Date.now()}`
            },
            body: JSON.stringify({
              projectId: bigQueryProjectId,
              name: projectName,
              domain: projectDomain,
            }),
            signal: controller.signal
          });
          
          const data = await res.json();
          
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Sync failed');
          }
          
          return res;
        }
      );

      // Clear timeout
      clearTimeout(timeoutId);
      
      // Only update state if component is still mounted
      if (isMounted.current) {
        // Update status to synced
        console.log('[SYNC-MODAL] Updating status to synced for project:', {
          projectId,
          projectIdType: typeof projectId,
          projectIdValue: projectId
        });
        try {
          const updateResult = await updateSyncStatus({
            projectId,
            status: "synced",
          });
          console.log('[SYNC-MODAL] Status updated successfully in Convex:', updateResult);
        } catch (updateError) {
          console.error('[SYNC-MODAL] Failed to update status in Convex:', updateError);
          throw updateError;
        }

        setStatus("success");
        console.log('[SYNC-MODAL] Sync completed successfully');
        
        // Call onClose after a short delay to ensure state updates
        setTimeout(() => {
          if (isMounted.current) {
            onClose();
          }
        }, 1000);
      }
    } catch (err) {
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Check if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[SYNC-MODAL] Request aborted');
        return;
      }
      
      console.error('[SYNC-MODAL] BigQuery sync error:', err);
      
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        
        if (retryCount < MAX_RETRY_COUNT - 1) {
          // Retry after delay
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (isMounted.current) {
              syncOperation.execute();
            }
          }, RETRY_DELAY);
        } else {
          // Final failure after all retries
          setStatus("error");
          await updateSyncStatus({
            projectId,
            status: "failed",
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }
  };

  useEffect(() => {
    console.log('[SYNC-MODAL] useEffect triggered', { 
      open, 
      hasStartedSync: hasStartedSync.current,
      isExecuting: syncOperation.isExecuting,
      isGloballyExecuting: syncOperation.isGloballyExecuting 
    });
    
    if (open && !hasStartedSync.current && !syncOperation.isGloballyExecuting) {
      // Mark as started and execute
      hasStartedSync.current = true;
      syncOperation.execute();
    }
  }, [open, syncOperation]);

  useEffect(() => {
    // Separate cleanup effect that only runs on unmount
    return () => {
      if (!open) {
        console.log('[SYNC-MODAL] Cleaning up for project:', bigQueryProjectId);
        abortControllerRef.current?.abort();
      }
    };
  }, [open, bigQueryProjectId]);

  const handleRetry = () => {
    console.log('[SYNC-MODAL] Manual retry triggered');
    setStatus("syncing");
    setError(null);
    setRetryCount(0);
    syncOperation.execute();
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Only allow closing if sync is complete or failed
      if (!newOpen && (status === "success" || status === "error")) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-md" aria-describedby="sync-modal-description">
        <DialogHeader>
          <DialogTitle className="sr-only">Khởi tạo dự án</DialogTitle>
        </DialogHeader>
        <div id="sync-modal-description" className="flex flex-col items-center justify-center py-8 space-y-4">
          {status === "syncing" && (
            <>
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                {retryCount > 0 && (
                  <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {retryCount}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold">Đang khởi tạo dự án...</h3>
              <p className="text-sm text-gray-600 text-center">
                Đang thiết lập cơ sở dữ liệu cho dự án {projectName}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-orange-600">
                  Đang thử lại lần {retryCount}/{MAX_RETRY_COUNT - 1}...
                </p>
              )}
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500" />
              <h3 className="text-lg font-semibold">Khởi tạo thành công!</h3>
              <p className="text-sm text-gray-600 text-center">
                Dự án {projectName} đã sẵn sàng sử dụng
              </p>
              <Button onClick={onClose} className="mt-4">
                Bắt đầu sử dụng
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-red-500" />
              <h3 className="text-lg font-semibold">Không thể khởi tạo dự án</h3>
              <p className="text-sm text-gray-600 text-center">
                {error || 'Đã xảy ra lỗi khi khởi tạo dự án'}
              </p>
              <p className="text-xs text-gray-500 text-center mt-2">
                Vui lòng thử lại hoặc liên hệ admin để được hỗ trợ
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>
                  Đóng
                </Button>
                <Button onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Thử lại
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}