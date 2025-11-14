export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      access_logs: {
        Row: {
          duration_ms: number | null;
          id: number;
          ip_address: unknown;
          method: string;
          path: string;
          received_at: string;
          status_code: number | null;
          user_id: string | null;
        };
        Insert: {
          duration_ms?: number | null;
          id?: never;
          ip_address?: unknown;
          method: string;
          path: string;
          received_at?: string;
          status_code?: number | null;
          user_id?: string | null;
        };
        Update: {
          duration_ms?: number | null;
          id?: never;
          ip_address?: unknown;
          method?: string;
          path?: string;
          received_at?: string;
          status_code?: number | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      error_logs: {
        Row: {
          access_log_id: number;
          app_version: string | null;
          client_context: Json | null;
          id: number;
          level: Database["public"]["Enums"]["log_level"];
          message: string;
          page_url: string | null;
          source: Database["public"]["Enums"]["log_source"];
          stack_trace: string | null;
          timestamp: string;
          user_agent: string | null;
        };
        Insert: {
          access_log_id: number;
          app_version?: string | null;
          client_context?: Json | null;
          id?: never;
          level: Database["public"]["Enums"]["log_level"];
          message: string;
          page_url?: string | null;
          source?: Database["public"]["Enums"]["log_source"];
          stack_trace?: string | null;
          timestamp?: string;
          user_agent?: string | null;
        };
        Update: {
          access_log_id?: number;
          app_version?: string | null;
          client_context?: Json | null;
          id?: never;
          level?: Database["public"]["Enums"]["log_level"];
          message?: string;
          page_url?: string | null;
          source?: Database["public"]["Enums"]["log_source"];
          stack_trace?: string | null;
          timestamp?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_logs_access_log_id_fkey";
            columns: ["access_log_id"];
            isOneToOne: false;
            referencedRelation: "access_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      goal_progress_histories: {
        Row: {
          goal_id: number;
          id: number;
          progress: number;
          recorded_at: string;
        };
        Insert: {
          goal_id: number;
          id?: never;
          progress: number;
          recorded_at: string;
        };
        Update: {
          goal_id?: number;
          id?: never;
          progress?: number;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_progress_histories_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          content: string;
          created_at: string;
          end_date: string;
          id: number;
          progress: number;
          start_date: string;
          title: string;
          updated_at: string;
          user_id: string;
          weight: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          end_date: string;
          id?: never;
          progress: number;
          start_date: string;
          title: string;
          updated_at?: string;
          user_id: string;
          weight: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          end_date?: string;
          id?: never;
          progress?: number;
          start_date?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          weight?: number;
        };
        Relationships: [];
      };
      info_logs: {
        Row: {
          access_log_id: number;
          id: number;
          level: Database["public"]["Enums"]["log_level"];
          message: string;
          timestamp: string;
        };
        Insert: {
          access_log_id: number;
          id?: never;
          level: Database["public"]["Enums"]["log_level"];
          message: string;
          timestamp?: string;
        };
        Update: {
          access_log_id?: number;
          id?: never;
          level?: Database["public"]["Enums"]["log_level"];
          message?: string;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "info_logs_access_log_id_fkey";
            columns: ["access_log_id"];
            isOneToOne: false;
            referencedRelation: "access_logs";
            referencedColumns: ["id"];
          },
        ];
      };
      missions: {
        Row: {
          content: string | null;
          id: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          id?: never;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string | null;
          id?: never;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          created_at: string;
          id: number;
          name: string;
          project_id: number;
        };
        Insert: {
          created_at?: string;
          id?: never;
          name: string;
          project_id: number;
        };
        Update: {
          created_at?: string;
          id?: never;
          name?: string;
          project_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      user_settings: {
        Row: {
          id: number;
          notify_effort_email: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: never;
          notify_effort_email?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: never;
          notify_effort_email?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      work_entry_drafts: {
        Row: {
          client_updated_at: string;
          entries: Json;
          id: number;
          memo: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_updated_at: string;
          entries: Json;
          id?: never;
          memo?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          client_updated_at?: string;
          entries?: Json;
          id?: never;
          memo?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      work_records: {
        Row: {
          created_at: string;
          estimated_hours: number | null;
          hours: number;
          id: number;
          task_id: number;
          user_id: string;
          work_date: string;
        };
        Insert: {
          created_at?: string;
          estimated_hours?: number | null;
          hours: number;
          id?: never;
          task_id: number;
          user_id: string;
          work_date: string;
        };
        Update: {
          created_at?: string;
          estimated_hours?: number | null;
          hours?: number;
          id?: never;
          task_id?: number;
          user_id?: string;
          work_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_records_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      work_record_diffs: {
        Row: {
          created_at: string | null;
          estimated_hours: number | null;
          hours: number | null;
          hours_diff: number | null;
          id: number | null;
          project_id: number | null;
          project_name: string | null;
          task_id: number | null;
          task_name: string | null;
          user_id: string | null;
          work_date: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_records_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      log_level: "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
      log_source: "API" | "UI";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      log_level: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
      log_source: ["API", "UI"],
    },
  },
} as const;
