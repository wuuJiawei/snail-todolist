import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as storageOps from "@/data/operations";
import { canPerformOperation, requiresAuth, subscribeToProjectMemberships } from "@/data/operations";
import { projectKeys, projectQueries } from "@/queries/projectQueries";
import type { Project } from "@/types/project";

interface ProjectContextType {
  projects: Project[];
  loading: boolean;
  createProject: (data: Partial<Project>) => Promise<void>;
  editProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  reorderProjects: (projectId: string, newIndex: number) => Promise<void>;
  refreshProjects: () => Promise<void>;
  updateProjectCounts: (projectCounts: Record<string, number>) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const canLoad = canPerformOperation(user);
  const {
    data: projectRows = [],
    isPending,
    isError,
  } = useQuery({ ...projectQueries.list(), enabled: canLoad });

  const projects = useMemo(
    () => projectRows.map((project) => ({ ...project, count: projectCounts[project.id] ?? 0 })),
    [projectRows, projectCounts],
  );
  const loading = canLoad && isPending;

  const setProjects = useCallback((updater: Project[] | ((current: Project[]) => Project[])) => {
    queryClient.setQueryData<Project[]>(projectKeys.list(), (current = []) =>
      typeof updater === "function" ? updater(current) : updater
    );
  }, [queryClient]);

  const refreshProjects = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: projectKeys.all });
    await queryClient.fetchQuery(projectQueries.list());
  }, [queryClient]);

  useEffect(() => {
    if (canLoad) return;
    setProjectCounts({});
    queryClient.removeQueries({ queryKey: projectKeys.all });
  }, [canLoad, queryClient]);

  useEffect(() => {
    if (!isError) return;
    toast({
      title: "获取清单失败",
      description: "无法加载清单数据，请稍后再试",
      variant: "destructive",
    });
  }, [isError]);

  useEffect(() => {
    if (!user) return;
    const ownedIds = projectRows.filter((project) => project.user_id === user.id).map((project) => project.id);
    return subscribeToProjectMemberships(user.id, ownedIds, () => {
      void refreshProjects();
    });
  }, [user, projectRows, refreshProjects]);

  useEffect(() => {
    const handleTaskCountsUpdate = (event: CustomEvent<{ projectCounts: Record<string, number> }>) => {
      setProjectCounts(event.detail.projectCounts);
    };
    window.addEventListener("task-counts-updated", handleTaskCountsUpdate as EventListener);
    return () => window.removeEventListener("task-counts-updated", handleTaskCountsUpdate as EventListener);
  }, []);

  const createProject = useCallback(async (data: Partial<Project>) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "创建失败",
          description: "您需要登录才能创建清单",
          variant: "destructive",
        });
        return;
      }

      const newProject = await storageOps.createProject({
        name: data.name || "新清单",
        icon: data.icon || "folder",
        color: data.color || "#4CAF50",
        view_type: data.view_type || "list",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id,
        sort_order: (projectRows.length + 1) * 1000,
      });

      if (newProject) {
        await refreshProjects();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast({ title: "创建失败", description: "无法创建清单，请稍后再试", variant: "destructive" });
      throw error;
    }
  }, [user, projectRows.length, refreshProjects]);

  const editProject = useCallback(async (id: string, data: Partial<Project>) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "更新失败",
          description: "您需要登录才能修改清单",
          variant: "destructive",
        });
        return;
      }

      const updatedProject = await storageOps.updateProject(id, {
        ...data,
        updated_at: new Date().toISOString(),
      });
      if (updatedProject) {
        setProjects((current) =>
          current.map((project) => project.id === id ? { ...project, ...updatedProject } : project)
        );
      }
    } catch (error) {
      console.error("Error updating project:", error);
      toast({ title: "更新失败", description: "无法更新清单，请稍后再试", variant: "destructive" });
      throw error;
    }
  }, [user, setProjects]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除清单",
          variant: "destructive",
        });
        return;
      }

      if (!await storageOps.deleteProject(id)) throw new Error("delete project failed");
      setProjects((current) => current.filter((project) => project.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({ title: "删除失败", description: "无法删除清单，请稍后再试", variant: "destructive" });
      throw error;
    }
  }, [user, setProjects]);

  const reorderProjects = useCallback(async (projectId: string, newIndex: number) => {
    if (requiresAuth(user)) {
      toast({
        title: "排序失败",
        description: "您需要登录才能重新排序清单",
        variant: "destructive",
      });
      return;
    }

    const previousProjects = [...projectRows];
    const currentIndex = previousProjects.findIndex((project) => project.id === projectId);
    if (currentIndex === -1 || currentIndex === newIndex) return;

    const reordered = [...previousProjects];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(newIndex, 0, moved);
    const withSortOrder = reordered.map((project, index) => ({
      ...project,
      sort_order: (index + 1) * 1000,
    }));
    setProjects(withSortOrder);

    try {
      const success = await storageOps.batchUpdateProjectSortOrder(
        withSortOrder.map((project) => ({ id: project.id, sort_order: project.sort_order })),
      );
      if (!success) throw new Error("reorder projects failed");
      toast({ title: "清单已重新排序", description: "清单顺序已更新" });
    } catch (error) {
      setProjects(previousProjects);
      console.error("Error reordering projects:", error);
      toast({
        title: "排序失败",
        description: "无法更新清单顺序，请稍后再试",
        variant: "destructive",
      });
    }
  }, [user, projectRows, setProjects]);

  const value = useMemo(() => ({
    projects,
    loading,
    createProject,
    editProject,
    deleteProject,
    reorderProjects,
    refreshProjects,
    updateProjectCounts: setProjectCounts,
  }), [projects, loading, createProject, editProject, deleteProject, reorderProjects, refreshProjects]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
};
