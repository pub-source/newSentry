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
      alert_history: {
        Row: {
          alert_type: string
          created_at: string
          household_id: string
          id: string
          message: string
          snapshot_url: string | null
          triggered_by: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          household_id: string
          id?: string
          message: string
          snapshot_url?: string | null
          triggered_by?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          household_id?: string
          id?: string
          message?: string
          snapshot_url?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_objects_log: {
        Row: {
          bbox: Json | null
          confidence: number
          id: string
          label: string
          session_id: string
          timestamp: string
        }
        Insert: {
          bbox?: Json | null
          confidence: number
          id?: string
          label: string
          session_id: string
          timestamp?: string
        }
        Update: {
          bbox?: Json | null
          confidence?: number
          id?: string
          label?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "detected_objects_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "detection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_data: {
        Row: {
          attention_score: number | null
          audio_event: string | null
          decibel: number | null
          fps: number | null
          id: string
          object_count: number | null
          objects_detected: Json | null
          saliency_score: number | null
          session_id: string
          speech_detected: boolean | null
          timestamp: string
        }
        Insert: {
          attention_score?: number | null
          audio_event?: string | null
          decibel?: number | null
          fps?: number | null
          id?: string
          object_count?: number | null
          objects_detected?: Json | null
          saliency_score?: number | null
          session_id: string
          speech_detected?: boolean | null
          timestamp?: string
        }
        Update: {
          attention_score?: number | null
          audio_event?: string | null
          decibel?: number | null
          fps?: number | null
          id?: string
          object_count?: number | null
          objects_detected?: Json | null
          saliency_score?: number | null
          session_id?: string
          speech_detected?: boolean | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "detection_data_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "detection_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_feedback: {
        Row: {
          audio_event: string | null
          confidence: number | null
          created_at: string
          event_type: string
          household_id: string
          id: string
          label: string
          note: string | null
          raw_scores: Json | null
          sub_label: string | null
          submitted_by: string | null
          visual_context: Json | null
        }
        Insert: {
          audio_event?: string | null
          confidence?: number | null
          created_at?: string
          event_type: string
          household_id: string
          id?: string
          label: string
          note?: string | null
          raw_scores?: Json | null
          sub_label?: string | null
          submitted_by?: string | null
          visual_context?: Json | null
        }
        Update: {
          audio_event?: string | null
          confidence?: number | null
          created_at?: string
          event_type?: string
          household_id?: string
          id?: string
          label?: string
          note?: string | null
          raw_scores?: Json | null
          sub_label?: string | null
          submitted_by?: string | null
          visual_context?: Json | null
        }
        Relationships: []
      }
      detection_sessions: {
        Row: {
          avg_attention: number | null
          avg_saliency: number | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          max_attention: number | null
          saliency_mode: string | null
          started_at: string
          total_alerts: number | null
          total_objects_detected: number | null
          user_id: string | null
        }
        Insert: {
          avg_attention?: number | null
          avg_saliency?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_attention?: number | null
          saliency_mode?: string | null
          started_at?: string
          total_alerts?: number | null
          total_objects_detected?: number | null
          user_id?: string | null
        }
        Update: {
          avg_attention?: number | null
          avg_saliency?: number | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          max_attention?: number | null
          saliency_mode?: string | null
          started_at?: string
          total_alerts?: number | null
          total_objects_detected?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      household_members: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          id: string
          is_admin: boolean
          phone_number: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          is_admin?: boolean
          phone_number: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          is_admin?: boolean
          phone_number?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          created_at: string
          display_name: string
          household_id: string
          id: string
          phone_number: string
          status: string
        }
        Insert: {
          created_at?: string
          display_name: string
          household_id: string
          id?: string
          phone_number?: string
          status?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          household_id?: string
          id?: string
          phone_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          action_type: string
          created_at: string
          household_id: string
          id: string
          is_emergency: boolean
          phrase_matched: string
          recipient_count: number
          triggered_by: string | null
          wake_word_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          household_id: string
          id?: string
          is_emergency?: boolean
          phrase_matched: string
          recipient_count?: number
          triggered_by?: string | null
          wake_word_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          household_id?: string
          id?: string
          is_emergency?: boolean
          phrase_matched?: string
          recipient_count?: number
          triggered_by?: string | null
          wake_word_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_wake_word_id_fkey"
            columns: ["wake_word_id"]
            isOneToOne: false
            referencedRelation: "wake_words"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          created_at: string
          email: string
          enabled: boolean
          household_id: string
          id: string
          label: string | null
        }
        Insert: {
          created_at?: string
          email: string
          enabled?: boolean
          household_id: string
          id?: string
          label?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          enabled?: boolean
          household_id?: string
          id?: string
          label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          cooldown_seconds: number
          created_at: string
          email_enabled: boolean
          household_id: string
          in_app_enabled: boolean
          severity_threshold: string
          sound_enabled: boolean
          sound_volume: number
          updated_at: string
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          email_enabled?: boolean
          household_id: string
          in_app_enabled?: boolean
          severity_threshold?: string
          sound_enabled?: boolean
          sound_volume?: number
          updated_at?: string
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          email_enabled?: boolean
          household_id?: string
          in_app_enabled?: boolean
          severity_threshold?: string
          sound_enabled?: boolean
          sound_volume?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: true
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wake_words: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          household_id: string
          id: string
          is_emergency: boolean
          phrase: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          household_id: string
          id?: string
          is_emergency?: boolean
          phrase: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          household_id?: string
          id?: string
          is_emergency?: boolean
          phrase?: string
        }
        Relationships: [
          {
            foreignKeyName: "wake_words_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_household_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
