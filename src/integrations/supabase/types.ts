export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      checkin_records: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          id: string
          note: string | null
          user_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          user_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pomodoro_sessions: {
        Row: {
          completed: boolean
          created_at: string
          duration: number
          end_time: string | null
          id: string
          start_time: string
          type: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          duration: number
          end_time?: string | null
          id?: string
          start_time?: string
          type: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          duration?: number
          end_time?: string | null
          id?: string
          start_time?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          project_id: string | null
          share_code: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          share_code: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          project_id?: string | null
          share_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          icon: string
          id: string
          is_shared: boolean | null
          name: string
          original_owner_id: string | null
          sort_order: number | null
          updated_at: string
          user_id: string | null
          view_type: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon: string
          id?: string
          is_shared?: boolean | null
          name: string
          original_owner_id?: string | null
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
          view_type?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string
          id?: string
          is_shared?: boolean | null
          name?: string
          original_owner_id?: string | null
          sort_order?: number | null
          updated_at?: string
          user_id?: string | null
          view_type?: string | null
        }
        Relationships: []
      }
      global_chat_messages: {
        Row: {
          id: string
          content: string
          author_name: string | null
          user_id: string | null
          anonymous_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          author_name?: string | null
          user_id?: string | null
          anonymous_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          author_name?: string | null
          user_id?: string | null
          anonymous_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          abandoned: boolean | null
          abandoned_at: string | null
          completed: boolean
          completed_at: string | null
          created_at: string | null
          date: string | null
          deleted: boolean | null
          deleted_at: string | null
          description: string | null
          icon: string | null
          id: string
          project: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          abandoned?: boolean | null
          abandoned_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          project?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          abandoned?: boolean | null
          abandoned_at?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string | null
          date?: string | null
          deleted?: boolean | null
          deleted_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          project?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      daily_checkin_status: {
        Row: {
          check_in_count: number | null
          check_in_date: string | null
          first_check_in: string | null
          last_check_in: string | null
          user_id: string | null
        }
        Relationships: []
      }
      pomodoro_stats: {
        Row: {
          today_focus_count: number | null
          today_focus_minutes: number | null
          total_focus_count: number | null
          total_focus_minutes: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      join_shared_project: {
        Args: { input_share_code: string; joining_user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
