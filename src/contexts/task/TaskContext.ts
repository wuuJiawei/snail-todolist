
import { createContext } from "react";
import { TaskContextType } from "./types";

export const TaskContext = createContext<TaskContextType | undefined>(undefined);
