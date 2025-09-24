"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "@/components/projects/project-form";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface ProjectSwitcherProps {
  className?: string;
}

export function ProjectSwitcher({ className }: ProjectSwitcherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Get current project ID from URL params
  const currentProjectId = searchParams.get("project") as Id<"projects"> | null;
  
  // Fetch all projects
  const projects = useQuery(api.projects.getProjects) || [];
  
  // Find current project
  const currentProject = projects.find(p => p._id === currentProjectId) || projects[0];

  const handleProjectSelect = (projectId: Id<"projects">) => {
    // Update URL with new project ID
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", projectId);
    
    // Navigate to the current page with new project
    router.push(`${window.location.pathname}?${params.toString()}`);
    setOpen(false);
  };

  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    setOpen(false);
    // Projects list will automatically update due to Convex reactivity
  };

  const handleProjectSettings = () => {
    if (currentProject) {
      router.push(`/projects/${currentProject._id}/settings`);
      setOpen(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-black border-white/10 text-white hover:bg-white/5",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {currentProject ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="truncate">{currentProject.name}</span>
                {!currentProject.domainVerified && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    Unverified
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-white/50">Select a project</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search projects..." />
          <CommandList>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project._id}
                  value={project.name}
                  onSelect={() => handleProjectSelect(project._id)}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        project.domainVerified ? "bg-green-500" : "bg-yellow-500"
                      )}
                    />
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {project.domain}
                      </p>
                    </div>
                    {currentProject?._id === project._id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCreateDialogOpen(true);
                }}
                className="relative flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground select-none outline-none"
                role="option"
                aria-selected="false"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create new project
              </div>
              {currentProject && (
                <div
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (currentProject) {
                      setOpen(false);
                      router.push(`/projects/${currentProject._id}/settings`);
                    }
                  }}
                  className="relative flex items-center px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground select-none outline-none"
                  role="option"
                  aria-selected="false"
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Project settings
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>

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
    </>
  );
}