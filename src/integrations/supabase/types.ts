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
          included_items: Json | null
          order_mode: string
          scope: string
          section_id: string | null
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
          included_items?: Json | null
          order_mode?: string
          scope?: string
          section_id?: string | null
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
          included_items?: Json | null
          order_mode?: string
          scope?: string
          section_id?: string | null
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
          {
            foreignKeyName: "binders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "binders_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "case_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      call_campaigns: {
        Row: {
          active_from: string | null
          active_to: string | null
          assigned_team: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          assigned_team?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          assigned_team?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      call_events: {
        Row: {
          call_id: string | null
          client_id: string | null
          direction: string | null
          duration_seconds: number | null
          event_type: string | null
          from_number: string | null
          id: string
          matched_at: string | null
          provider: string | null
          provider_event_id: string | null
          raw: Json
          received_at: string
          recording_url: string | null
          session_id: string | null
          status: string | null
          to_number: string | null
        }
        Insert: {
          call_id?: string | null
          client_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          event_type?: string | null
          from_number?: string | null
          id?: string
          matched_at?: string | null
          provider?: string | null
          provider_event_id?: string | null
          raw?: Json
          received_at?: string
          recording_url?: string | null
          session_id?: string | null
          status?: string | null
          to_number?: string | null
        }
        Update: {
          call_id?: string | null
          client_id?: string | null
          direction?: string | null
          duration_seconds?: number | null
          event_type?: string | null
          from_number?: string | null
          id?: string
          matched_at?: string | null
          provider?: string | null
          provider_event_id?: string | null
          raw?: Json
          received_at?: string
          recording_url?: string | null
          session_id?: string | null
          status?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_queue_items: {
        Row: {
          assigned_agent_id: string | null
          campaign_id: string | null
          client_id: string
          created_at: string
          id: string
          last_called_at: string | null
          next_call_at: string | null
          priority: number
          retry_count: number
          status: Database["public"]["Enums"]["call_queue_status"]
          updated_at: string
        }
        Insert: {
          assigned_agent_id?: string | null
          campaign_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          last_called_at?: string | null
          next_call_at?: string | null
          priority?: number
          retry_count?: number
          status?: Database["public"]["Enums"]["call_queue_status"]
          updated_at?: string
        }
        Update: {
          assigned_agent_id?: string | null
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          last_called_at?: string | null
          next_call_at?: string | null
          priority?: number
          retry_count?: number
          status?: Database["public"]["Enums"]["call_queue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_queue_items_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "telephony_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agent_id: string | null
          campaign_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["call_direction"]
          disposition: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          masked_number_used: string | null
          notes: string | null
          provider: string
          queue_item_id: string | null
          recording_url: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["call_session_status"]
          telecmi_call_id: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          masked_number_used?: string | null
          notes?: string | null
          provider?: string
          queue_item_id?: string | null
          recording_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["call_session_status"]
          telecmi_call_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["call_direction"]
          disposition?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          masked_number_used?: string | null
          notes?: string | null
          provider?: string
          queue_item_id?: string | null
          recording_url?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["call_session_status"]
          telecmi_call_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "telephony_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "call_queue_items"
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
          {
            foreignKeyName: "case_people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      case_sections: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_default: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_default?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      cf_countries: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string | null
          is_pr_friendly: boolean
          name: string
          visa_success_rate: number | null
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji?: string | null
          is_pr_friendly?: boolean
          name: string
          visa_success_rate?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string | null
          is_pr_friendly?: boolean
          name?: string
          visa_success_rate?: number | null
        }
        Relationships: []
      }
      cf_courses: {
        Row: {
          applications_open: boolean
          apply_url: string | null
          backlogs_allowed: number | null
          career_outcomes: string | null
          coop_available: boolean
          created_at: string
          currency: string | null
          description: string | null
          duolingo_accepted: boolean
          duration_months: number | null
          employability_score: number | null
          field_of_study: string
          gap_accepted_years: number | null
          gpa_min: number | null
          id: string
          ielts_no_band_less_than: number | null
          ielts_overall: number | null
          intake_months: string[]
          intake_year: number | null
          internship_included: boolean
          mode: string
          moi_accepted: boolean
          name: string
          pgwp_eligible: boolean
          pr_friendly: boolean
          pr_visa_notes: string | null
          pte_score: number | null
          scholarship_available: boolean
          scholarship_info: string | null
          specialization: string | null
          stem_eligible: boolean
          study_level: string
          toefl_score: number | null
          tuition_fee: number | null
          university_id: string
          updated_at: string
          visa_success_indicator: string | null
          work_experience_required: boolean
        }
        Insert: {
          applications_open?: boolean
          apply_url?: string | null
          backlogs_allowed?: number | null
          career_outcomes?: string | null
          coop_available?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          duolingo_accepted?: boolean
          duration_months?: number | null
          employability_score?: number | null
          field_of_study: string
          gap_accepted_years?: number | null
          gpa_min?: number | null
          id?: string
          ielts_no_band_less_than?: number | null
          ielts_overall?: number | null
          intake_months?: string[]
          intake_year?: number | null
          internship_included?: boolean
          mode?: string
          moi_accepted?: boolean
          name: string
          pgwp_eligible?: boolean
          pr_friendly?: boolean
          pr_visa_notes?: string | null
          pte_score?: number | null
          scholarship_available?: boolean
          scholarship_info?: string | null
          specialization?: string | null
          stem_eligible?: boolean
          study_level: string
          toefl_score?: number | null
          tuition_fee?: number | null
          university_id: string
          updated_at?: string
          visa_success_indicator?: string | null
          work_experience_required?: boolean
        }
        Update: {
          applications_open?: boolean
          apply_url?: string | null
          backlogs_allowed?: number | null
          career_outcomes?: string | null
          coop_available?: boolean
          created_at?: string
          currency?: string | null
          description?: string | null
          duolingo_accepted?: boolean
          duration_months?: number | null
          employability_score?: number | null
          field_of_study?: string
          gap_accepted_years?: number | null
          gpa_min?: number | null
          id?: string
          ielts_no_band_less_than?: number | null
          ielts_overall?: number | null
          intake_months?: string[]
          intake_year?: number | null
          internship_included?: boolean
          mode?: string
          moi_accepted?: boolean
          name?: string
          pgwp_eligible?: boolean
          pr_friendly?: boolean
          pr_visa_notes?: string | null
          pte_score?: number | null
          scholarship_available?: boolean
          scholarship_info?: string | null
          specialization?: string | null
          stem_eligible?: boolean
          study_level?: string
          toefl_score?: number | null
          tuition_fee?: number | null
          university_id?: string
          updated_at?: string
          visa_success_indicator?: string | null
          work_experience_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cf_courses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "cf_universities"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      cf_shortlists: {
        Row: {
          course_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cf_shortlists_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cf_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      cf_universities: {
        Row: {
          city: string | null
          country_code: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          institution_type: string
          is_partner: boolean
          logo_url: string | null
          name: string
          province: string | null
          ranking: number | null
          slug: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          country_code: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_type?: string
          is_partner?: boolean
          logo_url?: string | null
          name: string
          province?: string | null
          ranking?: number | null
          slug?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          institution_type?: string
          is_partner?: boolean
          logo_url?: string | null
          name?: string
          province?: string | null
          ranking?: number | null
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cf_universities_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "cf_countries"
            referencedColumns: ["code"]
          },
        ]
      }
      chat_channel_members: {
        Row: {
          added_at: string
          channel_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          channel_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          channel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel_id: string | null
          channel_type: string
          client_id: string | null
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          channel_id?: string | null
          channel_type: string
          client_id?: string | null
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type?: string
        }
        Update: {
          channel_id?: string | null
          channel_type?: string
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      client_access: {
        Row: {
          client_id: string
          granted_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["client_permission"]
          revoked_at: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          client_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["client_permission"]
          revoked_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          client_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["client_permission"]
          revoked_at?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          custom_type: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_type: string
          file_name: string
          id: string
          is_shared: boolean
          mime_type: string | null
          person_id: string | null
          section_id: string | null
          section_order: number
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
          deleted_at?: string | null
          deleted_by?: string | null
          document_type: string
          file_name: string
          id?: string
          is_shared?: boolean
          mime_type?: string | null
          person_id?: string | null
          section_id?: string | null
          section_order?: number
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
          deleted_at?: string | null
          deleted_by?: string | null
          document_type?: string
          file_name?: string
          id?: string
          is_shared?: boolean
          mime_type?: string | null
          person_id?: string | null
          section_id?: string | null
          section_order?: number
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
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "case_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "case_sections"
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
      client_section_settings: {
        Row: {
          client_id: string
          id: string
          order_mode: string
          section_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          id?: string
          order_mode?: string
          section_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          id?: string
          order_mode?: string
          section_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_section_settings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "case_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      client_timeline: {
        Row: {
          actor_id: string | null
          client_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          summary: string | null
        }
        Insert: {
          actor_id?: string | null
          client_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          summary?: string | null
        }
        Update: {
          actor_id?: string | null
          client_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          summary?: string | null
        }
        Relationships: []
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
          owner_id: string | null
          phone: string | null
          status: string
          suppressed_template_items: string[]
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
          owner_id?: string | null
          phone?: string | null
          status?: string
          suppressed_template_items?: string[]
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
          owner_id?: string | null
          phone?: string | null
          status?: string
          suppressed_template_items?: string[]
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
      default_team_members: {
        Row: {
          created_at: string
          id: string
          member_id: string
          owner_id: string
          permission: Database["public"]["Enums"]["client_permission"]
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          owner_id: string
          permission?: Database["public"]["Enums"]["client_permission"]
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          owner_id?: string
          permission?: Database["public"]["Enums"]["client_permission"]
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_fingerprints: {
        Row: {
          client_id: string | null
          created_at: string
          document_id: string
          id: string
          page_count: number | null
          phash: string | null
          sha256: string | null
          size_bytes: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          page_count?: number | null
          phash?: string | null
          sha256?: string | null
          size_bytes?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          page_count?: number | null
          phash?: string | null
          sha256?: string | null
          size_bytes?: number | null
        }
        Relationships: []
      }
      document_verifications: {
        Row: {
          ai_summary: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          doc_type: string | null
          document_id: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          reviewer_status: string | null
          risk_level: string
          risk_score: number
          signals: Json
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: string | null
          document_id: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          reviewer_status?: string | null
          risk_level?: string
          risk_score?: number
          signals?: Json
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          doc_type?: string | null
          document_id?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          reviewer_status?: string | null
          risk_level?: string
          risk_score?: number
          signals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      filled_forms: {
        Row: {
          client_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          file_name: string
          file_path: string
          form_id: string
          id: string
          instance_id: string | null
          size_bytes: number | null
          status: string
          updated_at: string
          validated_at: string | null
          validation_report: Json | null
        }
        Insert: {
          client_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name: string
          file_path: string
          form_id: string
          id?: string
          instance_id?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validation_report?: Json | null
        }
        Update: {
          client_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          file_name?: string
          file_path?: string
          form_id?: string
          id?: string
          instance_id?: string | null
          size_bytes?: number | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validation_report?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "filled_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "visa_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filled_forms_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_instances"
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
      lead_handoffs: {
        Row: {
          client_id: string
          created_at: string
          direction: string
          from_role: string | null
          from_user: string
          id: string
          note: string | null
          task_label: string | null
          to_role: string | null
          to_user: string
        }
        Insert: {
          client_id: string
          created_at?: string
          direction: string
          from_role?: string | null
          from_user: string
          id?: string
          note?: string | null
          task_label?: string | null
          to_role?: string | null
          to_user: string
        }
        Update: {
          client_id?: string
          created_at?: string
          direction?: string
          from_role?: string | null
          from_user?: string
          id?: string
          note?: string | null
          task_label?: string | null
          to_role?: string | null
          to_user?: string
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
          deleted_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          status: string
          suspended_at: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
        }
        Relationships: []
      }
      questionnaire_email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          is_default: boolean
          name: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      questionnaire_instances: {
        Row: {
          answers: Json
          client_id: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          form_id: string | null
          id: string
          last_saved_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          schema_id: string
          share_token: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          client_id: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          form_id?: string | null
          id?: string
          last_saved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_id: string
          share_token?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          client_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          form_id?: string | null
          id?: string
          last_saved_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_id?: string
          share_token?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_instances_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "visa_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_instances_schema_id_fkey"
            columns: ["schema_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_schemas"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_schemas: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          created_by: string | null
          form_id: string | null
          generated_by_ai: boolean
          id: string
          is_active: boolean
          is_draft: boolean
          mappings: Json
          name: string
          sections: Json
          service_type: string | null
          updated_at: string
          version: number
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          generated_by_ai?: boolean
          id?: string
          is_active?: boolean
          is_draft?: boolean
          mappings?: Json
          name: string
          sections?: Json
          service_type?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          form_id?: string | null
          generated_by_ai?: boolean
          id?: string
          is_active?: boolean
          is_draft?: boolean
          mappings?: Json
          name?: string
          sections?: Json
          service_type?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_schemas_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "visa_forms"
            referencedColumns: ["id"]
          },
        ]
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
      team_members: {
        Row: {
          added_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      telephony_agents: {
        Row: {
          created_at: string
          current_campaign_id: string | null
          id: string
          is_available: boolean
          is_on_break: boolean
          last_call_at: string | null
          role: Database["public"]["Enums"]["telephony_role"]
          sbc_password: string | null
          sbc_user_id: string | null
          telecmi_agent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_campaign_id?: string | null
          id?: string
          is_available?: boolean
          is_on_break?: boolean
          last_call_at?: string | null
          role?: Database["public"]["Enums"]["telephony_role"]
          sbc_password?: string | null
          sbc_user_id?: string | null
          telecmi_agent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_campaign_id?: string | null
          id?: string
          is_available?: boolean
          is_on_break?: boolean
          last_call_at?: string | null
          role?: Database["public"]["Enums"]["telephony_role"]
          sbc_password?: string | null
          sbc_user_id?: string | null
          telecmi_agent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telephony_audit_logs: {
        Row: {
          actor_id: string | null
          client_id: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          session_id: string | null
        }
        Insert: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          session_id?: string | null
        }
        Update: {
          actor_id?: string | null
          client_id?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telephony_audit_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      telephony_provider_settings: {
        Row: {
          app_id: string | null
          created_at: string
          from_number: string | null
          id: string
          provider: string
          sbc_uri: string | null
          secret: string | null
          test_extension: string | null
          updated_at: string
          updated_by: string | null
          webhook_secret: string | null
        }
        Insert: {
          app_id?: string | null
          created_at?: string
          from_number?: string | null
          id?: string
          provider?: string
          sbc_uri?: string | null
          secret?: string | null
          test_extension?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
        }
        Update: {
          app_id?: string | null
          created_at?: string
          from_number?: string | null
          id?: string
          provider?: string
          sbc_uri?: string | null
          secret?: string | null
          test_extension?: string | null
          updated_at?: string
          updated_by?: string | null
          webhook_secret?: string | null
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
      visa_forms: {
        Row: {
          auto_questionnaire: boolean
          builder_state: Json
          category: string
          code: string | null
          country: string
          created_at: string
          created_by: string | null
          email_template_id: string | null
          file_name: string
          file_path: string
          id: string
          is_active: boolean
          is_archived: boolean
          name: string
          notes: string | null
          parent_form_id: string | null
          published_pdf_path: string | null
          published_schema_id: string | null
          requires_validation: boolean
          send_mode: string
          size_bytes: number | null
          source_pdf_path: string | null
          updated_at: string
          version: number
        }
        Insert: {
          auto_questionnaire?: boolean
          builder_state?: Json
          category: string
          code?: string | null
          country: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          file_name: string
          file_path: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name: string
          notes?: string | null
          parent_form_id?: string | null
          published_pdf_path?: string | null
          published_schema_id?: string | null
          requires_validation?: boolean
          send_mode?: string
          size_bytes?: number | null
          source_pdf_path?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          auto_questionnaire?: boolean
          builder_state?: Json
          category?: string
          code?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email_template_id?: string | null
          file_name?: string
          file_path?: string
          id?: string
          is_active?: boolean
          is_archived?: boolean
          name?: string
          notes?: string | null
          parent_form_id?: string | null
          published_pdf_path?: string | null
          published_schema_id?: string | null
          requires_validation?: boolean
          send_mode?: string
          size_bytes?: number | null
          source_pdf_path?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_visa_forms_email_template"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_email_templates"
            referencedColumns: ["id"]
          },
        ]
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
      v_clients_masked: {
        Row: {
          application_id: string | null
          application_type: string | null
          country: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          has_phone: boolean | null
          id: string | null
          phone_display: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          application_type?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          has_phone?: never
          id?: string | null
          phone_display?: never
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          application_type?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          has_phone?: never
          id?: string | null
          phone_display?: never
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_edit_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_upload_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_view_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      claim_next_queue_item: {
        Args: { _agent_id: string; _campaign_id?: string }
        Returns: {
          assigned_agent_id: string | null
          campaign_id: string | null
          client_id: string
          created_at: string
          id: string
          last_called_at: string | null
          next_call_at: string | null
          priority: number
          retry_count: number
          status: Database["public"]["Enums"]["call_queue_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "call_queue_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_client: {
        Args: {
          _application_type: string
          _country: string
          _email?: string
          _full_name: string
          _phone?: string
          _template_id?: string
        }
        Returns: {
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
          owner_id: string | null
          phone: string | null
          status: string
          suppressed_template_items: string[]
          template_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_chat_channel_member: {
        Args: { _channel: string; _uid: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team: string; _uid: string }
        Returns: boolean
      }
      is_telephony_admin: { Args: { _uid: string }; Returns: boolean }
      recover_stale_calling_items: { Args: never; Returns: number }
      user_client_permission: {
        Args: { _cid: string; _uid: string }
        Returns: Database["public"]["Enums"]["client_permission"]
      }
      user_telephony_agent_id: { Args: { _uid: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "counselor"
        | "documentation"
        | "viewer"
        | "telecaller"
      call_direction: "outbound" | "inbound"
      call_queue_status:
        | "queued"
        | "calling"
        | "no_answer"
        | "busy"
        | "callback"
        | "connected"
        | "enrolled"
        | "failed"
        | "cancelled"
      call_session_status:
        | "initiated"
        | "ringing"
        | "answered"
        | "completed"
        | "failed"
        | "no_answer"
        | "busy"
        | "cancelled"
      client_permission: "view" | "edit" | "upload" | "full"
      person_role:
        | "applicant"
        | "co_applicant"
        | "dependant"
        | "sponsor"
        | "co_sponsor"
      telephony_role: "telecaller" | "counselor" | "admin"
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
      app_role: ["admin", "counselor", "documentation", "viewer", "telecaller"],
      call_direction: ["outbound", "inbound"],
      call_queue_status: [
        "queued",
        "calling",
        "no_answer",
        "busy",
        "callback",
        "connected",
        "enrolled",
        "failed",
        "cancelled",
      ],
      call_session_status: [
        "initiated",
        "ringing",
        "answered",
        "completed",
        "failed",
        "no_answer",
        "busy",
        "cancelled",
      ],
      client_permission: ["view", "edit", "upload", "full"],
      person_role: [
        "applicant",
        "co_applicant",
        "dependant",
        "sponsor",
        "co_sponsor",
      ],
      telephony_role: ["telecaller", "counselor", "admin"],
    },
  },
} as const
