"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Shield,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProjectForm } from "@/components/projects/project-form";
import { useToast } from "@/hooks/use-toast";

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const projectId = params.id as Id<"projects">;
  
  // Fetch project data - using safe version that returns null instead of throwing
  const project = useQuery(api.projects.getProjectSafe, { projectId });
  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  // Handle project not found
  useEffect(() => {
    // Only check after the query has loaded (project !== undefined)
    if (project === undefined) return;
    
    setHasChecked(true);
    
    if (!project) {
      toast({
        title: "Project không tồn tại",
        description: "Project này có thể đã bị xóa hoặc bạn không có quyền truy cập.",
        variant: "destructive",
      });
      router.push("/projects");
    }
  }, [project, router, toast]);

  const handleDeleteProject = async () => {
    if (!project) return;
    
    setIsDeleting(true);
    try {
      // Delete from BigQuery first
      try {
        const bigQueryResponse = await fetch('/api/projects/delete-bigquery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: project.bigQueryProjectId,
          }),
        });
        
        if (!bigQueryResponse.ok) {
          console.error('BigQuery deletion failed:', await bigQueryResponse.text());
        }
      } catch (error) {
        console.error('BigQuery deletion error:', error);
      }
      
      // Delete from Convex
      await deleteProjectMutation({ projectId });
      
      toast({
        title: "Project đã xóa thành công",
        description: `Dự án "${project.name}" đã được xóa khỏi hệ thống.`,
      });
      router.push("/projects");
    } catch (error) {
      toast({
        title: "Lỗi xóa project",
        description: "Không thể xóa project. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleProjectUpdated = () => {
    toast({
      title: "Settings saved",
      description: "Your project settings have been updated successfully.",
    });
  };

  // Show loading while query is loading or we haven't checked yet
  if (project === undefined || (!hasChecked && !project)) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  // If project is null and we've checked, the useEffect will redirect
  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Project Settings</h1>
            <p className="text-muted-foreground">
              Manage settings for {project.name}
            </p>
          </div>
        </div>
      </div>

      {/* Domain Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domain
              </CardTitle>
              <CardDescription>
                Your project's domain
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{project.domain}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your website domain for SEO tracking
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Settings Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Project Configuration</CardTitle>
          <CardDescription>
            Update your project settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            project={{
              _id: project._id,
              name: project.name,
              domain: project.domain,
              isPublic: project.isPublic,
              settings: project.settings,
            }}
            onSuccess={handleProjectUpdated}
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all associated data
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project
              "{project.name}" and remove all associated keywords, rankings, and
              historical data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}