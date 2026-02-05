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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          criteria: Json | null
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          organization_id: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          criteria?: Json | null
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          xp_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_programs: {
        Row: {
          assigned_by: string | null
          athlete_id: string
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          group_id: string | null
          id: string
          notes: string | null
          program_id: string
          progress_percentage: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          athlete_id: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          program_id: string
          progress_percentage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          athlete_id?: string
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          notes?: string | null
          program_id?: string
          progress_percentage?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["assignment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_programs_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_programs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_programs_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_achievements: {
        Row: {
          achievement_id: string
          athlete_id: string
          earned_at: string | null
          id: string
          progress_data: Json | null
        }
        Insert: {
          achievement_id: string
          athlete_id: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
        }
        Update: {
          achievement_id?: string
          athlete_id?: string
          earned_at?: string | null
          id?: string
          progress_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_achievements_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_goals: {
        Row: {
          athlete_id: string
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          is_active: boolean | null
          metric_type_id: string | null
          start_date: string | null
          target_date: string | null
          target_value: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric_type_id?: string | null
          start_date?: string | null
          target_date?: string | null
          target_value?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          metric_type_id?: string | null
          start_date?: string | null
          target_date?: string | null
          target_value?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_goals_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_goals_metric_type_id_fkey"
            columns: ["metric_type_id"]
            isOneToOne: false
            referencedRelation: "metric_types"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          current_level: number | null
          dominant_foot: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          height_cm: number | null
          id: string
          jersey_number: number | null
          last_activity_date: string | null
          medical_notes: string | null
          organization_id: string
          position: string | null
          streak_days: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          current_level?: number | null
          dominant_foot?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_activity_date?: string | null
          medical_notes?: string | null
          organization_id: string
          position?: string | null
          streak_days?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          current_level?: number | null
          dominant_foot?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          height_cm?: number | null
          id?: string
          jersey_number?: number | null
          last_activity_date?: string | null
          medical_notes?: string | null
          organization_id?: string
          position?: string | null
          streak_days?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          athlete_id: string
          check_in_time: string | null
          check_out_time: string | null
          created_at: string | null
          id: string
          notes: string | null
          recorded_by: string | null
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string | null
        }
        Insert: {
          athlete_id: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Update: {
          athlete_id?: string
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          id: string
          license_number: string | null
          license_type: string | null
          organization_id: string
          specialization: string | null
          updated_at: string | null
          user_id: string
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          license_type?: string | null
          organization_id: string
          specialization?: string | null
          updated_at?: string | null
          user_id: string
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          license_type?: string | null
          organization_id?: string
          specialization?: string | null
          updated_at?: string | null
          user_id?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_sync_logs: {
        Row: {
          completed_at: string | null
          error_details: Json | null
          id: string
          items_failed: number | null
          items_synced: number | null
          organization_id: string | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          error_details?: Json | null
          id?: string
          items_failed?: number | null
          items_synced?: number | null
          organization_id?: string | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          error_details?: Json | null
          id?: string
          items_failed?: number | null
          items_synced?: number | null
          organization_id?: string | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_sync_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          athlete_id: string
          created_at: string | null
          currency: string | null
          due_date: string
          fee_plan_id: string | null
          id: string
          notes: string | null
          organization_id: string
          paid_date: string | null
          payment_method: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          athlete_id: string
          created_at?: string | null
          currency?: string | null
          due_date: string
          fee_plan_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          paid_date?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          athlete_id?: string
          created_at?: string | null
          currency?: string | null
          due_date?: string
          fee_plan_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          paid_date?: string | null
          payment_method?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          is_active: boolean | null
          joined_at: string | null
          left_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          is_active?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          age_group: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_members: number | null
          name: string
          organization_id: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          age_group?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name: string
          organization_id: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          age_group?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_members?: number | null
          name?: string
          organization_id?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["membership_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["membership_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["membership_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      metric_types: {
        Row: {
          category: string | null
          code: string
          created_at: string | null
          data_type: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_higher_better: boolean | null
          is_system: boolean | null
          max_value: number | null
          min_value: number | null
          name: string
          organization_id: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_higher_better?: boolean | null
          is_system?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name: string
          organization_id?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_higher_better?: boolean | null
          is_system?: boolean | null
          max_value?: number | null
          min_value?: number | null
          name?: string
          organization_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metric_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_recipients: {
        Row: {
          channel: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          notification_id: string
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"] | null
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          user_id: string
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_recipients_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          notification_type: string | null
          organization_id: string
          priority: string | null
          scheduled_for: string | null
          sent_at: string | null
          target_groups: string[] | null
          target_roles: Database["public"]["Enums"]["user_role"][] | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          organization_id: string
          priority?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_groups?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string | null
          organization_id?: string
          priority?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_groups?: string[] | null
          target_roles?: Database["public"]["Enums"]["user_role"][] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          settings: Json | null
          slug: string
          subscription_tier: string | null
          subscription_valid_until: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json | null
          slug: string
          subscription_tier?: string | null
          subscription_valid_until?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          subscription_tier?: string | null
          subscription_valid_until?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parent_athlete_relations: {
        Row: {
          athlete_user_id: string
          can_view_payments: boolean | null
          can_view_progress: boolean | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          organization_id: string
          parent_user_id: string
          relationship_type: string | null
          verified: boolean | null
        }
        Insert: {
          athlete_user_id: string
          can_view_payments?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id: string
          parent_user_id: string
          relationship_type?: string | null
          verified?: boolean | null
        }
        Update: {
          athlete_user_id?: string
          can_view_payments?: boolean | null
          can_view_progress?: boolean | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          organization_id?: string
          parent_user_id?: string
          relationship_type?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_athlete_relations_athlete_user_id_fkey"
            columns: ["athlete_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_athlete_relations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_athlete_relations_parent_user_id_fkey"
            columns: ["parent_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_records: {
        Row: {
          athlete_id: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          metric_type_id: string
          notes: string | null
          recorded_at: string | null
          recorded_by: string
          session_id: string | null
          value: number
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          metric_type_id: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by: string
          session_id?: string | null
          value: number
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          metric_type_id?: string
          notes?: string | null
          recorded_at?: string | null
          recorded_by?: string
          session_id?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_records_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_records_metric_type_id_fkey"
            columns: ["metric_type_id"]
            isOneToOne: false
            referencedRelation: "metric_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_versions: {
        Row: {
          changelog: string | null
          content_data: Json
          created_at: string | null
          id: string
          program_id: string
          version_number: number
        }
        Insert: {
          changelog?: string | null
          content_data: Json
          created_at?: string | null
          id?: string
          program_id: string
          version_number: number
        }
        Update: {
          changelog?: string | null
          content_data?: Json
          created_at?: string | null
          id?: string
          program_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          category: string | null
          content_data: Json | null
          created_at: string | null
          description: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
          external_id: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          organization_id: string | null
          source: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          organization_id?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content_data?: Json | null
          created_at?: string | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
          external_id?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          organization_id?: string | null
          source?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          coach_id: string | null
          created_at: string | null
          description: string | null
          group_id: string | null
          id: string
          location: string | null
          notes: string | null
          organization_id: string
          scheduled_end: string | null
          scheduled_start: string
          session_type: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id: string
          scheduled_end?: string | null
          scheduled_start: string
          session_type?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          coach_id?: string | null
          created_at?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          organization_id?: string
          scheduled_end?: string | null
          scheduled_start?: string
          session_type?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      training_logs: {
        Row: {
          assigned_program_id: string | null
          athlete_id: string
          coach_feedback: string | null
          completion_status:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at: string | null
          date: string
          duration_minutes: number | null
          exercises_completed: Json | null
          feedback_at: string | null
          feedback_by: string | null
          id: string
          intensity_level: number | null
          notes: string | null
          session_id: string | null
          updated_at: string | null
          xp_earned: number | null
        }
        Insert: {
          assigned_program_id?: string | null
          athlete_id: string
          coach_feedback?: string | null
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          exercises_completed?: Json | null
          feedback_at?: string | null
          feedback_by?: string | null
          id?: string
          intensity_level?: number | null
          notes?: string | null
          session_id?: string | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Update: {
          assigned_program_id?: string | null
          athlete_id?: string
          coach_feedback?: string | null
          completion_status?:
            | Database["public"]["Enums"]["completion_status"]
            | null
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          exercises_completed?: Json | null
          feedback_at?: string | null
          feedback_by?: string | null
          id?: string
          intensity_level?: number | null
          notes?: string | null
          session_id?: string | null
          updated_at?: string | null
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_assigned_program_id_fkey"
            columns: ["assigned_program_id"]
            isOneToOne: false
            referencedRelation: "assigned_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athlete_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_logs_feedback_by_fkey"
            columns: ["feedback_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          kvkk_consent: boolean | null
          kvkk_consent_date: string | null
          locale: string | null
          notification_preferences: Json | null
          onboarding_completed: boolean | null
          phone: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          kvkk_consent?: boolean | null
          kvkk_consent_date?: string | null
          locale?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          kvkk_consent?: boolean | null
          kvkk_consent_date?: string | null
          locale?: string | null
          notification_preferences?: Json | null
          onboarding_completed?: boolean | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      coach_manages_athlete: {
        Args: { athlete_user_id: string }
        Returns: boolean
      }
      get_user_org_ids: { Args: never; Returns: string[] }
      is_org_admin: { Args: { org_id: string }; Returns: boolean }
      is_org_athlete: { Args: { org_id: string }; Returns: boolean }
      is_org_coach: { Args: { org_id: string }; Returns: boolean }
      is_org_member: { Args: { org_id: string }; Returns: boolean }
      is_parent_of: { Args: { athlete_user_id: string }; Returns: boolean }
    }
    Enums: {
      assignment_status: "assigned" | "in_progress" | "completed" | "cancelled"
      attendance_status: "present" | "absent" | "late" | "excused"
      completion_status: "not_started" | "in_progress" | "completed" | "skipped"
      membership_status: "pending" | "active" | "suspended" | "inactive"
      notification_status: "pending" | "sent" | "delivered" | "failed" | "read"
      payment_status: "pending" | "paid" | "overdue" | "cancelled" | "refunded"
      user_role: "athlete" | "coach" | "club_admin" | "parent" | "super_admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      assignment_status: ["assigned", "in_progress", "completed", "cancelled"],
      attendance_status: ["present", "absent", "late", "excused"],
      completion_status: ["not_started", "in_progress", "completed", "skipped"],
      membership_status: ["pending", "active", "suspended", "inactive"],
      notification_status: ["pending", "sent", "delivered", "failed", "read"],
      payment_status: ["pending", "paid", "overdue", "cancelled", "refunded"],
      user_role: ["athlete", "coach", "club_admin", "parent", "super_admin"],
    },
  },
} as const
