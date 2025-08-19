
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Project } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { user } = useAuth();

  // Initial fetch of projects
  const fetchProjects = async (forceRefresh = false) => {
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

      // Fetch projects the user created
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id) // Projects created by the user
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

      // Process member projects to match the format of owned projects
      const formattedMemberProjects = memberProjects
        .filter(item => item.project) // Filter out any null projects
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

      // Combine both sets of projects
      const allProjects = [...ownedProjects, ...uniqueMemberProjects];

      console.log("Fetched projects:", {
        ownedProjects: ownedProjects.length,
        memberProjects: memberProjects.length,
        formattedMemberProjects: formattedMemberProjects.length,
        uniqueMemberProjects: uniqueMemberProjects.length,
        allProjects: allProjects.length
      });

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
  };

  // Refetch projects when user changes
  useEffect(() => {
    if (user) {
      fetchProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [user]);

  // Listen for task count updates from TaskProvider
  useEffect(() => {
    const handleTaskCountsUpdate = (event: CustomEvent<{projectCounts: Record<string, number>}>) => {
      const { projectCounts } = event.detail;
      updateProjectCounts(projectCounts);
    };

    // Add event listener
    window.addEventListener('task-counts-updated', handleTaskCountsUpdate as EventListener);

    // Clean up
    return () => {
      window.removeEventListener('task-counts-updated', handleTaskCountsUpdate as EventListener);
    };
  }, []);

  // Update project counts - this receives data from TaskContext
  const updateProjectCounts = (projectCounts: Record<string, number>) => {
    setProjects(prev =>
      prev.map(project => ({
        ...project,
        count: projectCounts[project.id] || 0
      }))
    );
  };

  const createProject = async (data: Partial<Project>) => {
    try {
      if (!user) {
        toast({
          title: "创建失败",
          description: "您需要登录才能创建清单",
          variant: "destructive"
        });
        return;
      }

      // Get the highest sort_order for the user's projects
      const { data: maxOrderData, error: maxOrderError } = await supabase
        .from('projects')
        .select('sort_order')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: false })
        .limit(1);

      if (maxOrderError) {
        console.error('Error getting max sort order:', maxOrderError);
      }

      // Calculate the next sort order (1000 higher than the current max)
      const maxOrder = maxOrderData && maxOrderData.length > 0 && maxOrderData[0].sort_order !== null
        ? maxOrderData[0].sort_order
        : 0;
      const nextSortOrder = maxOrder + 1000;

      const { data: newProject, error } = await supabase
        .from('projects')
        .insert([{
          name: data.name || '新清单',
          icon: data.icon || 'folder',
          color: data.color || '#4CAF50',
          view_type: data.view_type || 'list',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user.id, // Ensure the project is associated with the current user
          sort_order: nextSortOrder // Set the sort order for the new project
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Add count property
      const projectWithCount = {
        ...newProject,
        count: 0
      };

      // Update local state
      setProjects(prev => [projectWithCount, ...prev]);

      toast({
        title: "清单已创建",
        description: "新清单已成功创建",
      });
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "创建失败",
        description: "无法创建新清单，请稍后再试",
        variant: "destructive"
      });
    }
  };

  const editProject = async (id: string, data: Partial<Project>) => {
    try {
      if (!user) {
        toast({
          title: "更新失败",
          description: "您需要登录才能修改清单",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('projects')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id); // Only update if the project belongs to the current user

      if (error) {
        throw error;
      }

      // Update local state
      setProjects(prev =>
        prev.map(project => project.id === id ? { ...project, ...data } : project)
      );

      toast({
        title: "清单已更新",
        description: "清单修改已保存",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "更新失败",
        description: "无法保存清单修改，请稍后再试",
        variant: "destructive"
      });
    }
  };

  const deleteProject = async (id: string) => {
    try {
      if (!user) {
        toast({
          title: "删除失败",
          description: "您需要登录才能删除清单",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Only delete if the project belongs to the current user

      if (error) {
        throw error;
      }

      // Update local state
      setProjects(prev => prev.filter(project => project.id !== id));

      toast({
        title: "清单已删除",
        description: "清单已被成功删除",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "删除失败",
        description: "无法删除清单，请稍后再试",
        variant: "destructive"
      });
    }
  };

  const reorderProjects = async (projectId: string, newIndex: number) => {
    try {
      if (!user) {
        toast({
          title: "排序失败",
          description: "您需要登录才能重新排序清单",
          variant: "destructive"
        });
        return;
      }

      // Find the project and its current index
      const currentIndex = projects.findIndex(p => p.id === projectId);
      if (currentIndex === -1) return;

      // Create a copy of the projects array
      const newProjects = [...projects];

      // Remove the project from its current position
      const [removed] = newProjects.splice(currentIndex, 1);

      // Insert the project at the new position
      newProjects.splice(newIndex, 0, removed);

      // Update the state immediately for a responsive UI
      setProjects(newProjects);

      // Assign new sort_order values to the reordered projects (1000 between each project)
      const updatedProjects = newProjects.map((project, index) => ({
        ...project,
        sort_order: (index + 1) * 1000
      }));

      // Prepare batch update data - only include the id and sort_order fields
      const updatePromises = updatedProjects.map(project => {
        return supabase
          .from('projects')
          .update({ sort_order: project.sort_order })
          .eq('id', project.id)
          .eq('user_id', user.id);
      });

      // Execute all updates in parallel
      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} projects`);
      }

      toast({
        title: "清单已重新排序",
        description: "清单顺序已更新",
      });
    } catch (error) {
      console.error('Error reordering projects:', error);
      toast({
        title: "排序失败",
        description: "无法更新清单顺序，请稍后再试",
        variant: "destructive"
      });

      // Revert to original order if there's an error
      await fetchProjects();
    }
  };

  const refreshProjects = async () => {
    // Force a refresh by passing forceRefresh = true
    return fetchProjects(true);
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        loading,
        createProject,
        editProject,
        deleteProject,
        reorderProjects,
        refreshProjects,
        updateProjectCounts
      }}
    >
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
