"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useProject } from "@/hooks/use-project";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/ui/page-header";
import GlassCard from "@/components/ui/glass-card";
import GlassButton from "@/components/ui/glass-button";
import { AddKeywordModal } from "@/components/keywords/add-keyword-modal";
import { ImportKeywordsModal } from "@/components/keywords/import-keywords-modal";
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Target,
  TrendingUp,
  Edit,
  Trash,
  MoreVertical,
  ChevronRight,
  Tag
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Keyword {
  keyword_id: string;
  keyword: string;
  current_position: number | null;
  target_position: number;
  position_diff: number | null;
  search_volume: number | null;
  category: string;
  priority: string;
  is_active: boolean;
  target_url: string | null;
}

export default function KeywordsPage() {
  const { user } = useUser();
  const { projectId, projectName, loading: projectLoading } = useProject();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (projectId && !projectLoading) {
      fetchKeywords();
    } else {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, projectId, projectLoading]);

  async function fetchKeywords() {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        projectId: projectId,
        search: searchTerm,
        category: selectedCategory,
        page: "1",
        limit: "50"
      });
      
      const response = await fetch(`/api/keywords?${params}`);
      if (response.ok) {
        const data = await response.json();
        setKeywords(data.data || []);
        setTotal(data.total || 0);
        setSubscription(data.subscription || null);
      } else {
        console.error('Failed to fetch keywords');
        setKeywords([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to fetch keywords:', error);
      setKeywords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const handleAddKeyword = () => {
    setShowAddModal(true);
  };

  const handleDeleteKeyword = async (keywordId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa từ khóa này?')) return;
    
    try {
      const response = await fetch(`/api/keywords?id=${keywordId}&projectId=${projectId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success("Đã xóa từ khóa");
        fetchKeywords();
      } else {
        const errorData = await response.json();
        console.error('Failed to delete keyword:', errorData);
        toast.error("Không thể xóa từ khóa", {
          description: errorData.message || errorData.error || 'Vui lòng thử lại sau'
        });
      }
    } catch (error) {
      console.error('Error deleting keyword:', error);
      toast.error("Lỗi khi xóa từ khóa", {
        description: 'Vui lòng thử lại sau'
      });
    }
  };

  const handleExport = () => {
    console.log('Export keywords');
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            <PageHeader
              title="Keywords"
              description={
                projectName 
                  ? (
                    <div className="space-y-1">
                      <p>{total} từ khóa đang được theo dõi cho {projectName}</p>
                      {subscription && (
                        <p className="text-sm text-white/50">
                          Đã sử dụng {subscription.keywordsUsed}/{subscription.keywordLimit} từ khóa
                        </p>
                      )}
                    </div>
                  )
                  : "Vui lòng chọn một dự án để xem từ khóa"
              }
              actions={
                projectId && (
                  <div className="flex gap-2">
                    <GlassButton onClick={handleExport} size="md">
                      <Download className="w-4 h-4 mr-2" />
                      Xuất file
                    </GlassButton>
                    <GlassButton onClick={() => setShowImportModal(true)} size="md">
                      <Upload className="w-4 h-4 mr-2" />
                      Import CSV
                    </GlassButton>
                    <GlassButton onClick={handleAddKeyword} variant="gradient" size="md">
                        <Plus className="w-4 h-4 mr-2" />
                      Thêm từ khóa
                    </GlassButton>
                  </div>
                )
              }
            />

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  placeholder="Tìm kiếm từ khóa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all"
                />
              </div>
              <GlassButton size="md">
                <Filter className="w-4 h-4 mr-2" />
                Bộ lọc
              </GlassButton>
            </div>

            {/* Keywords Table */}
            {!projectId ? (
              <GlassCard className="p-16 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Chưa chọn dự án</h3>
                  <p className="text-white/50">
                    Vui lòng chọn một dự án từ menu bên trái để quản lý từ khóa SEO.
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
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : keywords.length === 0 ? (
              <GlassCard className="p-12 text-center">
                <p className="text-white/50">Không tìm thấy từ khóa nào cho dự án này</p>
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
                        Mục tiêu
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Thay đổi
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Lượt tìm kiếm
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Độ ưu tiên
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-white/70 uppercase tracking-wider">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {keywords.map((keyword, idx) => (
                      <tr 
                        key={keyword.keyword_id} 
                        className="group hover:bg-white/[0.02] transition-colors animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-white group-hover:text-white/90">
                              {keyword.keyword}
                            </p>
                            <div className="flex items-center gap-2">
                              {keyword.category && (
                                <span className="inline-flex items-center gap-1 text-xs text-white/40">
                                  <Tag className="w-3 h-3" />
                                  {keyword.category}
                                </span>
                              )}
                              {keyword.target_url && (
                                <span className="text-xs text-white/40 truncate max-w-[200px]">
                                  {keyword.target_url}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-semibold text-lg ${
                            keyword.current_position 
                              ? keyword.current_position <= 10 ? 'text-green-400' : 'text-white'
                              : 'text-white/30'
                          }`}>
                            {keyword.current_position ? `#${keyword.current_position}` : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5 text-white/60">
                            <Target className="w-4 h-4" />
                            <span className="font-medium">#{keyword.target_position}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-medium ${
                            keyword.position_diff !== null && keyword.position_diff < 0 
                              ? 'text-green-400' 
                              : keyword.position_diff !== null && keyword.position_diff > 0
                              ? 'text-red-400'
                              : 'text-gray-400'
                          }`}>
                            {keyword.position_diff !== null ? (
                              <>
                                {keyword.position_diff < 0 && <TrendingUp className="w-4 h-4" />}
                                {keyword.position_diff !== 0 && Math.abs(keyword.position_diff)}
                              </>
                            ) : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white/70">
                            {keyword.search_volume ? keyword.search_volume.toLocaleString() : '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-md border ${getPriorityColor(keyword.priority)}`}>
                            {keyword.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <MoreVertical className="w-4 h-4 text-white/50" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border-white/10">
                              <DropdownMenuItem className="text-white/70 hover:text-white hover:bg-white/10">
                                <Edit className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={() => handleDeleteKeyword(keyword.keyword_id)}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Xóa
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Add Keyword Modal */}
            {projectId && (
              <>
                <AddKeywordModal
                  open={showAddModal}
                  onClose={() => setShowAddModal(false)}
                  projectId={projectId}
                  onSuccess={fetchKeywords}
                />
                <ImportKeywordsModal
                  open={showImportModal}
                  onClose={() => setShowImportModal(false)}
                  projectId={projectId}
                  onSuccess={fetchKeywords}
                />
              </>
            )}
          </div>
  );
}