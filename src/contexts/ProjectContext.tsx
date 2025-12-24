
import React, { createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useProjectStore } from "@/store/projectStore";
import { isOfflineMode } from "@/storage";
import * as storageOps from "@/storage/operations";

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
      
      // In offline mode, use storage operations
      if (isOfflineMode) {
        const projects = await storageOps.getProjects();
        setProjects(projects);
        setHasLoaded(true);
        return;
      }
      
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

      // Fetch projects the user created
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (ownedError) {
        throw ownedError;
      }

      // Fetch projects the user is a member of
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project:project_id(
            id, name, icon, color, view_type, created_at, updated_at, sort_order, user_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (memberError) {
        throw memberError;
      }

      // Check which owned projects have other members (so owner lists show as shared)
      const ownedIds = ownedProjects.map(p => p.id);
      let ownedSharedSet = new Set<string>();
      if (ownedIds.length > 0) {
        const { data: ownedMemberRows, error: ownedMembersError } = await supabase
          .from('project_members')
          .select('project_id, user_id')
          .in('project_id', ownedIds);
        if (ownedMembersError) {
          console.error('Error fetching owned project member rows:', ownedMembersError);
        } else {
          const ownerByProject: Record<string, string | null | undefined> = {};
          ownedProjects.forEach(p => { ownerByProject[p.id] = p.user_id; });
          (ownedMemberRows || []).forEach((r: any) => {
            const pid = r.project_id as string | null;
            const uid = r.user_id as string | null;
            if (pid && uid && uid !== ownerByProject[pid]) {
              ownedSharedSet.add(pid);
            }
          });
        }
      }

      // Process member projects to match the format of owned projects
      const formattedMemberProjects = memberProjects
        .filter(item => item.project)
        .map(item => ({
          ...item.project,
          is_shared: true
        }));

      // Create a Set of project IDs that the user owns
      const ownedProjectIds = new Set(ownedProjects.map(project => project.id));

      // Filter out member projects that the user already owns to avoid duplicates
      const uniqueMemberProjects = formattedMemberProjects.filter(
        project => !ownedProjectIds.has(project.id)
      );

      const ownedWithShareFlag = ownedProjects.map((p) => ({
        ...p,
        is_shared: ownedSharedSet.has(p.id),
      }));
      const allProjects = [...ownedWithShareFlag, ...uniqueMemberProjects];

      // Add a count property with initial count of 0
      const projectsWithCount = allProjects.map(project => ({
        ...project,
        count: 0
      }));

      setProjects(projectsWithCount);
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
    if (!user && !isOfflineMode) {
      setProjects([]);
      setLoading(false);
      return;
    }
    fetchProjects();
  }, [user, fetchProjects, setProjects, setLoading]);

  // Realtime: refresh on project membership changes (filtered)
  useEffect(() => {
    // Skip realtime subscriptions in offline mode
    if (isOfflineMode) return;
    if (!user) return;
    const ownedIds = (projects || []).filter(p => p.user_id === user.id).map(p => p.id);
    const channel = supabase.channel(`projects:members:${user.id}`);
    const refresh = () => fetchProjects(true);
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "project_members", filter: `user_id=eq.${user.id}` },
      refresh
    );
    if (ownedIds.length > 0) {
      const inList = ownedIds.map(id => `"${id}"`).join(",");
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members", filter: `project_id=in.(${inList})` },
        refresh
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
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
      // Check auth in online mode
      if (!isOfflineMode && !user) {
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
        user_id: user?.id || 'offline-user',
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
      // Check auth in online mode
      if (!isOfflineMode && !user) {
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
      // Check auth in online mode
      if (!isOfflineMode && !user) {
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
      if (!isOfflineMode && !user) {
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
