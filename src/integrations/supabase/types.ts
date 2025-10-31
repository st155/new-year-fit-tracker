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
          activity_subtype: string | null
          aggregated_data: Json | null
          created_at: string
          id: string
          is_milestone: boolean | null
          measurement_date: string | null
          metadata: Json | null
          milestone_type: string | null
          source_id: string
          source_table: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_text: string
          action_type: string
          activity_subtype?: string | null
          aggregated_data?: Json | null
          created_at?: string
          id?: string
          is_milestone?: boolean | null
          measurement_date?: string | null
          metadata?: Json | null
          milestone_type?: string | null
          source_id: string
          source_table: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_text?: string
          action_type?: string
          activity_subtype?: string | null
          aggregated_data?: Json | null
          created_at?: string
          id?: string
          is_milestone?: boolean | null
          measurement_date?: string | null
          metadata?: Json | null
          milestone_type?: string | null
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
      activity_reactions: {
        Row: {
          activity_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activity_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_logs: {
        Row: {
          action_details: Json
          action_type: string
          client_id: string | null
          conversation_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          pending_action_id: string | null
          success: boolean
          trainer_id: string
        }
        Insert: {
          action_details: Json
          action_type: string
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pending_action_id?: string | null
          success: boolean
          trainer_id: string
        }
        Update: {
          action_details?: Json
          action_type?: string
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          pending_action_id?: string | null
          success?: boolean
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_logs_pending_action_id_fkey"
            columns: ["pending_action_id"]
            isOneToOne: false
            referencedRelation: "ai_pending_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          category: string | null
          context_mode: string
          created_at: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          title: string | null
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          context_mode?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          title?: string | null
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          context_mode?: string
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          title?: string | null
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pending_actions: {
        Row: {
          action_data: Json
          action_plan: string
          action_type: string
          conversation_id: string
          created_at: string | null
          executed_at: string | null
          id: string
          status: string
          trainer_id: string
        }
        Insert: {
          action_data: Json
          action_plan: string
          action_type: string
          conversation_id: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          trainer_id: string
        }
        Update: {
          action_data?: Json
          action_plan?: string
          action_type?: string
          conversation_id?: string
          created_at?: string | null
          executed_at?: string | null
          id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_pending_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      assigned_training_plans: {
        Row: {
          assigned_by: string
          client_id: string
          created_at: string | null
          end_date: string | null
          id: string
          plan_id: string | null
          start_date: string
          status: string | null
        }
        Insert: {
          assigned_by: string
          client_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan_id?: string | null
          start_date: string
          status?: string | null
        }
        Update: {
          assigned_by?: string
          client_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          plan_id?: string | null
          start_date?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_training_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      background_jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string | null
          error: string | null
          id: string
          max_attempts: number | null
          payload: Json
          result: Json | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          type: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          payload: Json
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          type: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          payload?: Json
          result?: Json | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          type?: string
        }
        Relationships: []
      }
      background_jobs_dlq: {
        Row: {
          attempts: number | null
          created_at: string | null
          error: string | null
          failed_at: string | null
          id: string
          original_job_id: string | null
          payload: Json
          retried: boolean | null
          retry_scheduled_at: string | null
          type: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          original_job_id?: string | null
          payload: Json
          retried?: boolean | null
          retry_scheduled_at?: string | null
          type: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          original_job_id?: string | null
          payload?: Json
          retried?: boolean | null
          retry_scheduled_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "background_jobs_dlq_original_job_id_fkey"
            columns: ["original_job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
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
          migrated_photo_after_id: string | null
          migrated_photo_before_id: string | null
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
          migrated_photo_after_id?: string | null
          migrated_photo_before_id?: string | null
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
          migrated_photo_after_id?: string | null
          migrated_photo_before_id?: string | null
          muscle_mass?: number | null
          photo_after_url?: string | null
          photo_before_url?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_composition_migrated_photo_after_id_fkey"
            columns: ["migrated_photo_after_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_composition_migrated_photo_before_id_fkey"
            columns: ["migrated_photo_before_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
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
      challenge_disciplines: {
        Row: {
          benchmark_value: number | null
          challenge_id: string
          created_at: string | null
          discipline_name: string
          discipline_type: string
          id: string
          position: number
          unit: string
        }
        Insert: {
          benchmark_value?: number | null
          challenge_id: string
          created_at?: string | null
          discipline_name: string
          discipline_type: string
          id?: string
          position?: number
          unit: string
        }
        Update: {
          benchmark_value?: number | null
          challenge_id?: string
          created_at?: string | null
          discipline_name?: string
          discipline_type?: string
          id?: string
          position?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_disciplines_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          baseline_body_fat: number | null
          baseline_goals: Json | null
          baseline_muscle_mass: number | null
          baseline_recorded_at: string | null
          baseline_source: string | null
          baseline_weight: number | null
          challenge_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          baseline_body_fat?: number | null
          baseline_goals?: Json | null
          baseline_muscle_mass?: number | null
          baseline_recorded_at?: string | null
          baseline_source?: string | null
          baseline_weight?: number | null
          challenge_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          baseline_body_fat?: number | null
          baseline_goals?: Json | null
          baseline_muscle_mass?: number | null
          baseline_recorded_at?: string | null
          baseline_source?: string | null
          baseline_weight?: number | null
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
      challenge_trainers: {
        Row: {
          added_at: string | null
          challenge_id: string
          id: string
          role: string | null
          trainer_id: string
        }
        Insert: {
          added_at?: string | null
          challenge_id: string
          id?: string
          role?: string | null
          trainer_id: string
        }
        Update: {
          added_at?: string | null
          challenge_id?: string
          id?: string
          role?: string | null
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_trainers_challenge_id_fkey"
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
      client_aliases: {
        Row: {
          alias_name: string
          client_id: string
          created_at: string | null
          id: string
          trainer_id: string
          used_count: number | null
        }
        Insert: {
          alias_name: string
          client_id: string
          created_at?: string | null
          id?: string
          trainer_id: string
          used_count?: number | null
        }
        Update: {
          alias_name?: string
          client_id?: string
          created_at?: string | null
          id?: string
          trainer_id?: string
          used_count?: number | null
        }
        Relationships: []
      }
      client_notes: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          trainer_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          trainer_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_tasks: {
        Row: {
          client_id: string
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          metadata: Json | null
          priority: string | null
          status: string | null
          task_type: string | null
          title: string
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          trainer_id?: string
          updated_at?: string | null
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
          display_mode: string | null
          id: string
          is_visible: boolean
          metric_name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_mode?: string | null
          id?: string
          is_visible?: boolean
          metric_name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_mode?: string | null
          id?: string
          is_visible?: boolean
          metric_name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_freshness_tracking: {
        Row: {
          alert_sent: boolean | null
          consecutive_missing_days: number | null
          created_at: string | null
          data_type: string
          id: string
          last_received_at: string
          last_received_date: string
          provider: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_sent?: boolean | null
          consecutive_missing_days?: number | null
          created_at?: string | null
          data_type: string
          id?: string
          last_received_at: string
          last_received_date: string
          provider: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_sent?: boolean | null
          consecutive_missing_days?: number | null
          created_at?: string | null
          data_type?: string
          id?: string
          last_received_at?: string
          last_received_date?: string
          provider?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      edge_function_logs: {
        Row: {
          duration_ms: number | null
          function_name: string
          id: string
          level: string
          message: string
          metadata: Json | null
          request_id: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          function_name: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          request_id?: string | null
          timestamp: string
          user_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          function_name?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          request_id?: string | null
          timestamp?: string
          user_id?: string | null
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
      failed_webhook_processing: {
        Row: {
          created_at: string | null
          error_message: string
          id: string
          last_retry_at: string | null
          next_retry_at: string | null
          payload: Json
          provider: string
          retry_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          webhook_log_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          id?: string
          last_retry_at?: string | null
          next_retry_at?: string | null
          payload: Json
          provider: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_log_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          id?: string
          last_retry_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          provider?: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          webhook_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_webhook_processing_webhook_log_id_fkey"
            columns: ["webhook_log_id"]
            isOneToOne: false
            referencedRelation: "webhook_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      fasting_windows: {
        Row: {
          created_at: string | null
          eating_duration: number | null
          eating_end: string | null
          eating_start: string
          fasting_duration: number | null
          habit_id: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          eating_duration?: number | null
          eating_end?: string | null
          eating_start: string
          fasting_duration?: number | null
          habit_id: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          eating_duration?: number | null
          eating_end?: string | null
          eating_start?: string
          fasting_duration?: number | null
          habit_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fasting_windows_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_baselines: {
        Row: {
          baseline_value: number
          created_at: string | null
          goal_id: string | null
          id: string
          recorded_at: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          baseline_value: number
          created_at?: string | null
          goal_id?: string | null
          id?: string
          recorded_at?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          baseline_value?: number
          created_at?: string | null
          goal_id?: string | null
          id?: string
          recorded_at?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_baselines_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "challenge_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "goal_baselines_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      habit_attempts: {
        Row: {
          created_at: string | null
          days_lasted: number | null
          end_date: string | null
          habit_id: string
          id: string
          reset_reason: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_lasted?: number | null
          end_date?: string | null
          habit_id: string
          id?: string
          reset_reason?: string | null
          start_date: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_lasted?: number | null
          end_date?: string | null
          habit_id?: string
          id?: string
          reset_reason?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_attempts_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
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
      habit_measurements: {
        Row: {
          created_at: string | null
          habit_id: string
          id: string
          measurement_date: string
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string | null
          habit_id: string
          id?: string
          measurement_date?: string
          notes?: string | null
          user_id: string
          value: number
        }
        Update: {
          created_at?: string | null
          habit_id?: string
          id?: string
          measurement_date?: string
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_measurements_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
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
          ai_motivation: Json | null
          category: string
          color: string | null
          created_at: string
          custom_settings: Json | null
          description: string | null
          frequency: string
          habit_type: string | null
          icon: string | null
          id: string
          is_active: boolean
          linked_goal_id: string | null
          measurement_unit: string | null
          name: string
          reminder_time: string | null
          start_date: string | null
          target_count: number
          target_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_motivation?: Json | null
          category?: string
          color?: string | null
          created_at?: string
          custom_settings?: Json | null
          description?: string | null
          frequency?: string
          habit_type?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          linked_goal_id?: string | null
          measurement_unit?: string | null
          name: string
          reminder_time?: string | null
          start_date?: string | null
          target_count?: number
          target_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_motivation?: Json | null
          category?: string
          color?: string | null
          created_at?: string
          custom_settings?: Json | null
          description?: string | null
          frequency?: string
          habit_type?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          linked_goal_id?: string | null
          measurement_unit?: string | null
          name?: string
          reminder_time?: string | null
          start_date?: string | null
          target_count?: number
          target_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "challenge_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "habits_linked_goal_id_fkey"
            columns: ["linked_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
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
      idempotency_keys: {
        Row: {
          created_at: string | null
          id: string
          key: string
          result: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          result: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          result?: Json
        }
        Relationships: []
      }
      inbody_analyses: {
        Row: {
          ai_insights: string[] | null
          ai_summary: string | null
          bmi: number | null
          bmr: number | null
          body_cell_mass: number | null
          body_fat_mass: number | null
          created_at: string | null
          ecw_ratio: number | null
          extracellular_water: number | null
          fat_free_mass: number | null
          id: string
          intracellular_water: number | null
          left_arm_ecw_ratio: number | null
          left_arm_lean_mass: number | null
          left_arm_mass: number | null
          left_arm_percent: number | null
          left_leg_ecw_ratio: number | null
          left_leg_lean_mass: number | null
          left_leg_mass: number | null
          left_leg_percent: number | null
          migrated_to_document_id: string | null
          minerals: number | null
          parsed_data: Json | null
          pdf_url: string | null
          percent_body_fat: number | null
          protein: number | null
          raw_data: Json | null
          right_arm_ecw_ratio: number | null
          right_arm_lean_mass: number | null
          right_arm_mass: number | null
          right_arm_percent: number | null
          right_leg_ecw_ratio: number | null
          right_leg_lean_mass: number | null
          right_leg_mass: number | null
          right_leg_percent: number | null
          skeletal_muscle_mass: number | null
          smi: number | null
          soft_lean_mass: number | null
          test_date: string
          total_body_water: number | null
          trunk_ecw_ratio: number | null
          trunk_lean_mass: number | null
          trunk_mass: number | null
          trunk_percent: number | null
          updated_at: string | null
          user_id: string
          visceral_fat_area: number | null
          waist_hip_ratio: number | null
          weight: number | null
        }
        Insert: {
          ai_insights?: string[] | null
          ai_summary?: string | null
          bmi?: number | null
          bmr?: number | null
          body_cell_mass?: number | null
          body_fat_mass?: number | null
          created_at?: string | null
          ecw_ratio?: number | null
          extracellular_water?: number | null
          fat_free_mass?: number | null
          id?: string
          intracellular_water?: number | null
          left_arm_ecw_ratio?: number | null
          left_arm_lean_mass?: number | null
          left_arm_mass?: number | null
          left_arm_percent?: number | null
          left_leg_ecw_ratio?: number | null
          left_leg_lean_mass?: number | null
          left_leg_mass?: number | null
          left_leg_percent?: number | null
          migrated_to_document_id?: string | null
          minerals?: number | null
          parsed_data?: Json | null
          pdf_url?: string | null
          percent_body_fat?: number | null
          protein?: number | null
          raw_data?: Json | null
          right_arm_ecw_ratio?: number | null
          right_arm_lean_mass?: number | null
          right_arm_mass?: number | null
          right_arm_percent?: number | null
          right_leg_ecw_ratio?: number | null
          right_leg_lean_mass?: number | null
          right_leg_mass?: number | null
          right_leg_percent?: number | null
          skeletal_muscle_mass?: number | null
          smi?: number | null
          soft_lean_mass?: number | null
          test_date: string
          total_body_water?: number | null
          trunk_ecw_ratio?: number | null
          trunk_lean_mass?: number | null
          trunk_mass?: number | null
          trunk_percent?: number | null
          updated_at?: string | null
          user_id: string
          visceral_fat_area?: number | null
          waist_hip_ratio?: number | null
          weight?: number | null
        }
        Update: {
          ai_insights?: string[] | null
          ai_summary?: string | null
          bmi?: number | null
          bmr?: number | null
          body_cell_mass?: number | null
          body_fat_mass?: number | null
          created_at?: string | null
          ecw_ratio?: number | null
          extracellular_water?: number | null
          fat_free_mass?: number | null
          id?: string
          intracellular_water?: number | null
          left_arm_ecw_ratio?: number | null
          left_arm_lean_mass?: number | null
          left_arm_mass?: number | null
          left_arm_percent?: number | null
          left_leg_ecw_ratio?: number | null
          left_leg_lean_mass?: number | null
          left_leg_mass?: number | null
          left_leg_percent?: number | null
          migrated_to_document_id?: string | null
          minerals?: number | null
          parsed_data?: Json | null
          pdf_url?: string | null
          percent_body_fat?: number | null
          protein?: number | null
          raw_data?: Json | null
          right_arm_ecw_ratio?: number | null
          right_arm_lean_mass?: number | null
          right_arm_mass?: number | null
          right_arm_percent?: number | null
          right_leg_ecw_ratio?: number | null
          right_leg_lean_mass?: number | null
          right_leg_mass?: number | null
          right_leg_percent?: number | null
          skeletal_muscle_mass?: number | null
          smi?: number | null
          soft_lean_mass?: number | null
          test_date?: string
          total_body_water?: number | null
          trunk_ecw_ratio?: number | null
          trunk_lean_mass?: number | null
          trunk_mass?: number | null
          trunk_percent?: number | null
          updated_at?: string | null
          user_id?: string
          visceral_fat_area?: number | null
          waist_hip_ratio?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inbody_analyses_migrated_to_document_id_fkey"
            columns: ["migrated_to_document_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      inbody_uploads: {
        Row: {
          analysis_id: string | null
          created_at: string | null
          error_message: string | null
          file_name: string
          file_size: number | null
          id: string
          image_path: string | null
          migrated_to_document_id: string | null
          status: string | null
          storage_path: string
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          analysis_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          image_path?: string | null
          migrated_to_document_id?: string | null
          status?: string | null
          storage_path: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          analysis_id?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          image_path?: string | null
          migrated_to_document_id?: string | null
          status?: string | null
          storage_path?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbody_uploads_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "inbody_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbody_uploads_migrated_to_document_id_fkey"
            columns: ["migrated_to_document_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "challenge_progress"
            referencedColumns: ["goal_id"]
          },
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
      medical_documents: {
        Row: {
          ai_extracted_data: Json | null
          ai_processed: boolean
          ai_summary: string | null
          compared_with: string[] | null
          comparison_results: Json | null
          created_at: string
          document_date: string | null
          document_type: string
          file_name: string
          file_size: number | null
          hidden_from_trainer: boolean
          id: string
          mime_type: string | null
          notes: string | null
          storage_path: string
          tags: string[] | null
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          ai_processed?: boolean
          ai_summary?: string | null
          compared_with?: string[] | null
          comparison_results?: Json | null
          created_at?: string
          document_date?: string | null
          document_type: string
          file_name: string
          file_size?: number | null
          hidden_from_trainer?: boolean
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path: string
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          ai_extracted_data?: Json | null
          ai_processed?: boolean
          ai_summary?: string | null
          compared_with?: string[] | null
          comparison_results?: Json | null
          created_at?: string
          document_date?: string | null
          document_type?: string
          file_name?: string
          file_size?: number | null
          hidden_from_trainer?: boolean
          id?: string
          mime_type?: string | null
          notes?: string | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      metric_confidence_cache: {
        Row: {
          confidence_score: number
          created_at: string | null
          cross_validation: number
          data_freshness: number
          id: string
          measurement_date: string
          measurement_frequency: number
          metric_name: string
          source: string
          source_reliability: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score: number
          created_at?: string | null
          cross_validation: number
          data_freshness: number
          id?: string
          measurement_date: string
          measurement_frequency: number
          metric_name: string
          source: string
          source_reliability: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          cross_validation?: number
          data_freshness?: number
          id?: string
          measurement_date?: string
          measurement_frequency?: number
          metric_name?: string
          source?: string
          source_reliability?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metric_mappings: {
        Row: {
          aggregation_method: string
          conflict_resolution_strategy: string | null
          created_at: string
          device_mappings: Json
          id: string
          is_active: boolean
          priority_order: string[] | null
          source_priorities: Json | null
          unified_metric_category: string
          unified_metric_name: string
          unified_unit: string
          updated_at: string
        }
        Insert: {
          aggregation_method?: string
          conflict_resolution_strategy?: string | null
          created_at?: string
          device_mappings?: Json
          id?: string
          is_active?: boolean
          priority_order?: string[] | null
          source_priorities?: Json | null
          unified_metric_category: string
          unified_metric_name: string
          unified_unit: string
          updated_at?: string
        }
        Update: {
          aggregation_method?: string
          conflict_resolution_strategy?: string | null
          created_at?: string
          device_mappings?: Json
          id?: string
          is_active?: boolean
          priority_order?: string[] | null
          source_priorities?: Json | null
          unified_metric_category?: string
          unified_metric_name?: string
          unified_unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      metric_values: {
        Row: {
          confidence_factors: Json | null
          confidence_score: number | null
          conflict_resolution_method: string | null
          created_at: string
          external_id: string | null
          id: string
          is_outlier: boolean | null
          measurement_date: string
          metric_id: string
          notes: string | null
          photo_url: string | null
          source_data: Json | null
          user_id: string
          value: number
        }
        Insert: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_resolution_method?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
          measurement_date?: string
          metric_id: string
          notes?: string | null
          photo_url?: string | null
          source_data?: Json | null
          user_id: string
          value: number
        }
        Update: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_resolution_method?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
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
      rate_limits: {
        Row: {
          count: number | null
          created_at: string | null
          key: string
          window_start: string | null
        }
        Insert: {
          count?: number | null
          created_at?: string | null
          key: string
          window_start?: string | null
        }
        Update: {
          count?: number | null
          created_at?: string | null
          key?: string
          window_start?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      terra_backfill_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          date_being_processed: string | null
          end_date: string
          error_message: string | null
          id: string
          processed_days: number | null
          progress_percentage: number | null
          provider: string
          start_date: string
          status: string | null
          total_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          date_being_processed?: string | null
          end_date: string
          error_message?: string | null
          id?: string
          processed_days?: number | null
          progress_percentage?: number | null
          provider: string
          start_date: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          date_being_processed?: string | null
          end_date?: string
          error_message?: string | null
          id?: string
          processed_days?: number | null
          progress_percentage?: number | null
          provider?: string
          start_date?: string
          status?: string | null
          total_days?: number | null
          updated_at?: string | null
          user_id?: string
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
      terra_webhooks_raw: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
          processed_at: string | null
          processed_count: number | null
          provider: string | null
          status: string
          type: string
          user_id: string | null
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
          processed_at?: string | null
          processed_count?: number | null
          provider?: string | null
          status?: string
          type: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
          processed_at?: string | null
          processed_count?: number | null
          provider?: string | null
          status?: string
          type?: string
          user_id?: string | null
          webhook_id?: string | null
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
      trainer_client_messages: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_text: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_text?: string
          recipient_id?: string
          sender_id?: string
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
      trainer_notes: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          is_private: boolean | null
          note_text: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note_text: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          is_private?: boolean | null
          note_text?: string
          trainer_id?: string
        }
        Relationships: []
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
      trainer_schedule_events: {
        Row: {
          client_id: string | null
          created_at: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          is_cancelled: boolean
          is_completed: boolean
          location: string | null
          metadata: Json | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          start_time: string
          title: string
          trainer_id: string
          training_plan_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          event_type: string
          id?: string
          is_cancelled?: boolean
          is_completed?: boolean
          location?: string | null
          metadata?: Json | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_time: string
          title: string
          trainer_id: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          is_cancelled?: boolean
          is_completed?: boolean
          location?: string | null
          metadata?: Json | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          start_time?: string
          title?: string
          trainer_id?: string
          training_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_schedule_events_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plan_workouts: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          description: string | null
          duration_minutes: number | null
          exercises: Json | null
          id: string
          instructions: string | null
          plan_id: string | null
          week_number: number | null
          workout_name: string
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          instructions?: string | null
          plan_id?: string | null
          week_number?: number | null
          workout_name: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          instructions?: string | null
          plan_id?: string | null
          week_number?: number | null
          workout_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plan_workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          is_template: boolean | null
          name: string
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_template?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          is_template?: boolean | null
          name?: string
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unified_metrics: {
        Row: {
          confidence_factors: Json | null
          confidence_score: number | null
          created_at: string | null
          external_id: string | null
          id: string
          is_outlier: boolean | null
          measurement_date: string
          metric_category: string
          metric_name: string
          notes: string | null
          photo_url: string | null
          priority: number
          provider: string | null
          source: string
          source_data: Json | null
          unit: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
          measurement_date: string
          metric_category: string
          metric_name: string
          notes?: string | null
          photo_url?: string | null
          priority?: number
          provider?: string | null
          source: string
          source_data?: Json | null
          unit: string
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
          measurement_date?: string
          metric_category?: string
          metric_name?: string
          notes?: string | null
          photo_url?: string | null
          priority?: number
          provider?: string | null
          source?: string
          source_data?: Json | null
          unit?: string
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string | null
          id: string
          progress: number | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string | null
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string | null
          id?: string
          progress?: number | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      web_vitals_logs: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          rating: string
          url: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          rating: string
          url: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          rating?: string
          url?: string
          value?: number
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          status: string
          terra_user_id: string | null
          user_id: string | null
          webhook_type: string
          whoop_user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status: string
          terra_user_id?: string | null
          user_id?: string | null
          webhook_type: string
          whoop_user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string
          terra_user_id?: string | null
          user_id?: string | null
          webhook_type?: string
          whoop_user_id?: string | null
        }
        Relationships: []
      }
      webhook_retry_queue: {
        Row: {
          created_at: string | null
          data_type: string
          error_message: string | null
          id: string
          last_retry_at: string | null
          missing_date: string
          provider: string
          retry_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_type: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          missing_date: string
          provider: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_type?: string
          error_message?: string | null
          id?: string
          last_retry_at?: string | null
          missing_date?: string
          provider?: string
          retry_count?: number | null
          status?: string | null
          updated_at?: string | null
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
      challenge_leaderboard_v2: {
        Row: {
          active_days: number | null
          avatar_url: string | null
          avg_hrv: number | null
          avg_recovery: number | null
          avg_recovery_last_7d: number | null
          avg_resting_hr: number | null
          avg_sleep: number | null
          avg_sleep_efficiency: number | null
          avg_sleep_last_7d: number | null
          avg_strain: number | null
          avg_strain_last_7d: number | null
          challenge_id: string | null
          full_name: string | null
          id: string | null
          last_activity_date: string | null
          steps_last_7d: number | null
          streak_days: number | null
          total_active_calories: number | null
          total_points: number | null
          total_steps: number | null
          user_id: string | null
          username: string | null
          weekly_consistency: number | null
          workouts_last_7d: number | null
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
      challenge_progress: {
        Row: {
          baseline_recorded_at: string | null
          baseline_source: string | null
          baseline_value: number | null
          challenge_id: string | null
          current_value: number | null
          goal_id: string | null
          goal_name: string | null
          goal_type: string | null
          progress_percent: number | null
          target_unit: string | null
          target_value: number | null
          user_id: string | null
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
      client_unified_metrics: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          measurement_date: string | null
          metric_category: string | null
          metric_name: string | null
          priority: number | null
          source: string | null
          unit: string | null
          user_id: string | null
          value: number | null
        }
        Relationships: []
      }
      data_quality_trends: {
        Row: {
          avg_confidence: number | null
          date: string | null
          excellent_count: number | null
          fair_count: number | null
          good_count: number | null
          metric_name: string | null
          metrics_count: number | null
          poor_count: number | null
        }
        Relationships: []
      }
      edge_function_performance: {
        Row: {
          date: string | null
          errors: number | null
          first_invocation: string | null
          function_name: string | null
          invocations: number | null
          last_invocation: string | null
        }
        Relationships: []
      }
      job_processing_stats: {
        Row: {
          avg_duration_seconds: number | null
          count: number | null
          date: string | null
          job_type: string | null
          max_duration_seconds: number | null
          status: string | null
        }
        Relationships: []
      }
      latest_unified_metrics: {
        Row: {
          created_at: string | null
          measurement_date: string | null
          metric_name: string | null
          priority: number | null
          source: string | null
          unit: string | null
          user_id: string | null
          value: number | null
        }
        Relationships: []
      }
      trainer_client_summary: {
        Row: {
          active_goals_count: number | null
          avatar_url: string | null
          client_id: string | null
          full_name: string | null
          health_summary: Json | null
          last_activity_date: string | null
          recent_measurements_count: number | null
          trainer_id: string | null
          username: string | null
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
      webhook_processing_stats: {
        Row: {
          avg_processing_seconds: number | null
          count: number | null
          date: string | null
          status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_daily_health_data: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      cleanup_background_jobs: { Args: never; Returns: undefined }
      cleanup_edge_function_logs: { Args: never; Returns: undefined }
      cleanup_idempotency_keys: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      cleanup_terra_webhooks: { Args: never; Returns: undefined }
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
      enqueue_initial_confidence_calculations: {
        Args: never
        Returns: {
          jobs_created: number
        }[]
      }
      get_client_detailed_data: {
        Args: { p_client_id: string; p_days?: number }
        Returns: Json
      }
      get_client_unified_metrics_secure: {
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
      get_monitoring_dashboard_data: { Args: never; Returns: Json }
      get_trainer_clients_summary: {
        Args: { p_trainer_id?: string }
        Returns: {
          active_goals_count: number
          avatar_url: string
          client_id: string
          full_name: string
          health_summary: Json
          last_activity_date: string
          recent_measurements_count: number
          trainer_id: string
          username: string
        }[]
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
      increment_rate_limit: {
        Args: {
          p_key: string
          p_max_requests: number
          p_window_ms: number
          p_window_start: string
        }
        Returns: Json
      }
      is_challenge_participant: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_challenge_trainer: {
        Args: { _challenge_id: string; _user_id: string }
        Returns: boolean
      }
      is_trainer: { Args: { _user_id: string }; Returns: boolean }
      retry_failed_jobs: {
        Args: { p_job_type?: string }
        Returns: {
          retried_count: number
        }[]
      }
      sync_all_whoop_users: { Args: never; Returns: undefined }
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
