"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { useSingletonOperation } from "@/lib/hooks/use-prevent-duplicate";
import { deduplicatedFetch } from "@/lib/api-utils";
import { useManagedRequest } from "@/lib/state/request-manager";

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

export function ProjectSyncModalImproved({
  open,
  projectId,
  bigQueryProjectId,
  projectName,
  projectDomain,
  onClose,
}: ProjectSyncModalProps) {
  const [status, setStatus] = useState<"syncing" | "success" | "error">("syncing");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const updateSyncStatus = useMutation(api.projects.updateSyncStatus);
  
  // Use singleton operation to prevent duplicate syncs across component instances
  const { execute: executeSingletonSync } = useSingletonOperation({
    key: `sync-bigquery-${bigQueryProjectId}`,
    cooldownMs: 5000,
  });
  
  // Use managed request for state tracking
  const syncRequest = useManagedRequest(
    `sync-project-${bigQueryProjectId}`,
    async () => {
      // Create AbortController for this request
      abortControllerRef.current = new AbortController();
      
      // Update status to syncing in Convex
      await updateSyncStatus({
        projectId,
        status: "syncing",
      });

      // Use deduplicated fetch to prevent duplicate API calls
      const response = await deduplicatedFetch('/api/projects/sync-bigquery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: bigQueryProjectId,
          name: projectName,
          domain: projectDomain,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      // Update status to synced
      await updateSyncStatus({
        projectId,
        status: "synced",
      });

      return data;
    },
    {
      maxRetries: MAX_RETRY_COUNT,
      retryDelay: RETRY_DELAY,
      onSuccess: () => {
        setStatus("success");
      },
      onError: async (err) => {
        setError(err.message);
        setStatus("error");
        
        // Update sync status to failed
        try {
          await updateSyncStatus({
            projectId,
            status: "failed",
            error: err.message,
          });
        } catch (updateError) {
          console.error('[SYNC-MODAL] Failed to update sync status:', updateError);
        }
      },
    }
  );

  const syncToBigQuery = useCallback(async () => {
    console.log('[SYNC-MODAL] syncToBigQuery called', { 
      bigQueryProjectId,
      isLoading: syncRequest.isLoading,
      retryCount: syncRequest.retryCount 
    });
    
    // Execute as singleton to prevent duplicate syncs
    const result = await executeSingletonSync(async () => {
      return syncRequest.execute();
    });
    
    if (!result) {
      console.log('[SYNC-MODAL] Sync operation blocked by singleton');
    }
  }, [bigQueryProjectId, executeSingletonSync, syncRequest]);

  // Effect to handle initial sync when modal opens
  useEffect(() => {
    if (open && status === "syncing" && !syncRequest.isLoading && syncRequest.retryCount === 0) {
      syncToBigQuery();
    }
  }, [open, status, syncRequest.isLoading, syncRequest.retryCount, syncToBigQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleRetry = useCallback(() => {
    console.log('[SYNC-MODAL] Manual retry triggered');
    setStatus("syncing");
    setError(null);
    syncToBigQuery();
  }, [syncToBigQuery]);

  // Prevent modal from closing during sync
  const handleDialogChange = useCallback((open: boolean) => {
    if (!open && status === "syncing") {
      // Prevent closing during sync
      return;
    }
    if (!open) {
      onClose();
    }
  }, [status, onClose]);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-md" aria-describedby="sync-modal-description">
        <DialogHeader>
          <DialogTitle className="sr-only">Khởi tạo dự án</DialogTitle>
        </DialogHeader>
        <div id="sync-modal-description" className="flex flex-col items-center justify-center py-8 space-y-4">
          {status === "syncing" && (
            <>
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                {syncRequest.retryCount > 0 && (
                  <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                    {syncRequest.retryCount}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold">Đang khởi tạo dự án...</h3>
              <p className="text-sm text-gray-600 text-center">
                Đang thiết lập cơ sở dữ liệu cho dự án {projectName}
              </p>
              {syncRequest.retryCount > 0 && (
                <p className="text-xs text-orange-600">
                  Đang thử lại lần {syncRequest.retryCount}/{MAX_RETRY_COUNT}...
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
                <Button 
                  onClick={handleRetry}
                  disabled={syncRequest.isLoading}
                >
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