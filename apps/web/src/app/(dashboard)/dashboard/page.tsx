"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/hooks/use-project";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import StatCard from "@/components/ui/stat-card";
import GlassCard from "@/components/ui/glass-card";
import GlassButton from "@/components/ui/glass-button";
import {
  Search,
  TrendingUp,
  Target,
  Activity,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink
} from "lucide-react";


export default function DashboardPage() {
  const { user } = useUser();
  const { projectId, project, loading: projectLoading } = useProject();
  const [stats, setStats] = useState({
    totalKeywords: 0,
    keywordsTop10: 0,
    avgPosition: 0,
    improvedKeywords: 0
  });
  const [recentRankings, setRecentRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectLoading) {
      // Still loading project data
      return;
    }
    
    if (project?.bigQueryProjectId) {
      fetchDashboardData();
    } else {
      // No project or no BigQuery ID
      setLoading(false);
    }
  }, [project, projectLoading]);

  async function fetchDashboardData() {
    if (!project?.bigQueryProjectId) return;
    
    try {
      setLoading(true);
      
      // Fetch stats using BigQuery project ID
      const statsResponse = await fetch(`/api/bigquery/dashboard-stats?projectId=${project.bigQueryProjectId}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        console.error('Failed to fetch stats:', await statsResponse.text());
      }

      // Fetch recent rankings
      const rankingsResponse = await fetch(`/api/bigquery/recent-rankings?projectId=${project.bigQueryProjectId}`);
      if (rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json();
        setRecentRankings(rankingsData);
      } else {
        console.error('Failed to fetch rankings:', await rankingsResponse.text());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export data');
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <PageHeader
              title="Dashboard"
              description="Theo dõi hiệu suất SEO của bạn"
              actions={
                <>
                  <GlassButton onClick={handleRefresh} size="md">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Làm mới
                  </GlassButton>
                  <GlassButton onClick={handleExport} variant="primary" size="md">
                    <Download className="w-4 h-4 mr-2" />
                    Xuất báo cáo
                  </GlassButton>
                </>
              }
            />

            {/* Check if project has BigQuery setup */}
            {project && !project.bigQueryProjectId ? (
              <GlassCard className="p-12 text-center mb-8">
                <div className="max-w-md mx-auto">
                  <Activity className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <h3 className="text-xl font-light text-white mb-2">
                    Dự án chưa được kết nối với BigQuery
                  </h3>
                  <p className="text-white/50 mb-6">
                    Vui lòng liên hệ quản trị viên để thiết lập kết nối dữ liệu cho dự án này.
                  </p>
                </div>
              </GlassCard>
            ) : loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StatCard
                  title="Tổng từ khóa"
                  value={stats.totalKeywords.toLocaleString()}
                  subtitle="từ khóa đang theo dõi"
                  icon={Search}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-0"
                />
                <StatCard
                  title="Top 10"
                  value={stats.keywordsTop10}
                  subtitle="từ khóa trong top 10"
                  icon={TrendingUp}
                  trend={{ value: 15, isPositive: true }}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
                />
                <StatCard
                  title="Vị trí trung bình"
                  value={stats.avgPosition ? `#${stats.avgPosition.toFixed(1)}` : "—"}
                  subtitle="trên Google"
                  icon={Target}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
                />
                <StatCard
                  title="Cải thiện"
                  value={stats.improvedKeywords}
                  subtitle="từ khóa tăng hạng"
                  icon={Activity}
                  trend={{ value: 8, isPositive: true }}
                  className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
                />
              </div>
            )}

            {/* Recent Rankings */}
            {project && !project.bigQueryProjectId ? null : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-light text-white/90">
                    Thay đổi gần đây
                  </h2>
                  <GlassButton size="sm">
                    Xem tất cả
                  </GlassButton>
                </div>

                {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : recentRankings.length === 0 ? (
                <GlassCard className="p-12 text-center">
                  <p className="text-white/50">Chưa có dữ liệu thay đổi thứ hạng</p>
                </GlassCard>
              ) : (
                <div className="space-y-3">
                  {recentRankings.map((item, idx) => (
                    <GlassCard 
                      key={idx} 
                      hover 
                      className="p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${600 + idx * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              item.change > 0 ? 'bg-green-500/10' : 
                              item.change < 0 ? 'bg-red-500/10' : 
                              'bg-gray-500/10'
                            }`}>
                              {item.change > 0 ? (
                                <ArrowUp className="w-5 h-5 text-green-400" />
                              ) : item.change < 0 ? (
                                <ArrowDown className="w-5 h-5 text-red-400" />
                              ) : (
                                <Minus className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-white mb-1">
                                {item.keyword}
                              </h3>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-white/50">
                                  Vị trí hiện tại: <span className="text-white/70 font-medium">#{item.current_position || "—"}</span>
                                </span>
                                <span className="text-white/50">
                                  Thay đổi: <span className={`font-medium ${
                                    item.change > 0 ? 'text-green-400' : 
                                    item.change < 0 ? 'text-red-400' : 
                                    'text-gray-400'
                                  }`}>
                                    {item.change > 0 ? '+' : ''}{item.change || '0'} vị trí
                                  </span>
                                </span>
                              </div>
                              {item.target_url && (
                                <a 
                                  href={`https://${item.target_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer" 
                                  className="inline-flex items-center gap-1 mt-1 text-xs text-white/40 hover:text-white/60 transition-colors"
                                >
                                  {item.target_url}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
              </div>
            )}
          </div>
  );
}
