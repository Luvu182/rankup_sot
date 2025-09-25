"use client";

import { useState } from "react";
import { Loader2, Database, CheckCircle, XCircle, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import GlassCard from "@/components/ui/glass-card";
import GlassButton from "@/components/ui/glass-button";

export default function DebugPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [convexData, setConvexData] = useState<any>(null);
  const [convexLoading, setConvexLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [cleanLoading, setCleanLoading] = useState(false);
  const [cleanResult, setCleanResult] = useState<any>(null);
  const [duplicateData, setDuplicateData] = useState<any>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);

  const checkBigQuery = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch('/api/debug/check-bigquery-projects');
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkConvex = async () => {
    setConvexLoading(true);
    setConvexData(null);

    try {
      const response = await fetch('/api/debug/check-convex-projects');
      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
      } else {
        setConvexData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setConvexLoading(false);
    }
  };

  const syncAllProjects = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    setError(null);

    try {
      const response = await fetch('/api/debug/sync-existing-projects', {
        method: 'POST'
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
      } else {
        setSyncResult(result);
        // Refresh both Convex and BigQuery data
        await checkConvex();
        await checkBigQuery();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncLoading(false);
    }
  };

  const cleanBigQuery = async () => {
    if (!confirm('Bạn có chắc muốn xóa TẤT CẢ dữ liệu trong BigQuery? Hành động này không thể hoàn tác!')) {
      return;
    }

    setCleanLoading(true);
    setCleanResult(null);
    setError(null);

    try {
      const response = await fetch('/api/debug/clean-bigquery', {
        method: 'POST'
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
      } else {
        setCleanResult(result);
        // Refresh BigQuery data
        await checkBigQuery();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCleanLoading(false);
    }
  };

  const checkDuplicates = async () => {
    setDuplicateLoading(true);
    setDuplicateData(null);
    setError(null);

    try {
      const response = await fetch('/api/debug/check-duplicate-projects');
      const result = await response.json();

      if (!response.ok) {
        setError(result.error);
      } else {
        setDuplicateData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDuplicateLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Debug BigQuery"
        description="Kiểm tra kết nối và dữ liệu trong BigQuery"
      />

      <div className="space-y-6">
        {/* Convex Check */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              Convex Projects
            </h3>
            <GlassButton onClick={checkConvex} disabled={convexLoading}>
              {convexLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra Convex'
              )}
            </GlassButton>
          </div>

          {convexData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">Total Projects in Convex</p>
                  <p className="text-2xl font-semibold">{convexData.totalProjects}</p>
                </div>
              </div>

              {convexData.projects && convexData.projects.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm mb-2">Projects in Convex:</p>
                  <div className="space-y-2">
                    {convexData.projects.map((project: any) => (
                      <div key={project._id} className="bg-white/5 rounded-lg p-4">
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-white/60">{project.domain}</p>
                        <p className="text-xs text-white/40 mt-1 font-mono">
                          bigQueryProjectId: {project.bigQueryProjectId}
                        </p>
                        <p className="text-xs text-white/40">
                          Created: {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {convexData.projects && convexData.projects.length > 0 && data && data.totalProjects === 0 && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-400 mb-2">⚠️ Projects chưa được sync sang BigQuery</p>
                  <GlassButton 
                    onClick={syncAllProjects} 
                    disabled={syncLoading}
                    variant="gradient"
                    size="sm"
                  >
                    {syncLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Đang sync...
                      </>
                    ) : (
                      'Sync tất cả sang BigQuery'
                    )}
                  </GlassButton>
                </div>
              )}

              {syncResult && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-400">{syncResult.message}</p>
                  {syncResult.results && (
                    <div className="mt-2 text-sm">
                      {syncResult.results.map((r: any) => (
                        <p key={r.projectId} className={r.success ? 'text-green-400' : 'text-red-400'}>
                          {r.name}: {r.success ? '✓ Synced' : `✗ Failed: ${r.error}`}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* BigQuery Check */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="w-5 h-5" />
              BigQuery Connection
            </h3>
            <GlassButton onClick={checkBigQuery} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra BigQuery'
              )}
            </GlassButton>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {error}
              </p>
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {data.message}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/60 text-sm mb-1">User ID</p>
                  <p className="font-mono text-sm">{data.userId}</p>
                </div>
                <div>
                  <p className="text-white/60 text-sm mb-1">Total Projects</p>
                  <p className="text-2xl font-semibold">{data.totalProjects}</p>
                </div>
              </div>

              {data.tables && data.tables.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm mb-2">Available Tables:</p>
                  <div className="flex gap-2">
                    {data.tables.map((table: string) => (
                      <span key={table} className="px-3 py-1 bg-white/10 rounded-full text-sm">
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.projects && data.projects.length > 0 && (
                <div>
                  <p className="text-white/60 text-sm mb-2">Projects in BigQuery:</p>
                  <div className="space-y-2">
                    {data.projects.map((project: any) => (
                      <div key={project.project_id} className="bg-white/5 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-white/60">{project.domain}</p>
                            <p className="text-xs text-white/40 mt-1">ID: {project.project_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-white/60">
                              Created: {new Date(project.created_at.value).toLocaleDateString('vi-VN')}
                            </p>
                            {data.projectStats && (
                              <p className="text-sm text-white/60">
                                Keywords: {
                                  data.projectStats.find((s: any) => s.project_id === project.project_id)?.keyword_count || 0
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!data.projects || data.projects.length === 0) && (
                <div className="text-center py-8">
                  <p className="text-white/50">Không tìm thấy project nào trong BigQuery</p>
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* Clean BigQuery */}
        {data && data.projects && data.projects.length > 0 && (
          <GlassCard className="p-6 border-red-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                Clean BigQuery Database
              </h3>
            </div>
            
            <p className="text-sm text-white/60 mb-4">
              Xóa TẤT CẢ dữ liệu trong BigQuery cho user hiện tại. Hành động này không thể hoàn tác!
            </p>
            
            <GlassButton 
              onClick={cleanBigQuery}
              disabled={cleanLoading}
              variant="destructive"
              className="bg-red-600/20 hover:bg-red-600/30 border-red-500/50"
            >
              {cleanLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tất cả dữ liệu BigQuery
                </>
              )}
            </GlassButton>
            
            {cleanResult && (
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400">{cleanResult.message}</p>
                {cleanResult.results && cleanResult.results.length > 0 && (
                  <div className="mt-2 text-sm">
                    {cleanResult.results.map((r: any) => (
                      <p key={r.projectId} className={r.success ? 'text-green-400' : 'text-red-400'}>
                        {r.name}: {r.success ? '✓ Đã xóa' : `✗ Lỗi: ${r.error}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        )}
      </div>
    </div>
  );
}