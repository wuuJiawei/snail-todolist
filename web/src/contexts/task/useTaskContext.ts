
import { useContext } from "react";
import { TaskContext } from "./TaskContext";
import { TaskContextType } from "./types";

export const useTaskContext = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
};
