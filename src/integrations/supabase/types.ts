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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key_hash: string
          label: string
          last_used_at: string | null
          prefix: string
          revoked: boolean
          scopes: string[]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash: string
          label: string
          last_used_at?: string | null
          prefix: string
          revoked?: boolean
          scopes?: string[]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key_hash?: string
          label?: string
          last_used_at?: string | null
          prefix?: string
          revoked?: boolean
          scopes?: string[]
        }
        Relationships: []
      }
      binders: {
        Row: {
          client_id: string
          file_name: string
          generated_at: string
          generated_by: string | null
          group_label: string | null
          id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          client_id: string
          file_name: string
          generated_at?: string
          generated_by?: string | null
          group_label?: string | null
          id?: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          client_id?: string
          file_name?: string
          generated_at?: string
          generated_by?: string | null
          group_label?: string | null
          id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "binders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_people: {
        Row: {
          client_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_archived: boolean
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          passport_number: string | null
          relationship: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          passport_number?: string | null
          relationship?: string | null
          role: Database["public"]["Enums"]["person_role"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_archived?: boolean
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          passport_number?: string | null
          relationship?: string | null
          role?: Database["public"]["Enums"]["person_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          custom_type: string | null
          document_type: string
          file_name: string
          id: string
          is_shared: boolean
          mime_type: string | null
          person_id: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          client_id: string
          custom_type?: string | null
          document_type: string
          file_name: string
          id?: string
          is_shared?: boolean
          mime_type?: string | null
          person_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          client_id?: string
          custom_type?: string | null
          document_type?: string
          file_name?: string
          id?: string
          is_shared?: boolean
          mime_type?: string | null
          person_id?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "case_people"
            referencedColumns: ["id"]
          },
        ]
      }
      client_education: {
        Row: {
          city: string | null
          client_id: string
          country: string | null
          created_at: string
          degree: string | null
          end_year: number | null
          field_of_study: string | null
          gpa_or_percentage: string | null
          id: string
          institution: string | null
          level: string | null
          source_document_id: string | null
          source_file_name: string | null
          start_year: number | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_id: string
          country?: string | null
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field_of_study?: string | null
          gpa_or_percentage?: string | null
          id?: string
          institution?: string | null
          level?: string | null
          source_document_id?: string | null
          source_file_name?: string | null
          start_year?: number | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_id?: string
          country?: string | null
          created_at?: string
          degree?: string | null
          end_year?: number | null
          field_of_study?: string | null
          gpa_or_percentage?: string | null
          id?: string
          institution?: string | null
          level?: string | null
          source_document_id?: string | null
          source_file_name?: string | null
          start_year?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      client_profile: {
        Row: {
          account_balance: number | null
          address_city: string | null
          address_country: string | null
          address_line1: string | null
          address_postal: string | null
          address_state: string | null
          annual_income: number | null
          bank_name: string | null
          client_id: string
          created_at: string
          currency: string | null
          date_of_birth: string | null
          email_alt: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_name: string | null
          gender: string | null
          gic_amount: number | null
          gpa_or_percentage: string | null
          graduation_year: number | null
          highest_qualification: string | null
          ielts_listening: number | null
          ielts_overall: number | null
          ielts_reading: number | null
          ielts_speaking: number | null
          ielts_test_date: string | null
          ielts_writing: number | null
          institution_name: string | null
          job_title: string | null
          last_extracted_at: string | null
          marital_status: string | null
          nationality: string | null
          notes_extracted: string | null
          passport_country: string | null
          passport_expiry: string | null
          passport_issue_date: string | null
          passport_number: string | null
          person_id: string | null
          phone_alt: string | null
          place_of_birth: string | null
          source_documents: Json
          spouse_name: string | null
          tuition_paid: number | null
          updated_at: string
        }
        Insert: {
          account_balance?: number | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_postal?: string | null
          address_state?: string | null
          annual_income?: number | null
          bank_name?: string | null
          client_id: string
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          email_alt?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          gender?: string | null
          gic_amount?: number | null
          gpa_or_percentage?: string | null
          graduation_year?: number | null
          highest_qualification?: string | null
          ielts_listening?: number | null
          ielts_overall?: number | null
          ielts_reading?: number | null
          ielts_speaking?: number | null
          ielts_test_date?: string | null
          ielts_writing?: number | null
          institution_name?: string | null
          job_title?: string | null
          last_extracted_at?: string | null
          marital_status?: string | null
          nationality?: string | null
          notes_extracted?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          person_id?: string | null
          phone_alt?: string | null
          place_of_birth?: string | null
          source_documents?: Json
          spouse_name?: string | null
          tuition_paid?: number | null
          updated_at?: string
        }
        Update: {
          account_balance?: number | null
          address_city?: string | null
          address_country?: string | null
          address_line1?: string | null
          address_postal?: string | null
          address_state?: string | null
          annual_income?: number | null
          bank_name?: string | null
          client_id?: string
          created_at?: string
          currency?: string | null
          date_of_birth?: string | null
          email_alt?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          gender?: string | null
          gic_amount?: number | null
          gpa_or_percentage?: string | null
          graduation_year?: number | null
          highest_qualification?: string | null
          ielts_listening?: number | null
          ielts_overall?: number | null
          ielts_reading?: number | null
          ielts_speaking?: number | null
          ielts_test_date?: string | null
          ielts_writing?: number | null
          institution_name?: string | null
          job_title?: string | null
          last_extracted_at?: string | null
          marital_status?: string | null
          nationality?: string | null
          notes_extracted?: string | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          person_id?: string | null
          phone_alt?: string | null
          place_of_birth?: string | null
          source_documents?: Json
          spouse_name?: string | null
          tuition_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_profile_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "case_people"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          application_id: string
          application_type: string
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          extra_items: Json
          full_name: string
          id: string
          notes: string | null
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          phone: string | null
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          application_id?: string
          application_type: string
          country: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          extra_items?: Json
          full_name: string
          id?: string
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          phone?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          application_type?: string
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          extra_items?: Json
          full_name?: string
          id?: string
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          phone?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_profile: {
        Row: {
          created_at: string
          firm_address: string | null
          firm_email: string | null
          firm_name: string | null
          firm_phone: string | null
          firm_website: string | null
          id: string
          logo_path: string | null
          rcic_jurisdiction: string | null
          rcic_name: string | null
          rcic_number: string | null
          signature_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_address?: string | null
          firm_email?: string | null
          firm_name?: string | null
          firm_phone?: string | null
          firm_website?: string | null
          id?: string
          logo_path?: string | null
          rcic_jurisdiction?: string | null
          rcic_name?: string | null
          rcic_number?: string | null
          signature_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_address?: string | null
          firm_email?: string | null
          firm_name?: string | null
          firm_phone?: string | null
          firm_website?: string | null
          id?: string
          logo_path?: string | null
          rcic_jurisdiction?: string | null
          rcic_name?: string | null
          rcic_number?: string | null
          signature_path?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          auto_on_open: boolean
          config: Json
          created_at: string
          enabled: boolean
          id: string
          interval_minutes: number
          key: string
          last_sync_at: string | null
          last_sync_message: string | null
          last_sync_status: string | null
          mode: string
          updated_at: string
        }
        Insert: {
          auto_on_open?: boolean
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          key: string
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          mode?: string
          updated_at?: string
        }
        Update: {
          auto_on_open?: boolean
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          interval_minutes?: number
          key?: string
          last_sync_at?: string | null
          last_sync_message?: string | null
          last_sync_status?: string | null
          mode?: string
          updated_at?: string
        }
        Relationships: []
      }
      letter_templates: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          created_by: string | null
          file_path: string | null
          id: string
          is_active: boolean
          kind: string
          style_text: string
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          kind: string
          style_text?: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          style_text?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      master_items: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          label: string
          list_key: string
          metadata: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label: string
          list_key: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          label?: string
          list_key?: string
          metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "master_items_list_key_fkey"
            columns: ["list_key"]
            isOneToOne: false
            referencedRelation: "master_lists"
            referencedColumns: ["key"]
          },
        ]
      }
      master_lists: {
        Row: {
          created_at: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          max_views: number | null
          revoked: boolean
          target_id: string
          target_type: string
          token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          max_views?: number | null
          revoked?: boolean
          target_id: string
          target_type: string
          token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          max_views?: number | null
          revoked?: boolean
          target_id?: string
          target_type?: string
          token?: string
          view_count?: number
        }
        Relationships: []
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
      workflow_templates: {
        Row: {
          category: string
          country: string
          created_at: string
          created_by: string | null
          groups: Json | null
          id: string
          items: Json
          name: string
          updated_at: string
          version: number
        }
        Insert: {
          category: string
          country: string
          created_at?: string
          created_by?: string | null
          groups?: Json | null
          id?: string
          items?: Json
          name: string
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          country?: string
          created_at?: string
          created_by?: string | null
          groups?: Json | null
          id?: string
          items?: Json
          name?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "counselor" | "documentation" | "viewer"
      person_role: "applicant" | "co_applicant" | "dependant"
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
      app_role: ["admin", "counselor", "documentation", "viewer"],
      person_role: ["applicant", "co_applicant", "dependant"],
    },
  },
} as const
