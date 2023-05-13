export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      access_levels: {
        Row: {
          access_level: number
          role: string | null
        }
        Insert: {
          access_level: number
          role?: string | null
        }
        Update: {
          access_level?: number
          role?: string | null
        }
      }
      education_levels: {
        Row: {
          education_level: string
        }
        Insert: {
          education_level: string
        }
        Update: {
          education_level?: string
        }
      }
      exam_boards: {
        Row: {
          exam_board_name: string
        }
        Insert: {
          exam_board_name: string
        }
        Update: {
          exam_board_name?: string
        }
      }
      images: {
        Row: {
          description: string | null
          id: string
          learning_objective_id: string
          link: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          learning_objective_id: string
          link?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          learning_objective_id?: string
          link?: string | null
        }
      }
      learning_objectives: {
        Row: {
          description: string | null
          id: string
          lesson_id: string | null
          title: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          lesson_id?: string | null
          title?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          lesson_id?: string | null
          title?: string | null
        }
      }
      lessons: {
        Row: {
          author_id: string | null
          caption: string | null
          created_at: string | null
          education_level: string | null
          exam_board: string | null
          id: string
          is_published: boolean | null
          is_verified: boolean | null
          subject: string | null
          title: string | null
        }
        Insert: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          exam_board?: string | null
          id?: string
          is_published?: boolean | null
          is_verified?: boolean | null
          subject?: string | null
          title?: string | null
        }
        Update: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          exam_board?: string | null
          id?: string
          is_published?: boolean | null
          is_verified?: boolean | null
          subject?: string | null
          title?: string | null
        }
      }
      roles: {
        Row: {
          role: string
        }
        Insert: {
          role: string
        }
        Update: {
          role?: string
        }
      }
      subjects: {
        Row: {
          subject: string
        }
        Insert: {
          subject: string
        }
        Update: {
          subject?: string
        }
      }
      usage_plans: {
        Row: {
          max_daily_tokens: number
          plan: string
        }
        Insert: {
          max_daily_tokens: number
          plan: string
        }
        Update: {
          max_daily_tokens?: number
          plan?: string
        }
      }
      users: {
        Row: {
          access_level: number
          daily_token_usage: number
          education_level: string
          first_name: string
          id: string
          last_name: string
          usage_plan: string
        }
        Insert: {
          access_level?: number
          daily_token_usage?: number
          education_level: string
          first_name: string
          id: string
          last_name: string
          usage_plan?: string
        }
        Update: {
          access_level?: number
          daily_token_usage?: number
          education_level?: string
          first_name?: string
          id?: string
          last_name?: string
          usage_plan?: string
        }
      }
      users_on_subjects: {
        Row: {
          subject_name: string
          user_id: string
        }
        Insert: {
          subject_name: string
          user_id: string
        }
        Update: {
          subject_name?: string
          user_id?: string
        }
      }
    }
    Views: {
      editable_lesson: {
        Row: {
          id: string | null
          is_published: boolean | null
        }
        Insert: {
          id?: string | null
          is_published?: boolean | null
        }
        Update: {
          id?: string | null
          is_published?: boolean | null
        }
      }
      editable_user: {
        Row: {
          education_level: string | null
          first_name: string | null
          last_name: string | null
        }
        Insert: {
          education_level?: string | null
          first_name?: string | null
          last_name?: string | null
        }
        Update: {
          education_level?: string | null
          first_name?: string | null
          last_name?: string | null
        }
      }
    }
    Functions: {
      activate_user: {
        Args: {
          is_student: boolean
        }
        Returns: undefined
      }
      create_lesson: {
        Args: {
          title: string
          subject: string
          education_level: string
          exam_board: string
          caption: string
          is_published: boolean
          learning_objectives: Json
          lesson_id?: string
        }
        Returns: {
          author_id: string | null
          caption: string | null
          created_at: string | null
          education_level: string | null
          exam_board: string | null
          id: string
          is_published: boolean | null
          is_verified: boolean | null
          subject: string | null
          title: string | null
        }
      }
      delete_lesson_by_id: {
        Args: {
          lesson_id: string
        }
        Returns: undefined
      }
      increment_usage: {
        Args: {
          user_id: string
          delta: number
        }
        Returns: undefined
      }
      toggle_is_published: {
        Args: {
          lesson_id: string
        }
        Returns: boolean
      }
      update_lesson_by_id: {
        Args: {
          lesson_id: string
          title: string
          subject: string
          education_level: string
          description: string
          exam_board: string
          caption: string
          is_published: boolean
          learning_objectives: Json
        }
        Returns: {
          author_id: string | null
          caption: string | null
          created_at: string | null
          education_level: string | null
          exam_board: string | null
          id: string
          is_published: boolean | null
          is_verified: boolean | null
          subject: string | null
          title: string | null
        }
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
