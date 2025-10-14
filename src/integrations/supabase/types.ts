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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_comments: {
        Row: {
          activity_id: string
          comment_text: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          comment_text: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_comments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activity_feed: {
        Row: {
          action_text: string
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          source_id: string
          source_table: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_text: string
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id: string
          source_table: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_text?: string
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_id?: string
          source_table?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_feed_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      activity_likes: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_likes_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      body_composition: {
        Row: {
          body_fat_percentage: number | null
          created_at: string
          id: string
          measurement_date: string
          measurement_method: string | null
          muscle_mass: number | null
          photo_after_url: string | null
          photo_before_url: string | null
          user_id: string
          weight: number | null
        }
        Insert: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          measurement_method?: string | null
          muscle_mass?: number | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          body_fat_percentage?: number | null
          created_at?: string
          id?: string
          measurement_date?: string
          measurement_method?: string | null
          muscle_mass?: number | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_composition_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      challenge_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          challenge_id: string
          icon: string | null
          id: string
          metadata: Json | null
          points_awarded: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          challenge_id: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points_awarded?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          challenge_id?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          points_awarded?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_achievements_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_chat_messages: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          is_edited: boolean
          message_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          is_edited?: boolean
          message_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          message_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_chat_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      challenge_points: {
        Row: {
          challenge_id: string
          comments_count: number
          created_at: string
          id: string
          last_activity_date: string | null
          likes_given: number
          likes_received: number
          measurements_count: number
          points: number
          posts_count: number
          streak_days: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          comments_count?: number
          created_at?: string
          id?: string
          last_activity_date?: string | null
          likes_given?: number
          likes_received?: number
          measurements_count?: number
          points?: number
          posts_count?: number
          streak_days?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          comments_count?: number
          created_at?: string
          id?: string
          last_activity_date?: string | null
          likes_given?: number
          likes_received?: number
          measurements_count?: number
          points?: number
          posts_count?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_points_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_post_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "challenge_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "challenge_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_posts: {
        Row: {
          challenge_id: string
          content: string
          created_at: string
          id: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          content: string
          created_at?: string
          id?: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          content?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_posts_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_health_summary: {
        Row: {
          active_calories: number | null
          created_at: string
          date: string
          distance_km: number | null
          exercise_minutes: number | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          heart_rate_min: number | null
          id: string
          resting_calories: number | null
          sleep_hours: number | null
          source_data: Json | null
          steps: number | null
          updated_at: string
          user_id: string
          vo2_max: number | null
          weight: number | null
        }
        Insert: {
          active_calories?: number | null
          created_at?: string
          date: string
          distance_km?: number | null
          exercise_minutes?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          id?: string
          resting_calories?: number | null
          sleep_hours?: number | null
          source_data?: Json | null
          steps?: number | null
          updated_at?: string
          user_id: string
          vo2_max?: number | null
          weight?: number | null
        }
        Update: {
          active_calories?: number | null
          created_at?: string
          date?: string
          distance_km?: number | null
          exercise_minutes?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          id?: string
          resting_calories?: number | null
          sleep_hours?: number | null
          source_data?: Json | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          vo2_max?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          metric_name: string
          position: number
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          metric_name: string
          position?: number
          source: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          metric_name?: string
          position?: number
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          id: string
          source: string
          stack_trace: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          id?: string
          source: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          source?: string
          stack_trace?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      goals: {
        Row: {
          challenge_id: string | null
          created_at: string
          goal_name: string
          goal_type: string
          id: string
          is_personal: boolean | null
          target_unit: string | null
          target_value: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          goal_name: string
          goal_type: string
          id?: string
          is_personal?: boolean | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          goal_name?: string
          goal_type?: string
          id?: string
          is_personal?: boolean | null
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_completions: {
        Row: {
          completed_at: string
          created_at: string
          habit_id: string
          id: string
          mood: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          habit_id: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          habit_id?: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_stats: {
        Row: {
          completion_rate: number
          created_at: string
          current_streak: number
          habit_id: string
          id: string
          last_completed_at: string | null
          longest_streak: number
          total_completions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_rate?: number
          created_at?: string
          current_streak?: number
          habit_id: string
          id?: string
          last_completed_at?: string | null
          longest_streak?: number
          total_completions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_rate?: number
          created_at?: string
          current_streak?: number
          habit_id?: string
          id?: string
          last_completed_at?: string | null
          longest_streak?: number
          total_completions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          frequency: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          reminder_time: string | null
          target_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          reminder_time?: string | null
          target_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          frequency?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          reminder_time?: string | null
          target_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          created_at: string
          device: string | null
          end_date: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          record_type: string
          source_name: string | null
          source_version: string | null
          start_date: string
          unit: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          device?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          record_type: string
          source_name?: string | null
          source_version?: string | null
          start_date: string
          unit?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          device?: string | null
          end_date?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          record_type?: string
          source_name?: string | null
          source_version?: string | null
          start_date?: string
          unit?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      inbody_analyses: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_mass: number | null
          created_at: string | null
          id: string
          left_arm_mass: number | null
          left_arm_percent: number | null
          left_leg_mass: number | null
          left_leg_percent: number | null
          minerals: number | null
          pdf_url: string | null
          percent_body_fat: number | null
          protein: number | null
          raw_data: Json | null
          right_arm_mass: number | null
          right_arm_percent: number | null
          right_leg_mass: number | null
          right_leg_percent: number | null
          skeletal_muscle_mass: number | null
          test_date: string
          total_body_water: number | null
          trunk_mass: number | null
          trunk_percent: number | null
          updated_at: string | null
          user_id: string
          visceral_fat_area: number | null
          weight: number | null
        }
        Insert: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          created_at?: string | null
          id?: string
          left_arm_mass?: number | null
          left_arm_percent?: number | null
          left_leg_mass?: number | null
          left_leg_percent?: number | null
          minerals?: number | null
          pdf_url?: string | null
          percent_body_fat?: number | null
          protein?: number | null
          raw_data?: Json | null
          right_arm_mass?: number | null
          right_arm_percent?: number | null
          right_leg_mass?: number | null
          right_leg_percent?: number | null
          skeletal_muscle_mass?: number | null
          test_date: string
          total_body_water?: number | null
          trunk_mass?: number | null
          trunk_percent?: number | null
          updated_at?: string | null
          user_id: string
          visceral_fat_area?: number | null
          weight?: number | null
        }
        Update: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          created_at?: string | null
          id?: string
          left_arm_mass?: number | null
          left_arm_percent?: number | null
          left_leg_mass?: number | null
          left_leg_percent?: number | null
          minerals?: number | null
          pdf_url?: string | null
          percent_body_fat?: number | null
          protein?: number | null
          raw_data?: Json | null
          right_arm_mass?: number | null
          right_arm_percent?: number | null
          right_leg_mass?: number | null
          right_leg_percent?: number | null
          skeletal_muscle_mass?: number | null
          test_date?: string
          total_body_water?: number | null
          trunk_mass?: number | null
          trunk_percent?: number | null
          updated_at?: string | null
          user_id?: string
          visceral_fat_area?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      measurements: {
        Row: {
          apple_health_id: string | null
          created_at: string
          goal_id: string
          id: string
          measurement_date: string
          notes: string | null
          photo_url: string | null
          screenshot_url: string | null
          source: string | null
          unit: string
          user_id: string
          value: number
          verified_by_trainer: boolean | null
          whoop_id: string | null
        }
        Insert: {
          apple_health_id?: string | null
          created_at?: string
          goal_id: string
          id?: string
          measurement_date?: string
          notes?: string | null
          photo_url?: string | null
          screenshot_url?: string | null
          source?: string | null
          unit: string
          user_id: string
          value: number
          verified_by_trainer?: boolean | null
          whoop_id?: string | null
        }
        Update: {
          apple_health_id?: string | null
          created_at?: string
          goal_id?: string
          id?: string
          measurement_date?: string
          notes?: string | null
          photo_url?: string | null
          screenshot_url?: string | null
          source?: string | null
          unit?: string
          user_id?: string
          value?: number
          verified_by_trainer?: boolean | null
          whoop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      metric_mappings: {
        Row: {
          aggregation_method: string
          created_at: string
          device_mappings: Json
          id: string
          is_active: boolean
          priority_order: string[] | null
          unified_metric_category: string
          unified_metric_name: string
          unified_unit: string
          updated_at: string
        }
        Insert: {
          aggregation_method?: string
          created_at?: string
          device_mappings?: Json
          id?: string
          is_active?: boolean
          priority_order?: string[] | null
          unified_metric_category: string
          unified_metric_name: string
          unified_unit: string
          updated_at?: string
        }
        Update: {
          aggregation_method?: string
          created_at?: string
          device_mappings?: Json
          id?: string
          is_active?: boolean
          priority_order?: string[] | null
          unified_metric_category?: string
          unified_metric_name?: string
          unified_unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      metric_values: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          measurement_date: string
          metric_id: string
          notes: string | null
          photo_url: string | null
          source_data: Json | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          measurement_date?: string
          metric_id: string
          notes?: string | null
          photo_url?: string | null
          source_data?: Json | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          measurement_date?: string
          metric_id?: string
          notes?: string | null
          photo_url?: string | null
          source_data?: Json | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "metric_values_metric_id_fkey"
            columns: ["metric_id"]
            isOneToOne: false
            referencedRelation: "user_metrics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email_updates: boolean | null
          full_name: string | null
          id: string
          notifications_enabled: boolean | null
          progress_sharing: boolean | null
          trainer_role: boolean | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email_updates?: boolean | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          progress_sharing?: boolean | null
          trainer_role?: boolean | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email_updates?: boolean | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          progress_sharing?: boolean | null
          trainer_role?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      terra_data_payloads: {
        Row: {
          created_at: string
          data_type: string
          end_time: string | null
          payload_id: string
          start_time: string | null
          user_id: string
        }
        Insert: {
          created_at: string
          data_type: string
          end_time?: string | null
          payload_id: string
          start_time?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string
          end_time?: string | null
          payload_id?: string
          start_time?: string | null
          user_id?: string
        }
        Relationships: []
      }
      terra_misc_payloads: {
        Row: {
          created_at: string
          data_type: string | null
          payload_id: string
          payload_type: string | null
          user_id: string
        }
        Insert: {
          created_at: string
          data_type?: string | null
          payload_id: string
          payload_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data_type?: string | null
          payload_id?: string
          payload_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      terra_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          last_sync_date: string | null
          metadata: Json | null
          provider: string | null
          terra_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          metadata?: Json | null
          provider?: string | null
          terra_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          last_sync_date?: string | null
          metadata?: Json | null
          provider?: string | null
          terra_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terra_users: {
        Row: {
          created_at: string
          granted_scopes: string | null
          provider: string
          reference_id: string | null
          state: string | null
          user_id: string
        }
        Insert: {
          created_at: string
          granted_scopes?: string | null
          provider: string
          reference_id?: string | null
          state?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          granted_scopes?: string | null
          provider?: string
          reference_id?: string | null
          state?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trainer_broadcasts: {
        Row: {
          challenge_id: string | null
          created_at: string
          id: string
          message: string
          recipient_type: string
          sent_at: string | null
          sent_count: number | null
          specific_clients: string[] | null
          status: string
          subject: string
          trainer_id: string
        }
        Insert: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_type: string
          sent_at?: string | null
          sent_count?: number | null
          specific_clients?: string[] | null
          status?: string
          subject: string
          trainer_id: string
        }
        Update: {
          challenge_id?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_type?: string
          sent_at?: string | null
          sent_count?: number | null
          specific_clients?: string[] | null
          status?: string
          subject?: string
          trainer_id?: string
        }
        Relationships: []
      }
      trainer_clients: {
        Row: {
          active: boolean | null
          assigned_at: string | null
          client_id: string
          id: string
          trainer_id: string
        }
        Insert: {
          active?: boolean | null
          assigned_at?: string | null
          client_id: string
          id?: string
          trainer_id: string
        }
        Update: {
          active?: boolean | null
          assigned_at?: string | null
          client_id?: string
          id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      trainer_posts: {
        Row: {
          challenge_id: string | null
          content: string
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          post_type: string
          priority: string
          published: boolean
          scheduled_for: string | null
          target_audience: string
          title: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          challenge_id?: string | null
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          post_type: string
          priority?: string
          published?: boolean
          scheduled_for?: string | null
          target_audience?: string
          title: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          post_type?: string
          priority?: string
          published?: boolean
          scheduled_for?: string | null
          target_audience?: string
          title?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_posts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          metric_category: string
          metric_name: string
          source: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          metric_category: string
          metric_name: string
          source: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          metric_category?: string
          metric_name?: string
          source?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          source_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          source_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          source_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whoop_tokens: {
        Row: {
          access_token: string
          client_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_sync_date: string | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
          whoop_user_id: string
        }
        Insert: {
          access_token: string
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sync_date?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
          whoop_user_id: string
        }
        Update: {
          access_token?: string
          client_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_sync_date?: string | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
          whoop_user_id?: string
        }
        Relationships: []
      }
      whoop_user_mapping: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          whoop_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          whoop_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          whoop_user_id?: string
        }
        Relationships: []
      }
      withings_oauth_states: {
        Row: {
          created_at: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      withings_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts: {
        Row: {
          calories_burned: number | null
          created_at: string
          distance_km: number | null
          duration_minutes: number | null
          end_time: string | null
          external_id: string | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          id: string
          notes: string | null
          source: string | null
          source_data: Json | null
          start_time: string
          updated_at: string
          user_id: string
          workout_type: string
        }
        Insert: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          source_data?: Json | null
          start_time: string
          updated_at?: string
          user_id: string
          workout_type: string
        }
        Update: {
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number | null
          end_time?: string | null
          external_id?: string | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          id?: string
          notes?: string | null
          source?: string | null
          source_data?: Json | null
          start_time?: string
          updated_at?: string
          user_id?: string
          workout_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aggregate_daily_health_data: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      create_or_get_metric: {
        Args: {
          p_metric_category: string
          p_metric_name: string
          p_source: string
          p_unit: string
          p_user_id: string
        }
        Returns: string
      }
      get_unified_metrics: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_unified_metric_name?: string
          p_user_id: string
        }
        Returns: {
          aggregated_value: number
          measurement_date: string
          source_count: number
          source_values: Json
          sources: string[]
          unified_category: string
          unified_metric_name: string
          unified_unit: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_trainer: {
        Args: { _user_id: string }
        Returns: boolean
      }
      sync_all_whoop_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "trainer" | "admin"
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
  public: {
    Enums: {
      app_role: ["user", "trainer", "admin"],
    },
  },
} as const
