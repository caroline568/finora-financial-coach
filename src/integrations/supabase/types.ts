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
      bills: {
        Row: {
          amount_kes: number
          created_at: string
          due_date: string
          frequency: string
          id: string
          is_paid: boolean
          name: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          created_at?: string
          due_date: string
          frequency?: string
          id?: string
          is_paid?: boolean
          name: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          created_at?: string
          due_date?: string
          frequency?: string
          id?: string
          is_paid?: boolean
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_priorities: {
        Row: {
          completed_at: string | null
          encouragement: string | null
          generated_at: string
          goal_connection: string | null
          id: string
          is_done: boolean
          priority_date: string
          reasoning: string | null
          recommendation: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          encouragement?: string | null
          generated_at?: string
          goal_connection?: string | null
          id?: string
          is_done?: boolean
          priority_date?: string
          reasoning?: string | null
          recommendation: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          encouragement?: string | null
          generated_at?: string
          goal_connection?: string | null
          id?: string
          is_done?: boolean
          priority_date?: string
          reasoning?: string | null
          recommendation?: string
          user_id?: string
        }
        Relationships: []
      }
      debts: {
        Row: {
          created_at: string
          id: string
          interest_rate: number | null
          monthly_payment_kes: number | null
          name: string
          remaining_kes: number
          total_amount_kes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_payment_kes?: number | null
          name: string
          remaining_kes: number
          total_amount_kes: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interest_rate?: number | null
          monthly_payment_kes?: number | null
          name?: string
          remaining_kes?: number
          total_amount_kes?: number
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          page: string | null
          rating: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          message: string
          page?: string | null
          rating: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          page?: string | null
          rating?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          name: string
          saved_so_far_kes: number
          target_amount_kes: number
          target_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          saved_so_far_kes?: number
          target_amount_kes: number
          target_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          saved_so_far_kes?: number
          target_amount_kes?: number
          target_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_debts_kes: number
          created_at: string
          current_savings_kes: number
          full_name: string | null
          id: string
          ingest_token: string | null
          monthly_income_kes: number | null
          mpesa_phone: string | null
          onboarded: boolean
          plan: string
          primary_goal: string | null
          spending_categories: string[] | null
          updated_at: string
        }
        Insert: {
          active_debts_kes?: number
          created_at?: string
          current_savings_kes?: number
          full_name?: string | null
          id: string
          ingest_token?: string | null
          monthly_income_kes?: number | null
          mpesa_phone?: string | null
          onboarded?: boolean
          plan?: string
          primary_goal?: string | null
          spending_categories?: string[] | null
          updated_at?: string
        }
        Update: {
          active_debts_kes?: number
          created_at?: string
          current_savings_kes?: number
          full_name?: string | null
          id?: string
          ingest_token?: string | null
          monthly_income_kes?: number | null
          mpesa_phone?: string | null
          onboarded?: boolean
          plan?: string
          primary_goal?: string | null
          spending_categories?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_streak: number
          last_action_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_action_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_action_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_kes: number
          balance_kes: number | null
          category: string | null
          counterparty: string | null
          counterparty_phone: string | null
          created_at: string
          id: string
          last_prompted_at: string | null
          mpesa_code: string | null
          note: string | null
          prompt_dismissed: boolean
          prompt_snooze_count: number
          raw_sms: string | null
          source: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount_kes: number
          balance_kes?: number | null
          category?: string | null
          counterparty?: string | null
          counterparty_phone?: string | null
          created_at?: string
          id?: string
          last_prompted_at?: string | null
          mpesa_code?: string | null
          note?: string | null
          prompt_dismissed?: boolean
          prompt_snooze_count?: number
          raw_sms?: string | null
          source?: string
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount_kes?: number
          balance_kes?: number | null
          category?: string | null
          counterparty?: string | null
          counterparty_phone?: string | null
          created_at?: string
          id?: string
          last_prompted_at?: string | null
          mpesa_code?: string | null
          note?: string | null
          prompt_dismissed?: boolean
          prompt_snooze_count?: number
          raw_sms?: string | null
          source?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ingest_mpesa_transaction: {
        Args: {
          _amount_kes: number
          _balance_kes: number
          _category: string
          _counterparty: string
          _counterparty_phone: string
          _mpesa_code: string
          _note: string
          _raw_sms: string
          _token: string
          _transaction_date: string
          _type: string
        }
        Returns: string
      }
      rotate_ingest_token: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
