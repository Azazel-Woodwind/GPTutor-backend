export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
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
        Relationships: [
          {
            foreignKeyName: "access_levels_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role"]
          }
        ]
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
        Relationships: []
      }
      exam_boards: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      learning_objective_instructions: {
        Row: {
          created_at: string | null
          id: string
          instruction: string | null
          learning_objective_id: string | null
          media_link: string | null
          number: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instruction?: string | null
          learning_objective_id?: string | null
          media_link?: string | null
          number?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instruction?: string | null
          learning_objective_id?: string | null
          media_link?: string | null
          number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_objective_instructions_learning_objective_id_fkey"
            columns: ["learning_objective_id"]
            isOneToOne: false
            referencedRelation: "learning_objectives"
            referencedColumns: ["id"]
          }
        ]
      }
      learning_objectives: {
        Row: {
          created_at: string | null
          description: string
          id: string
          lesson_id: string | null
          number: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string
          id?: string
          lesson_id?: string | null
          number?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          lesson_id?: string | null
          number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_objectives_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }
      lessons: {
        Row: {
          author_id: string | null
          caption: string | null
          created_at: string | null
          education_level: string | null
          id: string
          is_published: boolean
          subject: string | null
          title: string
        }
        Insert: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          id?: string
          is_published: boolean
          subject?: string | null
          title?: string
        }
        Update: {
          author_id?: string | null
          caption?: string | null
          created_at?: string | null
          education_level?: string | null
          id?: string
          is_published?: boolean
          subject?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_education_level_fkey"
            columns: ["education_level"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["education_level"]
          },
          {
            foreignKeyName: "lessons_subject_fkey"
            columns: ["subject"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["subject"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "lessons_on_exam_boards_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          }
        ]
      }
      quiz_scores: {
        Row: {
          created_at: string | null
          lesson_id: string
          max_score: number
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          lesson_id: string
          max_score: number
          score: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          lesson_id?: string
          max_score?: number
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_scores_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      users: {
        Row: {
          access_level: number
          daily_token_usage: number
          education_level: string
          first_name: string
          id: string
          last_name: string
          new: boolean
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
          new?: boolean
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
          new?: boolean
          req_audio_data?: boolean
          usage_plan?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_access_level_fkey"
            columns: ["access_level"]
            isOneToOne: false
            referencedRelation: "access_levels"
            referencedColumns: ["access_level"]
          },
          {
            foreignKeyName: "users_education_level_fkey"
            columns: ["education_level"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["education_level"]
          },
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_usage_plan_fkey"
            columns: ["usage_plan"]
            isOneToOne: false
            referencedRelation: "usage_plans"
            referencedColumns: ["plan"]
          }
        ]
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
        Relationships: [
          {
            foreignKeyName: "users_on_subjects_subject_name_fkey"
            columns: ["subject_name"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["subject"]
          },
          {
            foreignKeyName: "users_on_subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      waiting_list_users: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_student: boolean
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          is_student: boolean
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_student?: boolean
        }
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: "users_education_level_fkey"
            columns: ["education_level"]
            isOneToOne: false
            referencedRelation: "education_levels"
            referencedColumns: ["education_level"]
          }
        ]
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
          is_published: boolean
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
      set_used_user: {
        Args: Record<PropertyKey, never>
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
              is_published: boolean
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
              is_published: boolean
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

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never
