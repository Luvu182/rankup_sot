"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/hooks/use-project";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import GlassCard from "@/components/ui/glass-card";
import GlassButton from "@/components/ui/glass-button";
import {
  RefreshCw,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Globe,
  Monitor,
  Smartphone,
  Target,
  Clock,
  Filter
} from "lucide-react";

interface Ranking {
  keyword: string;
  position: number | null;
  target: number;
  change: number | null;
  priority: string;
  searchEngine: string;
  device: string;
  lastChecked: string;
  url: string | null;
  serpFeatures: string[];
}

export default function RankingsPage() {
  const { user } = useUser();
  const { projectId, projectName, loading: projectLoading } = useProject();
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");
  const [selectedKeyword, setSelectedKeyword] = useState("");

  useEffect(() => {
    if (projectId && !projectLoading) {
      fetchRankings();
    } else {
      setLoading(false);
    }
  }, [projectId, projectLoading]);

  async function fetchRankings() {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/rankings?projectId=${projectId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        setRankings(data.data || []);
      } else {
        const error = await response.json();
        console.error('API Error:', error);
        setRankings([]);
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }

  const handleRefresh = () => {
    fetchRankings();
  };

  const handleExport = () => {
    console.log('Export rankings');
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'high':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Stats calculation
  const stats = {
    totalTracked: rankings.length,
    withData: rankings.filter(r => r.position !== null).length,
    improved: rankings.filter(r => r.change && r.change > 0).length,
    declined: rankings.filter(r => r.change && r.change < 0).length,
    stable: rankings.filter(r => r.change === 0).length,
    newRankings: rankings.filter(r => r.change === null && r.position !== null).length
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <PageHeader
              title="Rankings"
              description={
                projectName 
                  ? `Theo dõi thứ hạng từ khóa cho ${projectName}`
                  : "Vui lòng chọn một dự án để xem thứ hạng từ khóa"
              }
              actions={
                projectId && (
                  <>
                    <GlassButton onClick={handleRefresh} size="md">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Cập nhật
                    </GlassButton>
                    <GlassButton onClick={handleExport} variant="primary" size="md">
                      <Download className="w-4 h-4 mr-2" />
                      Xuất báo cáo
                    </GlassButton>
                  </>
                )
              }
            />

            {/* Stats Overview */}
            {projectId && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Theo dõi</p>
                <p className="text-2xl font-light text-white">{stats.totalTracked}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Có dữ liệu</p>
                <p className="text-2xl font-light text-white">{stats.withData}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Cải thiện</p>
                <p className="text-2xl font-light text-green-400">{stats.improved}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Giảm hạng</p>
                <p className="text-2xl font-light text-red-400">{stats.declined}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Ổn định</p>
                <p className="text-2xl font-light text-gray-400">{stats.stable}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
              <GlassCard className="p-4 text-center">
                <p className="text-sm text-white/60">Ranking mới</p>
                <p className="text-2xl font-light text-blue-400">{stats.newRankings}</p>
                <p className="text-xs text-white/40 mt-1">từ khóa</p>
              </GlassCard>
            </div>
            )}

            {/* Date Range Filter */}
            {projectId && (
            <GlassCard className="p-4 mb-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-white/70">Khoảng thời gian:</span>
                <div className="flex gap-2">
                  {["1", "7", "30", "90"].map((days) => (
                    <GlassButton
                      key={days}
                      variant={dateRange === days ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => setDateRange(days)}
                    >
                      {days === "1" ? "24h" : `${days} ngày`}
                    </GlassButton>
                  ))}
                </div>
                <div className="ml-auto">
                  <GlassButton size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Bộ lọc
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
            )}

            {/* Rankings Table */}
            {!projectId ? (
              <GlassCard className="p-16 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Target className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Chưa chọn dự án</h3>
                  <p className="text-white/50">
                    Vui lòng chọn một dự án từ menu bên trái để xem dữ liệu thứ hạng từ khóa.
                  </p>
                  <GlassButton 
                    onClick={() => window.location.href = '/projects'} 
                    variant="primary"
                    size="md"
                    className="mt-4"
                  >
                    Quản lý dự án
                  </GlassButton>
                </div>
              </GlassCard>
            ) : loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : rankings.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-white/50">Không có dữ liệu ranking cho dự án này</p>
              </GlassCard>
            ) : (
              <div className="overflow-hidden rounded-lg border border-white/10">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                        Từ khóa
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Vị trí hiện tại
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Thay đổi
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Mục tiêu
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Khoảng cách
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Độ ưu tiên
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Thiết bị
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Cập nhật
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rankings.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className="group hover:bg-white/[0.02] transition-colors animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-white group-hover:text-white/90">
                              {item.keyword}
                            </p>
                            {item.url && (
                              <a 
                                href={`https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/60 transition-colors"
                              >
                                {item.url}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-semibold text-lg ${
                            item.position 
                              ? item.position <= 10 ? 'text-green-400' : item.position <= 20 ? 'text-yellow-400' : 'text-white'
                              : 'text-white/30'
                          }`}>
                            {item.position ? `#${item.position}` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-medium ${
                            item.change && item.change > 0 ? 'text-green-400' : 
                            item.change && item.change < 0 ? 'text-red-400' : 
                            'text-gray-400'
                          }`}>
                            {item.change !== null && item.change !== undefined ? (
                              <>
                                {item.change > 0 && <TrendingUp className="w-4 h-4" />}
                                {item.change < 0 && <TrendingDown className="w-4 h-4" />}
                                {item.change === 0 && <Minus className="w-4 h-4" />}
                                {item.change !== 0 && Math.abs(item.change)}
                              </>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-white/60">
                            <Target className="w-4 h-4" />
                            <span className="font-medium">#{item.target}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm ${
                            item.position && item.position <= item.target ? 'text-green-400' : 
                            item.position ? 'text-orange-400' : 'text-white/30'
                          }`}>
                            {item.position ? (
                              item.position <= item.target ? '✓ Đạt' : `${item.position - item.target} vị trí`
                            ) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 text-sm text-white/60">
                            {item.device === 'desktop' ? 
                              <Monitor className="w-4 h-4" /> :
                              <Smartphone className="w-4 h-4" />
                            }
                            <span className="capitalize">{item.device}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm text-white/60">
                            {new Date(item.lastChecked).toLocaleDateString('vi-VN')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
  );
}