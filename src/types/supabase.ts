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
      learning_objectives: {
        Row: {
          created_at: string | null
          description: string
          id: string
          image_description: string
          image_link: string | null
          lesson_id: string | null
          number: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          image_description?: string
          image_link?: string | null
          lesson_id?: string | null
          number?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_description?: string
          image_link?: string | null
          lesson_id?: string | null
          number?: number | null
        }
      }
      lesson_statuses: {
        Row: {
          status: string
        }
        Insert: {
          status: string
        }
        Update: {
          status?: string
        }
      }
      lessons: {
        Row: {
          author_id: string | null
          caption: string | null
          created_at: string | null
          education_level: string | null
          id: string
          rejection_reason: string | null
          status: string
          subject: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          subject?: string | null
          title?: string
        }
        Update: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          subject?: string | null
          title?: string
        }
      }
      lessons_on_exam_boards: {
        Row: {
          exam_board_name: string
          lesson_id: string
        }
        Insert: {
          exam_board_name: string
          lesson_id: string
        }
        Update: {
          exam_board_name?: string
          lesson_id?: string
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
          req_audio_data: boolean
          usage_plan: string
        }
        Insert: {
          access_level?: number
          daily_token_usage?: number
          education_level: string
          first_name: string
          id: string
          last_name: string
          req_audio_data?: boolean
          usage_plan?: string
        }
        Update: {
          access_level?: number
          daily_token_usage?: number
          education_level?: string
          first_name?: string
          id?: string
          last_name?: string
          req_audio_data?: boolean
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
          exam_boards: Json
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
          id: string
          rejection_reason: string | null
          status: string
          subject: string | null
          title: string
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
        Returns: undefined
      }
      update_lesson_by_id:
        | {
            Args: {
              lesson_id: string
              title: string
              subject: string
              education_level: string
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
              id: string
              rejection_reason: string | null
              status: string
              subject: string | null
              title: string
            }
          }
        | {
            Args: {
              lesson_id: string
              title: string
              subject: string
              education_level: string
              exam_boards: Json
              caption: string
              is_published: boolean
              learning_objectives: Json
            }
            Returns: {
              author_id: string | null
              caption: string | null
              created_at: string | null
              education_level: string | null
              id: string
              rejection_reason: string | null
              status: string
              subject: string | null
              title: string
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
