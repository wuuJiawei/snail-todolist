export interface Tag {
  id: string;
  name: string;
  user_id?: string;
  project_id?: string | null;
  created_at?: string;
}

export interface TaskTagLink {
  task_id: string;
  tag_id: string;
  created_at?: string;
}


