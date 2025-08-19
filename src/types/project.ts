
import { ProjectMember } from './projectMember';

export interface Project {
  id: string;
  name: string;
  icon: string;
  count: number;
  isFixed?: boolean;
  color?: string;
  view_type?: string;
  created_at?: string;
  updated_at?: string;
  sort_order?: number; // Field for sorting projects within a user's list
  user_id?: string;
  is_shared?: boolean; // Whether this project is shared
  original_owner_id?: string; // ID of the original owner if this is a shared project
  members?: ProjectMember[]; // Members of the project (for shared projects)
}

export interface ProjectFormValues {
  name: string;
  icon: string;
  view_type?: string;
}
