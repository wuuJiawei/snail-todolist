
import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { getDataProvider } from "@/data";
import { Project } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectStore } from "@/store/projectStore";
import * as storageOps from "@/data/operations";
import { canPerformOperation, requiresAuth } from "@/data/operations";

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
  const projects = useProjectStore(state => state.projects);
  const loading = useProjectStore(state => state.loading);
  const hasLoaded = useProjectStore(state => state.hasLoaded);
  const setProjects = useProjectStore(state => state.setProjects);
  const setLoading = useProjectStore(state => state.setLoading);
  const setHasLoaded = useProjectStore(state => state.setHasLoaded);
  const upsertProject = useProjectStore(state => state.upsertProject);
  const removeProject = useProjectStore(state => state.removeProject);
  const reorderProjectsOptimistic = useProjectStore(state => state.reorderProjectsOptimistic);
  const updateProjectCountsInStore = useProjectStore(state => state.updateProjectCounts);
  const { user } = useAuth();

  // Initial fetch of projects
  const fetchProjects = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      
      if (!user) {
        setProjects([]);
        setHasLoaded(false);
        return;
      }

      // Skip if already loaded (only for the initial automatic load, not for manual refresh)
      if (hasLoaded && !forceRefresh) {
        setLoading(false);
        return;
      }

      setProjects(await getDataProvider().projects.findAll());
      setHasLoaded(true);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "获取清单失败",
        description: "无法加载清单数据，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, hasLoaded, setLoading, setProjects, setHasLoaded]);

  const updateProjectCounts = useCallback((projectCounts: Record<string, number>) => {
    updateProjectCountsInStore(projectCounts);
  }, [updateProjectCountsInStore]);

  // Refetch projects when user changes
  useEffect(() => {
    if (!canPerformOperation(user)) {
      setProjects([]);
      setLoading(false);
      return;
    }
    fetchProjects();
  }, [user, fetchProjects, setProjects, setLoading]);

  // Realtime: refresh on project membership changes (filtered)
  useEffect(() => {
    if (!user) return;
    const ownedIds = (projects || []).filter(p => p.user_id === user.id).map(p => p.id);
    const refresh = () => fetchProjects(true);
    return getDataProvider().projects.subscribeToMemberships(user.id, ownedIds, refresh);
  }, [user, projects, fetchProjects]);

  // Listen for task count updates from TaskProvider
  useEffect(() => {
    const handleTaskCountsUpdate = (event: CustomEvent<{projectCounts: Record<string, number>}>) => {
      const { projectCounts } = event.detail;
      updateProjectCounts(projectCounts);
    };

    window.addEventListener('task-counts-updated', handleTaskCountsUpdate as EventListener);

    return () => {
      window.removeEventListener('task-counts-updated', handleTaskCountsUpdate as EventListener);
    };
  }, [updateProjectCounts]);

  const createProject = useCallback(async (data: Partial<Project>) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "创建失败",
          description: "您需要登录才能创建清单",
          variant: "destructive"
        });
        return;
      }

      const newProject = await storageOps.createProject({
        name: data.name || '新清单',
        icon: data.icon || 'folder',
        color: data.color || '#4CAF50',
        view_type: data.view_type || 'list',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user!.id,
        sort_order: (projects.length + 1) * 1000,
      });

      if (newProject) {
        upsertProject({ ...newProject, count: 0 });
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  }, [user, upsertProject, projects]);

  const editProject = useCallback(async (id: string, data: Partial<Project>) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "更新失败",
          description: "您需要登录才能修改清单",
          variant: "destructive"
        });
        return;
      }

      const updatedProject = await storageOps.updateProject(id, {
        ...data,
        updated_at: new Date().toISOString()
      });

      if (updatedProject) {
        const existing = projects.find(project => project.id === id);
        if (existing) {
          upsertProject({ ...existing, ...data, id });
        }
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  }, [user, projects, upsertProject]);

  const deleteProject = useCallback(async (id: string) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除清单",
          variant: "destructive"
        });
        return;
      }

      const success = await storageOps.deleteProject(id);
      if (success) {
        removeProject(id);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }, [user, removeProject]);

  const reorderProjects = useCallback(async (projectId: string, newIndex: number) => {
    try {
      if (requiresAuth(user)) {
        toast({
          title: "排序失败",
          description: "您需要登录才能重新排序清单",
          variant: "destructive"
        });
        return;
      }

      // Find the project and its current index
      const updatedProjects = reorderProjectsOptimistic(projectId, newIndex).map((project, index) => ({
        ...project,
        sort_order: (index + 1) * 1000
      }));

      // Prepare batch update data
      const updates = updatedProjects.map(project => ({
        id: project.id,
        sort_order: project.sort_order!
      }));

      const success = await storageOps.batchUpdateProjectSortOrder(updates);

      if (success) {
        toast({
          title: "清单已重新排序",
          description: "清单顺序已更新",
        });
      } else {
        // Revert to original order if there's an error
        await fetchProjects(true);
      }
    } catch (error) {
      console.error('Error reordering projects:', error);
      toast({
        title: "排序失败",
        description: "无法更新清单顺序，请稍后再试",
        variant: "destructive"
      });
      await fetchProjects(true);
    }
  }, [user, reorderProjectsOptimistic, fetchProjects]);

  const refreshProjects = useCallback(async () => {
    return fetchProjects(true);
  }, [fetchProjects]);

  const value = useMemo(() => ({
    projects,
    loading,
    createProject,
    editProject,
    deleteProject,
    reorderProjects,
    refreshProjects,
    updateProjectCounts,
  }), [projects, loading, createProject, editProject, deleteProject, reorderProjects, refreshProjects, updateProjectCounts]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
