"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import { Plus, Search, Settings, Trash2, ExternalLink, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";

export default function ProjectsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Id<"projects"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch projects
  const projects = useQuery(api.projects.getProjects) || [];
  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  // Filter projects based on search
  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      // Find project info before deletion
      const projectInfo = projects.find(p => p._id === projectToDelete);
      if (!projectInfo) {
        throw new Error("Project not found");
      }
      
      // Delete from BigQuery first
      try {
        const bigQueryResponse = await fetch('/api/projects/delete-bigquery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectInfo.bigQueryProjectId,
          }),
        });
        
        if (!bigQueryResponse.ok) {
          console.error('BigQuery deletion failed:', await bigQueryResponse.text());
          // Continue with Convex deletion anyway
        }
      } catch (error) {
        console.error('BigQuery deletion error:', error);
        // Continue with Convex deletion anyway
      }
      
      // Delete from Convex
      await deleteProjectMutation({ projectId: projectToDelete });
      
      // Clear any project selection from URL
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('project') === projectToDelete) {
        currentUrl.searchParams.delete('project');
        router.push(currentUrl.pathname);
      }
      
      // Show success notification
      toast({
        title: "Project đã xóa thành công",
        description: `Dự án "${projectInfo.name}" đã được xóa khỏi hệ thống.`,
      });
      
      setProjectToDelete(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
      toast({
        title: "Lỗi xóa project",
        description: "Không thể xóa project. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    // The project list will automatically update due to Convex reactivity
    // Force refresh by resetting search to trigger re-render
    const currentSearch = searchTerm;
    setSearchTerm('');
    setTimeout(() => setSearchTerm(currentSearch), 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Projects</h1>
        <p className="text-muted-foreground">
          Manage your SEO tracking projects and monitor keyword rankings.
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? "No projects found matching your search."
                : "No projects yet. Create your first project to start tracking rankings."}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const syncStatus = project.syncStatus || "synced"; // Default to synced for old projects
            const isClickable = syncStatus === "synced";
            
            return (
              <Card
                key={project._id}
                className={`hover:shadow-lg transition-shadow ${isClickable ? 'cursor-pointer' : 'opacity-75'}`}
                onClick={() => isClickable && router.push(`/dashboard?project=${project._id}`)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        {syncStatus === "pending" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {syncStatus === "syncing" && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {syncStatus === "synced" && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {syncStatus === "failed" && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-1">
                        {project.domain}
                      </CardDescription>
                      {syncStatus === "failed" && project.syncError && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {project.syncRetryCount >= 3 ? 'Cần liên hệ admin' : 'Đang thử lại...'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/projects/${project._id}/settings`);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProjectToDelete(project._id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Keywords</p>
                    <p className="text-2xl font-semibold">
                      {project.cachedStats?.totalKeywords || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Position</p>
                    <p className="text-2xl font-semibold">
                      {project.cachedStats?.avgPosition
                        ? project.cachedStats.avgPosition.toFixed(1)
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Metadata */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(project.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new website to track keyword rankings and SEO performance.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm onSuccess={handleProjectCreated} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be
              undone and will permanently delete all associated keywords and ranking
              data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setProjectToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Đang xóa..." : "Delete Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}