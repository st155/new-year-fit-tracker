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
      ai_goal_suggestions: {
        Row: {
          applied_at: string | null
          client_id: string
          confidence_score: number | null
          created_at: string | null
          current_progress: number | null
          dismissed_reason: string | null
          goal_id: string | null
          id: string
          priority: number | null
          progress_trend: string | null
          recommendation_text: string
          status: string | null
          suggested_action: Json | null
          suggestion_type: string
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          applied_at?: string | null
          client_id: string
          confidence_score?: number | null
          created_at?: string | null
          current_progress?: number | null
          dismissed_reason?: string | null
          goal_id?: string | null
          id?: string
          priority?: number | null
          progress_trend?: string | null
          recommendation_text: string
          status?: string | null
          suggested_action?: Json | null
          suggestion_type: string
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          applied_at?: string | null
          client_id?: string
          confidence_score?: number | null
          created_at?: string | null
          current_progress?: number | null
          dismissed_reason?: string | null
          goal_id?: string | null
          id?: string
          priority?: number | null
          progress_trend?: string | null
          recommendation_text?: string
          status?: string | null
          suggested_action?: Json | null
          suggestion_type?: string
          trainer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_goal_suggestions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_goal_suggestions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "challenge_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "ai_goal_suggestions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_current_values"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "ai_goal_suggestions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_goal_suggestions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
      ai_training_preferences: {
        Row: {
          created_at: string | null
          current_1rm: Json | null
          days_per_week: number
          equipment: Json
          experience_level: string
          focus_areas: Json | null
          id: string
          injuries_limitations: string | null
          lifting_styles: Json | null
          preferred_workout_duration: number | null
          primary_goal: string
          recovery_profile: Json | null
          training_days: number[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_1rm?: Json | null
          days_per_week: number
          equipment?: Json
          experience_level: string
          focus_areas?: Json | null
          id?: string
          injuries_limitations?: string | null
          lifting_styles?: Json | null
          preferred_workout_duration?: number | null
          primary_goal: string
          recovery_profile?: Json | null
          training_days?: number[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_1rm?: Json | null
          days_per_week?: number
          equipment?: Json
          experience_level?: string
          focus_areas?: Json | null
          id?: string
          injuries_limitations?: string | null
          lifting_styles?: Json | null
          preferred_workout_duration?: number | null
          primary_goal?: string
          recovery_profile?: Json | null
          training_days?: number[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      biomarker_ai_analysis: {
        Row: {
          analysis: Json
          biomarker_id: string
          created_at: string | null
          id: string
          insights: string | null
          latest_test_date: string
          results_count: number
          statistics: Json | null
          updated_at: string | null
          user_id: string
          zones: Json | null
        }
        Insert: {
          analysis: Json
          biomarker_id: string
          created_at?: string | null
          id?: string
          insights?: string | null
          latest_test_date: string
          results_count: number
          statistics?: Json | null
          updated_at?: string | null
          user_id: string
          zones?: Json | null
        }
        Update: {
          analysis?: Json
          biomarker_id?: string
          created_at?: string | null
          id?: string
          insights?: string | null
          latest_test_date?: string
          results_count?: number
          statistics?: Json | null
          updated_at?: string | null
          user_id?: string
          zones?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_ai_analysis_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarker_aliases: {
        Row: {
          alias: string
          alias_normalized: string | null
          biomarker_id: string
          created_at: string | null
          id: string
          language: string | null
          source: string | null
        }
        Insert: {
          alias: string
          alias_normalized?: string | null
          biomarker_id: string
          created_at?: string | null
          id?: string
          language?: string | null
          source?: string | null
        }
        Update: {
          alias?: string
          alias_normalized?: string | null
          biomarker_id?: string
          created_at?: string | null
          id?: string
          language?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_aliases_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarker_correlations: {
        Row: {
          biomarker_id: string | null
          correlation_type: string
          created_at: string | null
          evidence_level: string | null
          expected_change_percent: number | null
          id: string
          pubmed_links: string[] | null
          research_summary: string | null
          supplement_name: string
          timeframe_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          biomarker_id?: string | null
          correlation_type: string
          created_at?: string | null
          evidence_level?: string | null
          expected_change_percent?: number | null
          id?: string
          pubmed_links?: string[] | null
          research_summary?: string | null
          supplement_name: string
          timeframe_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          biomarker_id?: string | null
          correlation_type?: string
          created_at?: string | null
          evidence_level?: string | null
          expected_change_percent?: number | null
          id?: string
          pubmed_links?: string[] | null
          research_summary?: string | null
          supplement_name?: string
          timeframe_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biomarker_correlations_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
        ]
      }
      biomarker_master: {
        Row: {
          alternative_units: Json | null
          canonical_name: string
          category: string
          clinical_significance: string | null
          conversion_factors: Json | null
          created_at: string | null
          data_type: string | null
          description: string | null
          display_name: string
          id: string
          interpretation_guide: string | null
          loinc_code: string | null
          reference_ranges: Json
          standard_unit: string
          updated_at: string | null
          wiki_link: string | null
        }
        Insert: {
          alternative_units?: Json | null
          canonical_name: string
          category: string
          clinical_significance?: string | null
          conversion_factors?: Json | null
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          display_name: string
          id?: string
          interpretation_guide?: string | null
          loinc_code?: string | null
          reference_ranges?: Json
          standard_unit: string
          updated_at?: string | null
          wiki_link?: string | null
        }
        Update: {
          alternative_units?: Json | null
          canonical_name?: string
          category?: string
          clinical_significance?: string | null
          conversion_factors?: Json | null
          created_at?: string | null
          data_type?: string | null
          description?: string | null
          display_name?: string
          id?: string
          interpretation_guide?: string | null
          loinc_code?: string | null
          reference_ranges?: Json
          standard_unit?: string
          updated_at?: string | null
          wiki_link?: string | null
        }
        Relationships: []
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
          difficulty_level: number | null
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
          difficulty_level?: number | null
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
          difficulty_level?: number | null
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
          performance_points: number | null
          points: number
          points_breakdown: Json | null
          posts_count: number
          recovery_points: number | null
          streak_days: number
          synergy_points: number | null
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
          performance_points?: number | null
          points?: number
          points_breakdown?: Json | null
          posts_count?: number
          recovery_points?: number | null
          streak_days?: number
          synergy_points?: number | null
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
          performance_points?: number | null
          points?: number
          points_breakdown?: Json | null
          posts_count?: number
          recovery_points?: number | null
          streak_days?: number
          synergy_points?: number | null
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
      challenge_templates: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string
          description: string | null
          difficulty_level: number | null
          duration_weeks: number | null
          id: string
          is_public: boolean | null
          preset_id: string | null
          target_audience: number | null
          template_data: Json
          template_name: string
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          difficulty_level?: number | null
          duration_weeks?: number | null
          id?: string
          is_public?: boolean | null
          preset_id?: string | null
          target_audience?: number | null
          template_data: Json
          template_name: string
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          difficulty_level?: number | null
          duration_weeks?: number | null
          id?: string
          is_public?: boolean | null
          preset_id?: string | null
          target_audience?: number | null
          template_data?: Json
          template_name?: string
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: []
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
      discipline_metric_mappings: {
        Row: {
          created_at: string | null
          discipline_name: string
          id: string
          unified_metric_name: string
        }
        Insert: {
          created_at?: string | null
          discipline_name: string
          id?: string
          unified_metric_name: string
        }
        Update: {
          created_at?: string | null
          discipline_name?: string
          id?: string
          unified_metric_name?: string
        }
        Relationships: []
      }
      doctor_recommendations: {
        Row: {
          added_to_stack_at: string | null
          confidence_score: number | null
          created_at: string
          doctor_name: string | null
          document_id: string
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          prescription_date: string | null
          rationale: string | null
          status: string
          supplement_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          added_to_stack_at?: string | null
          confidence_score?: number | null
          created_at?: string
          doctor_name?: string | null
          document_id: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          prescription_date?: string | null
          rationale?: string | null
          status?: string
          supplement_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          added_to_stack_at?: string | null
          confidence_score?: number | null
          created_at?: string
          doctor_name?: string | null
          document_id?: string
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          prescription_date?: string | null
          rationale?: string | null
          status?: string
          supplement_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_recommendations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
        ]
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
      fasting_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          end_time: string | null
          fasting_type: string
          id: string
          interrupted_reason: string | null
          notes: string | null
          start_time: string
          target_hours: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          end_time?: string | null
          fasting_type: string
          id?: string
          interrupted_reason?: string | null
          notes?: string | null
          start_time: string
          target_hours?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          end_time?: string | null
          fasting_type?: string
          id?: string
          interrupted_reason?: string | null
          notes?: string | null
          start_time?: string
          target_hours?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fasting_windows_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feed_reactions: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          reaction_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          reaction_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          reaction_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_reactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "habit_feed_events"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "goal_current_values"
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
      goal_templates: {
        Row: {
          created_at: string | null
          description: string | null
          goal_type: string
          id: string
          is_public: boolean | null
          target_value: number
          template_name: string
          trainer_id: string
          unit: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          goal_type: string
          id?: string
          is_public?: boolean | null
          target_value: number
          template_name: string
          trainer_id: string
          unit: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          goal_type?: string
          id?: string
          is_public?: boolean | null
          target_value?: number
          template_name?: string
          trainer_id?: string
          unit?: string
          usage_count?: number | null
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
      habit_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string
          achievement_type: string
          earned_at: string | null
          habit_id: string | null
          icon: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_description?: string | null
          achievement_name: string
          achievement_type: string
          earned_at?: string | null
          habit_id?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string
          achievement_type?: string
          earned_at?: string | null
          habit_id?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_achievements_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_achievements_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_ai_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          habit_id: string | null
          id: string
          insight_text: string
          insight_type: string
          is_read: boolean | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          habit_id?: string | null
          id?: string
          insight_text: string
          insight_type: string
          is_read?: boolean | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          habit_id?: string | null
          id?: string
          insight_text?: string
          insight_type?: string
          is_read?: boolean | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_ai_insights_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_ai_insights_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_ai_insights_user_id_fkey"
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
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_attempts_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_bundle_items: {
        Row: {
          bundle_id: string
          created_at: string | null
          habit_id: string
          id: string
          position: number
        }
        Insert: {
          bundle_id: string
          created_at?: string | null
          habit_id: string
          id?: string
          position: number
        }
        Update: {
          bundle_id?: string
          created_at?: string | null
          habit_id?: string
          id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "habit_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_bundle_items_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_bundle_items_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_bundles: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          estimated_duration_minutes: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          time_of_day: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          time_of_day?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          estimated_duration_minutes?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          time_of_day?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_bundles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_challenge_goals: {
        Row: {
          challenge_id: string
          created_at: string | null
          goal_description: string
          goal_metric: string
          goal_target: number
          habit_template_id: string | null
          id: string
          points_reward: number | null
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          goal_description: string
          goal_metric: string
          goal_target: number
          habit_template_id?: string | null
          id?: string
          points_reward?: number | null
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          goal_description?: string
          goal_metric?: string
          goal_target?: number
          habit_template_id?: string | null
          id?: string
          points_reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_challenge_goals_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_challenge_goals_habit_template_id_fkey"
            columns: ["habit_template_id"]
            isOneToOne: false
            referencedRelation: "habit_templates_community"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_challenges: {
        Row: {
          challenge_id: string
          created_at: string | null
          goal_target: number | null
          goal_type: string | null
          habit_id: string
          id: string
          xp_multiplier: number | null
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          goal_target?: number | null
          goal_type?: string | null
          habit_id: string
          id?: string
          xp_multiplier?: number | null
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          goal_target?: number | null
          goal_type?: string | null
          habit_id?: string
          id?: string
          xp_multiplier?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_challenges_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_challenges_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_collaborations: {
        Row: {
          can_edit: boolean | null
          can_log: boolean | null
          can_view: boolean | null
          collaborator_user_id: string
          created_at: string | null
          habit_id: string
          id: string
          owner_user_id: string
          role: string
        }
        Insert: {
          can_edit?: boolean | null
          can_log?: boolean | null
          can_view?: boolean | null
          collaborator_user_id: string
          created_at?: string | null
          habit_id: string
          id?: string
          owner_user_id: string
          role: string
        }
        Update: {
          can_edit?: boolean | null
          can_log?: boolean | null
          can_view?: boolean | null
          collaborator_user_id?: string
          created_at?: string | null
          habit_id?: string
          id?: string
          owner_user_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_collaborations_collaborator_user_id_fkey"
            columns: ["collaborator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "habit_collaborations_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_collaborations_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_collaborations_owner_user_id_fkey"
            columns: ["owner_user_id"]
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
      habit_dependencies: {
        Row: {
          created_at: string | null
          dependency_type: string | null
          depends_on_habit_id: string
          habit_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_habit_id: string
          habit_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          dependency_type?: string | null
          depends_on_habit_id?: string
          habit_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_dependencies_depends_on_habit_id_fkey"
            columns: ["depends_on_habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_dependencies_depends_on_habit_id_fkey"
            columns: ["depends_on_habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_dependencies_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_dependencies_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_feed_events: {
        Row: {
          comments_count: number | null
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          likes_count: number | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          comments_count?: number | null
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          likes_count?: number | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          comments_count?: number | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          likes_count?: number | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: []
      }
      habit_journal_entries: {
        Row: {
          created_at: string | null
          energy_level: number | null
          entry_date: string
          habit_id: string
          id: string
          mood: string | null
          notes: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          energy_level?: number | null
          entry_date: string
          habit_id: string
          id?: string
          mood?: string | null
          notes?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          energy_level?: number | null
          entry_date?: string
          habit_id?: string
          id?: string
          mood?: string | null
          notes?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_journal_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_journal_entries_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_measurements_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
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
      habit_streak_history: {
        Row: {
          created_at: string | null
          end_date: string | null
          habit_id: string
          id: string
          recovery_used_at: string | null
          start_date: string
          streak_length: number | null
          user_id: string
          was_recovered: boolean | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          habit_id: string
          id?: string
          recovery_used_at?: string | null
          start_date: string
          streak_length?: number | null
          user_id: string
          was_recovered?: boolean | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          habit_id?: string
          id?: string
          recovery_used_at?: string | null
          start_date?: string
          streak_length?: number | null
          user_id?: string
          was_recovered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_streak_history_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_streak_history_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_streak_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_teams: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          id: string
          is_public: boolean | null
          member_limit: number | null
          name: string
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_limit?: number | null
          name: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_limit?: number | null
          name?: string
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      habit_template_ratings: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          review: string | null
          template_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          template_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_template_ratings_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "habit_templates_community"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "habit_template_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_templates_community: {
        Row: {
          ai_motivation: Json | null
          category: string | null
          color: string | null
          created_at: string | null
          creator_user_id: string | null
          custom_settings: Json | null
          description: string | null
          habit_type: string
          icon: string | null
          id: string
          is_verified: boolean | null
          name: string
          rating_avg: number | null
          rating_count: number | null
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          ai_motivation?: Json | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          custom_settings?: Json | null
          description?: string | null
          habit_type: string
          icon?: string | null
          id?: string
          is_verified?: boolean | null
          name: string
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          ai_motivation?: Json | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          creator_user_id?: string | null
          custom_settings?: Json | null
          description?: string | null
          habit_type?: string
          icon?: string | null
          id?: string
          is_verified?: boolean | null
          name?: string
          rating_avg?: number | null
          rating_count?: number | null
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_templates_community_creator_user_id_fkey"
            columns: ["creator_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habits: {
        Row: {
          ai_motivation: Json | null
          category: string
          color: string | null
          created_at: string
          custom_settings: Json | null
          description: string | null
          difficulty_level: number | null
          estimated_duration_minutes: number | null
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
          time_of_day: string | null
          updated_at: string
          user_id: string
          visibility: string | null
          xp_reward: number | null
        }
        Insert: {
          ai_motivation?: Json | null
          category?: string
          color?: string | null
          created_at?: string
          custom_settings?: Json | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
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
          time_of_day?: string | null
          updated_at?: string
          user_id: string
          visibility?: string | null
          xp_reward?: number | null
        }
        Update: {
          ai_motivation?: Json | null
          category?: string
          color?: string | null
          created_at?: string
          custom_settings?: Json | null
          description?: string | null
          difficulty_level?: number | null
          estimated_duration_minutes?: number | null
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
          time_of_day?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string | null
          xp_reward?: number | null
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
            referencedRelation: "goal_current_values"
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
      health_analyses: {
        Row: {
          achievements: string[] | null
          ai_model: string | null
          analysis_date: string
          concerns: string[] | null
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          documents_analyzed: number | null
          health_categories: Json | null
          id: string
          overall_score: number | null
          recommendations: Json | null
          summary: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achievements?: string[] | null
          ai_model?: string | null
          analysis_date?: string
          concerns?: string[] | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          documents_analyzed?: number | null
          health_categories?: Json | null
          id?: string
          overall_score?: number | null
          recommendations?: Json | null
          summary: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achievements?: string[] | null
          ai_model?: string | null
          analysis_date?: string
          concerns?: string[] | null
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          documents_analyzed?: number | null
          health_categories?: Json | null
          id?: string
          overall_score?: number | null
          recommendations?: Json | null
          summary?: string
          updated_at?: string | null
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
      inbody_detailed_segments: {
        Row: {
          created_at: string | null
          id: string
          impedance_data: Json | null
          measurement_id: string
          research_params: Json | null
          segmental_data: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          impedance_data?: Json | null
          measurement_id: string
          research_params?: Json | null
          segmental_data?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          impedance_data?: Json | null
          measurement_id?: string
          research_params?: Json | null
          segmental_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inbody_detailed_segments_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: true
            referencedRelation: "inbody_measurements"
            referencedColumns: ["id"]
          },
        ]
      }
      inbody_measurements: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_mass: number | null
          body_fat_percentage: number | null
          created_at: string | null
          id: string
          mineral: number | null
          muscle_mass: number | null
          protein: number | null
          skeletal_muscle_mass: number | null
          test_date: string
          total_body_water: number | null
          updated_at: string | null
          user_id: string
          visceral_fat_level: number | null
          weight: number | null
        }
        Insert: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          id?: string
          mineral?: number | null
          muscle_mass?: number | null
          protein?: number | null
          skeletal_muscle_mass?: number | null
          test_date: string
          total_body_water?: number | null
          updated_at?: string | null
          user_id: string
          visceral_fat_level?: number | null
          weight?: number | null
        }
        Update: {
          bmi?: number | null
          bmr?: number | null
          body_fat_mass?: number | null
          body_fat_percentage?: number | null
          created_at?: string | null
          id?: string
          mineral?: number | null
          muscle_mass?: number | null
          protein?: number | null
          skeletal_muscle_mass?: number | null
          test_date?: string
          total_body_water?: number | null
          updated_at?: string | null
          user_id?: string
          visceral_fat_level?: number | null
          weight?: number | null
        }
        Relationships: []
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
      intake_logs: {
        Row: {
          created_at: string | null
          felt_effect: string | null
          id: string
          notes: string | null
          servings_taken: number | null
          stack_item_id: string | null
          taken_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          felt_effect?: string | null
          id?: string
          notes?: string | null
          servings_taken?: number | null
          stack_item_id?: string | null
          taken_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          felt_effect?: string | null
          id?: string
          notes?: string | null
          servings_taken?: number | null
          stack_item_id?: string | null
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_logs_stack_item_id_fkey"
            columns: ["stack_item_id"]
            isOneToOne: false
            referencedRelation: "user_stack"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_test_results: {
        Row: {
          biomarker_id: string | null
          created_at: string | null
          document_id: string
          equipment_type: string | null
          id: string
          is_outlier: boolean | null
          laboratory_method: string | null
          laboratory_name: string | null
          normalized_unit: string
          normalized_value: number | null
          outlier_reason: string | null
          quality_flag: string | null
          raw_test_name: string
          reagent_lot: string | null
          ref_range_max: number | null
          ref_range_min: number | null
          ref_range_source: string | null
          ref_range_unit: string | null
          sample_type: string | null
          test_date: string
          text_value: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          biomarker_id?: string | null
          created_at?: string | null
          document_id: string
          equipment_type?: string | null
          id?: string
          is_outlier?: boolean | null
          laboratory_method?: string | null
          laboratory_name?: string | null
          normalized_unit: string
          normalized_value?: number | null
          outlier_reason?: string | null
          quality_flag?: string | null
          raw_test_name: string
          reagent_lot?: string | null
          ref_range_max?: number | null
          ref_range_min?: number | null
          ref_range_source?: string | null
          ref_range_unit?: string | null
          sample_type?: string | null
          test_date: string
          text_value?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          biomarker_id?: string | null
          created_at?: string | null
          document_id?: string
          equipment_type?: string | null
          id?: string
          is_outlier?: boolean | null
          laboratory_method?: string | null
          laboratory_name?: string | null
          normalized_unit?: string
          normalized_value?: number | null
          outlier_reason?: string | null
          quality_flag?: string | null
          raw_test_name?: string
          reagent_lot?: string | null
          ref_range_max?: number | null
          ref_range_min?: number | null
          ref_range_source?: string | null
          ref_range_unit?: string | null
          sample_type?: string | null
          test_date?: string
          text_value?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "lab_test_results_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_test_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      laboratory_profiles: {
        Row: {
          accreditation: string | null
          created_at: string | null
          equipment_list: Json | null
          id: string
          lab_city: string | null
          lab_country: string | null
          lab_name: string
          reference_source: string | null
          standard_methods: Json | null
          uses_functional_ranges: boolean | null
          website: string | null
        }
        Insert: {
          accreditation?: string | null
          created_at?: string | null
          equipment_list?: Json | null
          id?: string
          lab_city?: string | null
          lab_country?: string | null
          lab_name: string
          reference_source?: string | null
          standard_methods?: Json | null
          uses_functional_ranges?: boolean | null
          website?: string | null
        }
        Update: {
          accreditation?: string | null
          created_at?: string | null
          equipment_list?: Json | null
          id?: string
          lab_city?: string | null
          lab_country?: string | null
          lab_name?: string
          reference_source?: string | null
          standard_methods?: Json | null
          uses_functional_ranges?: boolean | null
          website?: string | null
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
            referencedRelation: "challenge_progress"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "measurements_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_current_values"
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
          category: string | null
          compared_with: string[] | null
          comparison_results: Json | null
          created_at: string
          document_date: string | null
          document_type: string
          file_hash: string | null
          file_name: string
          file_size: number | null
          hidden_from_trainer: boolean
          id: string
          mime_type: string | null
          notes: string | null
          processing_completed_at: string | null
          processing_error: string | null
          processing_started_at: string | null
          processing_status: string | null
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
          category?: string | null
          compared_with?: string[] | null
          comparison_results?: Json | null
          created_at?: string
          document_date?: string | null
          document_type: string
          file_hash?: string | null
          file_name: string
          file_size?: number | null
          hidden_from_trainer?: boolean
          id?: string
          mime_type?: string | null
          notes?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
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
          category?: string | null
          compared_with?: string[] | null
          comparison_results?: Json | null
          created_at?: string
          document_date?: string | null
          document_type?: string
          file_hash?: string | null
          file_name?: string
          file_size?: number | null
          hidden_from_trainer?: boolean
          id?: string
          mime_type?: string | null
          notes?: string | null
          processing_completed_at?: string | null
          processing_error?: string | null
          processing_started_at?: string | null
          processing_status?: string | null
          storage_path?: string
          tags?: string[] | null
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_findings: {
        Row: {
          body_part: string
          created_at: string
          document_id: string
          finding_text: string
          id: string
          severity: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          body_part: string
          created_at?: string
          document_id: string
          finding_text: string
          id?: string
          severity?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          body_part?: string
          created_at?: string
          document_id?: string
          finding_text?: string
          id?: string
          severity?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_findings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "medical_documents"
            referencedColumns: ["id"]
          },
        ]
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
      metric_snapshots: {
        Row: {
          avg_quality_score: number | null
          created_at: string | null
          id: string
          metric_name: string
          snapshot_date: string
          trend_direction: string | null
          updated_at: string | null
          user_id: string
          value_avg: number | null
          value_count: number | null
          value_max: number | null
          value_min: number | null
        }
        Insert: {
          avg_quality_score?: number | null
          created_at?: string | null
          id?: string
          metric_name: string
          snapshot_date: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id: string
          value_avg?: number | null
          value_count?: number | null
          value_max?: number | null
          value_min?: number | null
        }
        Update: {
          avg_quality_score?: number | null
          created_at?: string | null
          id?: string
          metric_name?: string
          snapshot_date?: string
          trend_direction?: string | null
          updated_at?: string | null
          user_id?: string
          value_avg?: number | null
          value_count?: number | null
          value_max?: number | null
          value_min?: number | null
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
          current_level: number | null
          email_updates: boolean | null
          full_name: string | null
          id: string
          notification_preferences: Json | null
          notifications_enabled: boolean | null
          progress_sharing: boolean | null
          total_xp: number | null
          trainer_role: boolean | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number | null
          email_updates?: boolean | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          progress_sharing?: boolean | null
          total_xp?: number | null
          trainer_role?: boolean | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_level?: number | null
          email_updates?: boolean | null
          full_name?: string | null
          id?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean | null
          progress_sharing?: boolean | null
          total_xp?: number | null
          trainer_role?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      protocol_items: {
        Row: {
          created_at: string | null
          daily_dosage: number
          id: string
          intake_times: string[]
          notes: string | null
          position: number | null
          product_id: string
          protocol_id: string
          schedule_logic: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_dosage: number
          id?: string
          intake_times?: string[]
          notes?: string | null
          position?: number | null
          product_id: string
          protocol_id: string
          schedule_logic?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_dosage?: number
          id?: string
          intake_times?: string[]
          notes?: string | null
          position?: number | null
          product_id?: string
          protocol_id?: string
          schedule_logic?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "supplement_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_items_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_lifecycle_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          dismissed_at: string | null
          id: string
          is_read: boolean | null
          message: string
          protocol_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          protocol_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          dismissed_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          protocol_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_lifecycle_alerts_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "user_stack"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          adherence_rate: number | null
          ai_generated: boolean | null
          ai_rationale: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          last_taken_at: string | null
          name: string
          start_date: string | null
          total_scheduled: number | null
          total_taken: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adherence_rate?: number | null
          ai_generated?: boolean | null
          ai_rationale?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_taken_at?: string | null
          name: string
          start_date?: string | null
          total_scheduled?: number | null
          total_taken?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adherence_rate?: number | null
          ai_generated?: boolean | null
          ai_rationale?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          last_taken_at?: string | null
          name?: string
          start_date?: string | null
          total_scheduled?: number | null
          total_taken?: number | null
          updated_at?: string | null
          user_id?: string
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
      stack_effectiveness: {
        Row: {
          ai_explanation: string | null
          ai_verdict: string | null
          analysis_period_end: string
          analysis_period_start: string
          biomarker_id: string | null
          biomarker_value_after: number | null
          biomarker_value_before: number | null
          change_percent: number | null
          consistency_percent: number | null
          correlation_score: number | null
          created_at: string | null
          days_taken: number | null
          id: string
          stack_item_id: string | null
          total_days: number | null
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          ai_verdict?: string | null
          analysis_period_end: string
          analysis_period_start: string
          biomarker_id?: string | null
          biomarker_value_after?: number | null
          biomarker_value_before?: number | null
          change_percent?: number | null
          consistency_percent?: number | null
          correlation_score?: number | null
          created_at?: string | null
          days_taken?: number | null
          id?: string
          stack_item_id?: string | null
          total_days?: number | null
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          ai_verdict?: string | null
          analysis_period_end?: string
          analysis_period_start?: string
          biomarker_id?: string | null
          biomarker_value_after?: number | null
          biomarker_value_before?: number | null
          change_percent?: number | null
          consistency_percent?: number | null
          correlation_score?: number | null
          created_at?: string | null
          days_taken?: number | null
          id?: string
          stack_item_id?: string | null
          total_days?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stack_effectiveness_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stack_effectiveness_stack_item_id_fkey"
            columns: ["stack_item_id"]
            isOneToOne: false
            referencedRelation: "user_stack"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_logs: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          protocol_item_id: string | null
          scheduled_time: string
          servings_taken: number | null
          side_effects: string[] | null
          status: string
          taken_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          protocol_item_id?: string | null
          scheduled_time: string
          servings_taken?: number | null
          side_effects?: string[] | null
          status?: string
          taken_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          protocol_item_id?: string | null
          scheduled_time?: string
          servings_taken?: number | null
          side_effects?: string[] | null
          status?: string
          taken_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "user_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_logs_protocol_item_id_fkey"
            columns: ["protocol_item_id"]
            isOneToOne: false
            referencedRelation: "protocol_items"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_products: {
        Row: {
          ai_confidence_score: number | null
          barcode: string | null
          brand: string
          category: string | null
          created_at: string | null
          dosage_amount: number
          dosage_unit: string
          expiration_info: string | null
          form: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          manufacturer: string | null
          name: string
          recommended_daily_intake: string | null
          servings_per_container: number | null
          updated_at: string | null
          warnings: string | null
        }
        Insert: {
          ai_confidence_score?: number | null
          barcode?: string | null
          brand: string
          category?: string | null
          created_at?: string | null
          dosage_amount: number
          dosage_unit: string
          expiration_info?: string | null
          form?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          manufacturer?: string | null
          name: string
          recommended_daily_intake?: string | null
          servings_per_container?: number | null
          updated_at?: string | null
          warnings?: string | null
        }
        Update: {
          ai_confidence_score?: number | null
          barcode?: string | null
          brand?: string
          category?: string | null
          created_at?: string | null
          dosage_amount?: number
          dosage_unit?: string
          expiration_info?: string | null
          form?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          manufacturer?: string | null
          name?: string
          recommended_daily_intake?: string | null
          servings_per_container?: number | null
          updated_at?: string | null
          warnings?: string | null
        }
        Relationships: []
      }
      team_challenges: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          goal_target: number
          goal_type: string
          id: string
          name: string
          reward_description: string | null
          start_date: string
          status: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          goal_target: number
          goal_type: string
          id?: string
          name: string
          reward_description?: string | null
          start_date: string
          status?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          goal_target?: number
          goal_type?: string
          id?: string
          name?: string
          reward_description?: string | null
          start_date?: string
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_challenges_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "habit_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          contribution_xp: number | null
          id: string
          joined_at: string | null
          role: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          contribution_xp?: number | null
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          contribution_xp?: number | null
          id?: string
          joined_at?: string | null
          role?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "habit_teams"
            referencedColumns: ["id"]
          },
        ]
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
          job_id: string | null
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
          job_id?: string | null
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
          job_id?: string | null
          payload?: Json
          processed_at?: string | null
          processed_count?: number | null
          provider?: string | null
          status?: string
          type?: string
          user_id?: string | null
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terra_webhooks_raw_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "background_jobs"
            referencedColumns: ["id"]
          },
        ]
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
      trainer_notification_settings: {
        Row: {
          created_at: string
          digest_frequency: string | null
          digest_time: string | null
          email_client_alerts: boolean | null
          email_daily_digest: boolean | null
          email_enabled: boolean | null
          email_integration_issues: boolean | null
          id: string
          push_enabled: boolean | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          digest_frequency?: string | null
          digest_time?: string | null
          email_client_alerts?: boolean | null
          email_daily_digest?: boolean | null
          email_enabled?: boolean | null
          email_integration_issues?: boolean | null
          id?: string
          push_enabled?: boolean | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          digest_frequency?: string | null
          digest_time?: string | null
          email_client_alerts?: boolean | null
          email_daily_digest?: boolean | null
          email_enabled?: boolean | null
          email_integration_issues?: boolean | null
          id?: string
          push_enabled?: boolean | null
          trainer_id?: string
          updated_at?: string
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
      trainer_reports: {
        Row: {
          client_id: string
          client_name: string | null
          created_at: string | null
          file_name: string
          file_size_bytes: number | null
          goals_count: number | null
          id: string
          metrics_count: number | null
          period_end: string
          period_start: string
          report_config: Json | null
          report_type: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          client_name?: string | null
          created_at?: string | null
          file_name: string
          file_size_bytes?: number | null
          goals_count?: number | null
          id?: string
          metrics_count?: number | null
          period_end: string
          period_start: string
          report_config?: Json | null
          report_type: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          client_name?: string | null
          created_at?: string | null
          file_name?: string
          file_size_bytes?: number | null
          goals_count?: number | null
          id?: string
          metrics_count?: number | null
          period_end?: string
          period_start?: string
          report_config?: Json | null
          report_type?: string
          trainer_id?: string
        }
        Relationships: []
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
          ai_metadata: Json | null
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          generation_prompt: string | null
          id: string
          is_ai_generated: boolean | null
          is_template: boolean | null
          name: string
          trainer_id: string
          updated_at: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          generation_prompt?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_template?: boolean | null
          name: string
          trainer_id: string
          updated_at?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          generation_prompt?: string | null
          id?: string
          is_ai_generated?: boolean | null
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
          conflict_group: string | null
          created_at: string | null
          deleted_at: string | null
          external_id: string | null
          id: string
          is_outlier: boolean | null
          is_primary: boolean | null
          measurement_date: string
          metric_category: string
          metric_name: string
          notes: string | null
          photo_url: string | null
          priority: number
          provider: string | null
          quality_score: number | null
          source: string
          source_data: Json | null
          source_metadata: Json | null
          unit: string
          updated_at: string | null
          user_id: string
          value: number
        }
        Insert: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_group?: string | null
          created_at?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
          is_primary?: boolean | null
          measurement_date: string
          metric_category: string
          metric_name: string
          notes?: string | null
          photo_url?: string | null
          priority?: number
          provider?: string | null
          quality_score?: number | null
          source: string
          source_data?: Json | null
          source_metadata?: Json | null
          unit: string
          updated_at?: string | null
          user_id: string
          value: number
        }
        Update: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_group?: string | null
          created_at?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string
          is_outlier?: boolean | null
          is_primary?: boolean | null
          measurement_date?: string
          metric_category?: string
          metric_name?: string
          notes?: string | null
          photo_url?: string | null
          priority?: number
          provider?: string | null
          quality_score?: number | null
          source?: string
          source_data?: Json | null
          source_metadata?: Json | null
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
      user_biomarker_preferences: {
        Row: {
          biomarker_id: string
          created_at: string
          id: string
          notes: string | null
          optimal_max: number
          optimal_min: number
          updated_at: string
          user_id: string
        }
        Insert: {
          biomarker_id: string
          created_at?: string
          id?: string
          notes?: string | null
          optimal_max: number
          optimal_min: number
          updated_at?: string
          user_id: string
        }
        Update: {
          biomarker_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          optimal_max?: number
          optimal_min?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_biomarker_preferences_biomarker_id_fkey"
            columns: ["biomarker_id"]
            isOneToOne: false
            referencedRelation: "biomarker_master"
            referencedColumns: ["id"]
          },
        ]
      }
      user_habit_widgets: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          position: number
          updated_at: string | null
          user_id: string
          visible: boolean | null
          widget_type: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          position?: number
          updated_at?: string | null
          user_id: string
          visible?: boolean | null
          widget_type: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          position?: number
          updated_at?: string | null
          user_id?: string
          visible?: boolean | null
          widget_type?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          batch_number: string | null
          cost: number | null
          created_at: string | null
          current_servings: number
          daily_usage_rate: number | null
          estimated_depletion_date: string | null
          expiry_date: string | null
          id: string
          initial_servings: number | null
          is_low_alert: boolean | null
          low_stock_threshold: number | null
          product_id: string
          purchase_date: string | null
          storage_location: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          batch_number?: string | null
          cost?: number | null
          created_at?: string | null
          current_servings?: number
          daily_usage_rate?: number | null
          estimated_depletion_date?: string | null
          expiry_date?: string | null
          id?: string
          initial_servings?: number | null
          is_low_alert?: boolean | null
          low_stock_threshold?: number | null
          product_id: string
          purchase_date?: string | null
          storage_location?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          batch_number?: string | null
          cost?: number | null
          created_at?: string | null
          current_servings?: number
          daily_usage_rate?: number | null
          estimated_depletion_date?: string | null
          expiry_date?: string | null
          id?: string
          initial_servings?: number | null
          is_low_alert?: boolean | null
          low_stock_threshold?: number | null
          product_id?: string
          purchase_date?: string | null
          storage_location?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "supplement_products"
            referencedColumns: ["id"]
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
          metadata: Json | null
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
          metadata?: Json | null
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
          metadata?: Json | null
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
      user_stack: {
        Row: {
          ai_rationale: string | null
          ai_suggested: boolean | null
          approximate_servings: boolean | null
          created_at: string | null
          effectiveness_score: number | null
          end_action: string | null
          id: string
          intake_times: string[] | null
          is_active: boolean | null
          linked_biomarker_ids: string[] | null
          notes: string | null
          planned_end_date: string | null
          position: number | null
          product_id: string | null
          reorder_threshold: number | null
          schedule_cron: string | null
          schedule_type: string
          servings_remaining: number | null
          shared_with_others: boolean | null
          source: string | null
          stack_name: string
          start_date: string | null
          status: string | null
          target_outcome: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_rationale?: string | null
          ai_suggested?: boolean | null
          approximate_servings?: boolean | null
          created_at?: string | null
          effectiveness_score?: number | null
          end_action?: string | null
          id?: string
          intake_times?: string[] | null
          is_active?: boolean | null
          linked_biomarker_ids?: string[] | null
          notes?: string | null
          planned_end_date?: string | null
          position?: number | null
          product_id?: string | null
          reorder_threshold?: number | null
          schedule_cron?: string | null
          schedule_type?: string
          servings_remaining?: number | null
          shared_with_others?: boolean | null
          source?: string | null
          stack_name: string
          start_date?: string | null
          status?: string | null
          target_outcome?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_rationale?: string | null
          ai_suggested?: boolean | null
          approximate_servings?: boolean | null
          created_at?: string | null
          effectiveness_score?: number | null
          end_action?: string | null
          id?: string
          intake_times?: string[] | null
          is_active?: boolean | null
          linked_biomarker_ids?: string[] | null
          notes?: string | null
          planned_end_date?: string | null
          position?: number | null
          product_id?: string | null
          reorder_threshold?: number | null
          schedule_cron?: string | null
          schedule_type?: string
          servings_remaining?: number | null
          shared_with_others?: boolean | null
          source?: string | null
          stack_name?: string
          start_date?: string | null
          status?: string | null
          target_outcome?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stack_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "supplement_products"
            referencedColumns: ["id"]
          },
        ]
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
      workout_logs: {
        Row: {
          actual_reps: number
          actual_rir: number | null
          actual_rpe: number
          actual_weight: number
          assigned_plan_id: string | null
          created_at: string | null
          day_of_week: number | null
          exercise_category: string | null
          exercise_name: string
          id: string
          notes: string | null
          performed_at: string
          prescribed_reps: number | null
          prescribed_rest_seconds: number | null
          prescribed_rir: number | null
          prescribed_rpe: number | null
          prescribed_weight: number | null
          set_number: number
          superset_group: string | null
          user_id: string
          workout_name: string | null
        }
        Insert: {
          actual_reps: number
          actual_rir?: number | null
          actual_rpe: number
          actual_weight: number
          assigned_plan_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          exercise_category?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          performed_at?: string
          prescribed_reps?: number | null
          prescribed_rest_seconds?: number | null
          prescribed_rir?: number | null
          prescribed_rpe?: number | null
          prescribed_weight?: number | null
          set_number: number
          superset_group?: string | null
          user_id: string
          workout_name?: string | null
        }
        Update: {
          actual_reps?: number
          actual_rir?: number | null
          actual_rpe?: number
          actual_weight?: number
          assigned_plan_id?: string | null
          created_at?: string | null
          day_of_week?: number | null
          exercise_category?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          performed_at?: string
          prescribed_reps?: number | null
          prescribed_rest_seconds?: number | null
          prescribed_rir?: number | null
          prescribed_rpe?: number | null
          prescribed_weight?: number | null
          set_number?: number
          superset_group?: string | null
          user_id?: string
          workout_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_assigned_plan_id_fkey"
            columns: ["assigned_plan_id"]
            isOneToOne: false
            referencedRelation: "assigned_training_plans"
            referencedColumns: ["id"]
          },
        ]
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
      xp_history: {
        Row: {
          created_at: string | null
          earned_at: string | null
          habit_id: string | null
          id: string
          reason: string | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          created_at?: string | null
          earned_at?: string | null
          habit_id?: string | null
          id?: string
          reason?: string | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          created_at?: string | null
          earned_at?: string | null
          habit_id?: string | null
          id?: string
          reason?: string | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_history_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habit_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_history_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_summary_view: {
        Row: {
          active_calories: number | null
          avg_activity_quality: number | null
          day_strain: number | null
          distance_km: number | null
          measurement_date: string | null
          steps: number | null
          user_id: string | null
        }
        Relationships: []
      }
      body_composition_view: {
        Row: {
          bmi: number | null
          bmr: number | null
          body_fat_mass: number | null
          body_fat_percentage: number | null
          created_at: string | null
          impedance_data: Json | null
          measurement_date: string | null
          muscle_mass: number | null
          research_params: Json | null
          segmental_data: Json | null
          skeletal_muscle_mass: number | null
          updated_at: string | null
          user_id: string | null
          visceral_fat_level: number | null
          weight: number | null
        }
        Relationships: []
      }
      challenge_leaderboard_month: {
        Row: {
          active_days: number | null
          avatar_url: string | null
          avg_hrv: number | null
          avg_recovery_last_30d: number | null
          avg_resting_hr: number | null
          avg_sleep_efficiency: number | null
          avg_sleep_last_30d: number | null
          avg_strain_last_30d: number | null
          challenge_id: string | null
          days_with_data: number | null
          full_name: string | null
          last_activity_date: string | null
          latest_body_fat: number | null
          latest_weight: number | null
          monthly_consistency: number | null
          steps_last_30d: number | null
          streak_days: number | null
          total_points: number | null
          user_id: string | null
          username: string | null
          workouts_last_30d: number | null
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
      challenge_leaderboard_week: {
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
          days_with_data: number | null
          full_name: string | null
          last_activity_date: string | null
          latest_body_fat: number | null
          latest_weight: number | null
          steps_last_7d: number | null
          streak_days: number | null
          total_calories: number | null
          total_points: number | null
          total_steps: number | null
          total_workouts: number | null
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
      client_health_scores: {
        Row: {
          activity_score: number | null
          consistency_score: number | null
          last_measurement: string | null
          recovery_score: number | null
          sleep_score: number | null
          total_health_score: number | null
          trend_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
      client_unified_metrics: {
        Row: {
          confidence_factors: Json | null
          confidence_score: number | null
          conflict_group: string | null
          created_at: string | null
          deleted_at: string | null
          external_id: string | null
          id: string | null
          is_outlier: boolean | null
          is_primary: boolean | null
          measurement_date: string | null
          metric_category: string | null
          metric_name: string | null
          notes: string | null
          photo_url: string | null
          priority: number | null
          provider: string | null
          quality_score: number | null
          source: string | null
          source_data: Json | null
          source_metadata: Json | null
          unit: string | null
          updated_at: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_group?: string | null
          created_at?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string | null
          is_outlier?: boolean | null
          is_primary?: boolean | null
          measurement_date?: string | null
          metric_category?: string | null
          metric_name?: string | null
          notes?: string | null
          photo_url?: string | null
          priority?: number | null
          provider?: string | null
          quality_score?: number | null
          source?: string | null
          source_data?: Json | null
          source_metadata?: Json | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          confidence_factors?: Json | null
          confidence_score?: number | null
          conflict_group?: string | null
          created_at?: string | null
          deleted_at?: string | null
          external_id?: string | null
          id?: string | null
          is_outlier?: boolean | null
          is_primary?: boolean | null
          measurement_date?: string | null
          metric_category?: string | null
          metric_name?: string | null
          notes?: string | null
          photo_url?: string | null
          priority?: number | null
          provider?: string | null
          quality_score?: number | null
          source?: string | null
          source_data?: Json | null
          source_metadata?: Json | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      data_quality_trends: {
        Row: {
          avg_quality_score: number | null
          measurement_date: string | null
          metric_count: number | null
          source_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
      edge_function_performance: {
        Row: {
          avg_duration_seconds: number | null
          failed: number | null
          function_type: string | null
          last_execution: string | null
          successful: number | null
          total_executions: number | null
        }
        Relationships: []
      }
      goal_current_values: {
        Row: {
          current_value: number | null
          goal_id: string | null
          goal_name: string | null
          last_updated: string | null
          source: string | null
          target_unit: string | null
          target_value: number | null
          user_id: string | null
        }
        Insert: {
          current_value?: never
          goal_id?: string | null
          goal_name?: string | null
          last_updated?: never
          source?: never
          target_unit?: string | null
          target_value?: number | null
          user_id?: string | null
        }
        Update: {
          current_value?: never
          goal_id?: string | null
          goal_name?: string | null
          last_updated?: never
          source?: never
          target_unit?: string | null
          target_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      habit_analytics: {
        Row: {
          avg_completion_hour: number | null
          category: string | null
          color: string | null
          completion_rate: number | null
          completions_last_30_days: number | null
          completions_last_7_days: number | null
          current_streak: number | null
          days_completed: number | null
          icon: string | null
          id: string | null
          last_completed_at: string | null
          longest_streak: number | null
          name: string | null
          time_of_day: string | null
          total_completions: number | null
          user_id: string | null
        }
        Relationships: []
      }
      job_processing_stats: {
        Row: {
          avg_duration: number | null
          count: number | null
          last_created: string | null
          status: string | null
          type: string | null
        }
        Relationships: []
      }
      recovery_metrics_view: {
        Row: {
          avg_recovery_quality: number | null
          hrv: number | null
          measurement_date: string | null
          recovery_score: number | null
          resting_hr: number | null
          user_id: string | null
        }
        Relationships: []
      }
      sleep_analysis_view: {
        Row: {
          avg_sleep_quality: number | null
          deep_sleep: number | null
          light_sleep: number | null
          measurement_date: string | null
          rem_sleep: number | null
          sleep_efficiency: number | null
          sleep_hours: number | null
          user_id: string | null
        }
        Relationships: []
      }
      trainer_client_summary: {
        Row: {
          active_clients: number | null
          avg_recovery_score: number | null
          total_clients: number | null
          trainer_id: string | null
        }
        Relationships: []
      }
      webhook_processing_stats: {
        Row: {
          count: number | null
          last_received: string | null
          provider: string | null
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
      backfill_challenge_goals: { Args: never; Returns: Json }
      calculate_daily_snapshots: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      calculate_streak_days: {
        Args: { p_end_date?: string; p_user_id: string }
        Returns: number
      }
      can_view_profile: {
        Args: { _target: string; _viewer: string }
        Returns: boolean
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
      cleanup_old_pending_logs: { Args: never; Returns: number }
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
      get_aggregated_workouts: {
        Args: { p_user_id: string }
        Returns: {
          assigned_plan_id: string
          day_of_week: number
          duration_minutes: number
          estimated_calories: number
          id: string
          performed_at: string
          source: string
          total_exercises: number
          total_sets: number
          total_volume: number
          user_id: string
          workout_name: string
        }[]
      }
      get_challenge_participant_goals_with_progress: {
        Args: { p_challenge_id: string; p_user_id: string }
        Returns: {
          current_value: number
          goal_id: string
          goal_name: string
          goal_type: string
          last_measurement_date: string
          measurements_count: number
          progress_percentage: number
          target_unit: string
          target_value: number
        }[]
      }
      get_client_detailed_data: {
        Args: { p_client_id: string; p_days?: number }
        Returns: Json
      }
      get_client_goals_with_progress: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          current_value: number
          goal_name: string
          goal_type: string
          id: string
          last_measurement_date: string
          measurements_count: number
          progress_percentage: number
          target_unit: string
          target_value: number
          updated_at: string
          user_id: string
        }[]
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
      get_leaderboard_for_viewer: {
        Args: { limit_n?: number; time_period?: string; viewer: string }
        Returns: {
          active_days: number
          avatar_url: string
          avg_hrv: number
          avg_recovery: number
          avg_recovery_last_7d: number
          avg_resting_hr: number
          avg_sleep: number
          avg_sleep_efficiency: number
          avg_sleep_last_7d: number
          avg_strain: number
          avg_strain_last_7d: number
          challenge_id: string
          days_with_data: number
          full_name: string
          last_activity_date: string
          latest_body_fat: number
          latest_weight: number
          steps_last_7d: number
          streak_days: number
          total_calories: number
          total_points: number
          total_steps: number
          total_workouts: number
          user_id: string
          username: string
          weekly_consistency: number
          workouts_last_7d: number
        }[]
      }
      get_monitoring_dashboard_data: { Args: never; Returns: Json }
      get_overtrained_clients: {
        Args: never
        Returns: {
          avg_recovery: number
          avg_strain: number
          client_id: string
          full_name: string
          trainer_id: string
        }[]
      }
      get_stale_integrations: {
        Args: never
        Returns: {
          client_id: string
          days_stale: number
          full_name: string
          source: string
          trainer_id: string
        }[]
      }
      get_trainer_clients_enhanced: {
        Args: { p_trainer_id: string }
        Returns: {
          active_challenges_count: number
          active_goals_count: number
          avatar_url: string
          client_id: string
          connected_sources: string[]
          days_since_last_data: number
          full_name: string
          goals_at_risk: number
          goals_on_track: number
          has_overdue_tasks: boolean
          health_score: number
          last_activity_date: string
          low_recovery_alert: boolean
          measurements_trend: string
          poor_sleep_alert: boolean
          recent_measurements_count: number
          recovery_trend: string
          sleep_hours_avg: number
          sleep_trend: string
          top_3_goals: Json
          username: string
          vo2max_latest: number
          weight_latest: number
          whoop_recovery_avg: number
        }[]
      }
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
      get_trainer_schedule_events: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_trainer_id: string
        }
        Returns: {
          client_avatar_url: string
          client_full_name: string
          client_id: string
          client_user_id: string
          client_username: string
          created_at: string
          description: string
          end_time: string
          event_type: string
          id: string
          is_cancelled: boolean
          is_completed: boolean
          location: string
          metadata: Json
          recurrence_rule: string
          reminder_minutes: number
          start_time: string
          title: string
          trainer_id: string
          training_plan_id: string
          training_plan_name: string
          updated_at: string
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
      join_challenge:
        | { Args: { p_challenge_id: string }; Returns: Json }
        | {
            Args: { p_challenge_id: string; p_difficulty_level?: number }
            Returns: Json
          }
      normalize_biomarker_name: { Args: { name: string }; Returns: string }
      retry_failed_jobs: {
        Args: { p_job_type?: string }
        Returns: {
          retried_count: number
        }[]
      }
      retry_stuck_terra_webhooks: {
        Args: { stuck_threshold_minutes?: number }
        Returns: {
          failed_count: number
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
