import { create } from "zustand";
import { Project } from "@/types/project";

export interface ProjectState {
  projects: Project[];
  loading: boolean;
  hasLoaded: boolean;
}

export interface ProjectActions {
  setProjects: (projects: Project[]) => void;
  setLoading: (loading: boolean) => void;
  setHasLoaded: (loaded: boolean) => void;
  upsertProject: (project: Project) => void;
  removeProject: (id: string) => void;
  reorderProjectsOptimistic: (projectId: string, newIndex: number) => Project[];
  restoreProjectsOrder: (projects: Project[]) => void;
  updateProjectCounts: (counts: Record<string, number>) => void;
}

export type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  loading: true,
  hasLoaded: false,

  setProjects: (projects) => set({ projects }),
  setLoading: (loading) => set({ loading }),
  setHasLoaded: (loaded) => set({ hasLoaded: loaded }),

  upsertProject: (project) =>
    set((state) => ({
      projects: state.projects.some((p) => p.id === project.id)
        ? state.projects.map((p) => (p.id === project.id ? project : p))
        : [project, ...state.projects],
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== id),
    })),

  reorderProjectsOptimistic: (projectId, newIndex) => {
    const currentProjects = get().projects;
    const currentIndex = currentProjects.findIndex((p) => p.id === projectId);
    if (currentIndex === -1) {
      return currentProjects;
    }

    const newProjects = [...currentProjects];
    const [removed] = newProjects.splice(currentIndex, 1);
    newProjects.splice(newIndex, 0, removed);
    set({ projects: newProjects });
    return newProjects;
  },

  restoreProjectsOrder: (projects) => set({ projects }),

  updateProjectCounts: (counts) =>
    set((state) => ({
      projects: state.projects.map((project) => ({
        ...project,
        count: counts[project.id] ?? 0,
      })),
    })),
}));

