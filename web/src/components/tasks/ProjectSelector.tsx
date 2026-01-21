import React, { useState, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Project } from "@/types/task";

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: string[];
  onChange: (selectedProjects: string[]) => void;
  storageKey?: string;
  className?: string;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjects,
  onChange,
  storageKey,
  className
}) => {
  const [openProjectSelector, setOpenProjectSelector] = useState(false);

  // Load saved selections from localStorage if storageKey is provided
  useEffect(() => {
    if (storageKey && selectedProjects.length === 0) {
      const savedSelections = localStorage.getItem(storageKey);
      if (savedSelections) {
        try {
          const parsedSelections = JSON.parse(savedSelections);
          if (Array.isArray(parsedSelections)) {
            // Verify that all projects still exist
            if (Array.isArray(projects) && projects.length > 0) {
              const validProjectIds = projects.map(p => p.id);
              const validSelectedProjects = parsedSelections.filter(
                (id: string) => validProjectIds.includes(id)
              );
              onChange(validSelectedProjects);
            } else {
              onChange(parsedSelections);
            }
          }
        } catch (error) {
          console.error("Error parsing saved project selections:", error);
        }
      }
    }
  }, [projects, onChange, selectedProjects.length, storageKey]);

  // Save selections to localStorage if storageKey is provided
  const saveSelectionsToLocalStorage = (selections: string[]) => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(selections));
    }
  };

  const toggleProjectSelection = (projectId: string) => {
    const newSelection = selectedProjects.includes(projectId)
      ? selectedProjects.filter(id => id !== projectId)
      : [...selectedProjects, projectId];
    
    onChange(newSelection);
    saveSelectionsToLocalStorage(newSelection);
  };

  const clearSelectedProjects = () => {
    onChange([]);
    saveSelectionsToLocalStorage([]);
  };

  return (
    <Popover open={openProjectSelector} onOpenChange={setOpenProjectSelector}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "h-9 min-w-[180px] max-w-[280px] px-2 py-1 border rounded-md flex items-center gap-1 cursor-pointer border-input bg-background hover:bg-accent/5 transition-colors",
            openProjectSelector && "ring-1 ring-ring border-primary/30",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center overflow-hidden flex-1 pr-7">
            {selectedProjects.length > 0 ? (
              selectedProjects.map(projectId => {
                const project = projects.find(p => p.id === projectId);
                return project ? (
                  <Badge
                    key={project.id}
                    variant="secondary"
                    className="flex items-center gap-0.5 whitespace-nowrap text-xs py-0.5 px-1.5 bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    <span className="truncate max-w-[80px]">{project.name}</span>
                    <button
                      className="text-muted-foreground hover:text-foreground focus:outline-none"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleProjectSelection(project.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })
            ) : (
              <span className="text-xs text-muted-foreground/80">选择清单</span>
            )}
          </div>
          <div className="absolute right-2.5 flex items-center h-full">
            {selectedProjects.length > 1 && (
              <button
                className="mr-1 text-muted-foreground hover:text-foreground focus:outline-none p-0.5 rounded-sm hover:bg-accent/20"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedProjects();
                }}
                title="清除所有选择"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-40" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
                  <div className="py-1 max-h-[240px] overflow-y-auto custom-scrollbar-thin">
          {selectedProjects.length > 0 && (
            <div className="sticky top-0 bg-background border-b border-border/40 py-1 px-2 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedProjects();
                  setOpenProjectSelector(false);
                }}
              >
                清除全部
              </Button>
            </div>
          )}
          {Array.isArray(projects) && projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.id}
                className={cn(
                  "flex items-center justify-between text-sm px-3 py-2 cursor-pointer hover:bg-accent/5 transition-colors",
                  selectedProjects.includes(project.id) && "text-primary font-medium"
                )}
                onClick={() => toggleProjectSelection(project.id)}
              >
                <div className="truncate">{project.name}</div>
                {selectedProjects.includes(project.id) && (
                  <Check className="h-4 w-4 text-primary/90 flex-shrink-0 ml-1" />
                )}
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">加载中...</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ProjectSelector;
