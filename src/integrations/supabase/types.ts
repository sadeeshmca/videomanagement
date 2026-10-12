export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          meta: Json
          site_id: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json
          site_id?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          meta?: Json
          site_id?: string | null
          target?: string | null
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          enabled: boolean
          interval_months: number
          next_run_at: string
          retention_days: number
          site_id: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enabled?: boolean
          interval_months?: number
          next_run_at?: string
          retention_days?: number
          site_id?: string | null
          start_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enabled?: boolean
          interval_months?: number
          next_run_at?: string
          retention_days?: number
          site_id?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          created_at: string
          download_link: string | null
          drive_file_id: string | null
          error: string | null
          expires_at: string | null
          finished_at: string | null
          id: string
          progress: number
          site_id: string | null
          size_bytes: number
          status: string
          trigger: string
          user_id: string
          video_count: number
        }
        Insert: {
          created_at?: string
          download_link?: string | null
          drive_file_id?: string | null
          error?: string | null
          expires_at?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          site_id?: string | null
          size_bytes?: number
          status?: string
          trigger?: string
          user_id: string
          video_count?: number
        }
        Update: {
          created_at?: string
          download_link?: string | null
          drive_file_id?: string | null
          error?: string | null
          expires_at?: string | null
          finished_at?: string | null
          id?: string
          progress?: number
          site_id?: string | null
          size_bytes?: number
          status?: string
          trigger?: string
          user_id?: string
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "backups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          body: string
          created_at: string
          id: string
          recipient_count: number
          sender_id: string
          site_id: string | null
          status: string
          subject: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient_count?: number
          sender_id: string
          site_id?: string | null
          status?: string
          subject: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient_count?: number
          sender_id?: string
          site_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          quota_bytes: number
          site_id: string | null
          suspended: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          quota_bytes?: number
          site_id?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          quota_bytes?: number
          site_id?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          drive_folder_id: string | null
          id: string
          name: string
          quota_bytes: number
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          name: string
          quota_bytes?: number
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          name?: string
          quota_bytes?: number
          slug?: string
          status?: string
        }
        Relationships: []
      }
      upload_usage: {
        Row: {
          bytes: number
          day: string
        }
        Insert: {
          bytes?: number
          day: string
        }
        Update: {
          bytes?: number
          day?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          created_at: string
          customer_phone: string | null
          deleted_at: string | null
          drive_file_id: string | null
          drive_web_view_link: string | null
          id: string
          is_public: boolean
          mime_type: string | null
          order_date: string
          order_id: string
          owner_id: string
          site_id: string
          size_bytes: number
          sku: string | null
          status: string
          tags: string[]
          thumbnail_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string | null
          deleted_at?: string | null
          drive_file_id?: string | null
          drive_web_view_link?: string | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          order_date?: string
          order_id: string
          owner_id: string
          site_id: string
          size_bytes?: number
          sku?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          customer_phone?: string | null
          deleted_at?: string | null
          drive_file_id?: string | null
          drive_web_view_link?: string | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          order_date?: string
          order_id?: string
          owner_id?: string
          site_id?: string
          size_bytes?: number
          sku?: string | null
          status?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_upload_usage: { Args: { _bytes: number }; Returns: undefined }
      current_site_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "user"],
    },
  },
} as const
