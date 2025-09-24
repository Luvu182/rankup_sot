'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Đã xảy ra lỗi!</h2>
        <p className="text-muted-foreground">
          {error.message || 'Có lỗi xảy ra khi tải trang'}
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => reset()}>Thử lại</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Về Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}