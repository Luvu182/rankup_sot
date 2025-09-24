"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@Rankup-manager/backend/convex/_generated/api";
import type { Id } from "@Rankup-manager/backend/convex/_generated/dataModel";

// Custom hook to manage current project
export function useProject() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get project ID from URL params
  const projectIdFromUrl = searchParams.get("project") as Id<"projects"> | null;
  
  // Fetch all projects
  const projects = useQuery(api.projects.getProjects);
  
  // Determine current project
  const currentProject = useMemo(() => {
    if (!projects || projects.length === 0) return null;
    
    // If project ID in URL, find that project
    if (projectIdFromUrl) {
      const project = projects.find(p => p._id === projectIdFromUrl);
      if (project) return project;
    }
    
    // Otherwise, return first project
    return projects[0];
  }, [projects, projectIdFromUrl]);
  
  // Set project ID in URL if not present
  useEffect(() => {
    if (currentProject && !projectIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("project", currentProject._id);
      router.replace(`${window.location.pathname}?${params.toString()}`);
    }
  }, [currentProject, projectIdFromUrl, router, searchParams]);

  const switchProject = (newProjectId: Id<"projects">) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("project", newProjectId);
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return {
    projectId: currentProject?._id || null,
    projectName: currentProject?.name || "",
    project: currentProject,
    projects: projects || [],
    loading: projects === undefined,
    switchProject
  };
}