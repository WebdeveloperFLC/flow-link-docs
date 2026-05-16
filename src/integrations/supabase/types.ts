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
      accounting_users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          entity_scope: string[]
          id: string
          last_login: string | null
          mfa_enabled: boolean
          name: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          entity_scope?: string[]
          id?: string
          last_login?: string | null
          mfa_enabled?: boolean
          name: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          entity_scope?: string[]
          id?: string
          last_login?: string | null
          mfa_enabled?: boolean
          name?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      ai_summaries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          client_intent: string | null
          created_at: string
          created_by: string | null
          follow_up_role: string | null
          generated_by_model: string | null
          id: string
          key_points: Json
          next_action: string | null
          scope: string
          source_id: string | null
          status: string
          summary_md: string
          title: string
          updated_at: string
          urgency: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          client_intent?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_role?: string | null
          generated_by_model?: string | null
          id?: string
          key_points?: Json
          next_action?: string | null
          scope?: string
          source_id?: string | null
          status?: string
          summary_md?: string
          title?: string
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          client_intent?: string | null
          created_at?: string
          created_by?: string | null
          follow_up_role?: string | null
          generated_by_model?: string | null
          id?: string
          key_points?: Json
          next_action?: string | null
          scope?: string
          source_id?: string | null
          status?: string
          summary_md?: string
          title?: string
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summary_feedback: {
        Row: {
          action: string
          created_at: string
          id: string
          note: string | null
          summary_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          note?: string | null
          summary_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          note?: string | null
          summary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summary_feedback_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "ai_summaries"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summary_sources: {
        Row: {
          created_at: string
          id: string
          source_id: string
          source_type: string
          summary_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          source_type: string
          summary_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          source_type?: string
          summary_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summary_sources_summary_id_fkey"
            columns: ["summary_id"]
            isOneToOne: false
            referencedRelation: "ai_summaries"
            referencedColumns: ["id"]
          },
        ]
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
      app_email_logs: {
        Row: {
          attempts: number
          body_html: string | null
          body_text: string | null
          category: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          next_retry_at: string | null
          provider: string | null
          recipient: string
          sent_at: string | null
          status: string
          subject: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          next_retry_at?: string | null
          provider?: string | null
          recipient: string
          sent_at?: string | null
          status?: string
          subject: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body_html?: string | null
          body_text?: string | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          next_retry_at?: string | null
          provider?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string
          subject?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessment_email_verifications: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          lead_id: string
          token: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          lead_id: string
          token: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          lead_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_email_verifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "assessment_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_invitations: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          expires_at: string
          first_name: string | null
          id: string
          invited_by: string | null
          last_name: string | null
          middle_name: string | null
          phone: string | null
          redeemed_at: string | null
          redeemed_lead_id: string | null
          status: Database["public"]["Enums"]["assessment_invite_status"]
          token: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          redeemed_at?: string | null
          redeemed_lead_id?: string | null
          status?: Database["public"]["Enums"]["assessment_invite_status"]
          token: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          invited_by?: string | null
          last_name?: string | null
          middle_name?: string | null
          phone?: string | null
          redeemed_at?: string | null
          redeemed_lead_id?: string | null
          status?: Database["public"]["Enums"]["assessment_invite_status"]
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_leads: {
        Row: {
          auth_user_id: string | null
          client_id: string | null
          created_at: string
          email: string
          email_verified_at: string | null
          first_name: string
          id: string
          invitation_id: string | null
          last_name: string
          middle_name: string | null
          phone: string
          referral_code_used: string | null
          source: Database["public"]["Enums"]["assessment_lead_source"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          email_verified_at?: string | null
          first_name: string
          id?: string
          invitation_id?: string | null
          last_name: string
          middle_name?: string | null
          phone: string
          referral_code_used?: string | null
          source: Database["public"]["Enums"]["assessment_lead_source"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          email_verified_at?: string | null
          first_name?: string
          id?: string
          invitation_id?: string | null
          last_name?: string
          middle_name?: string | null
          phone?: string
          referral_code_used?: string | null
          source?: Database["public"]["Enums"]["assessment_lead_source"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_leads_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "assessment_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_pdf_wrapper: {
        Row: {
          company_name: string | null
          cover_pdf_path: string | null
          extra_pdfs: Json
          footer_text: string | null
          header_text: string | null
          id: number
          primary_color: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          company_name?: string | null
          cover_pdf_path?: string | null
          extra_pdfs?: Json
          footer_text?: string | null
          header_text?: string | null
          id?: number
          primary_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          company_name?: string | null
          cover_pdf_path?: string | null
          extra_pdfs?: Json
          footer_text?: string | null
          header_text?: string | null
          id?: number
          primary_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      assessment_programs: {
        Row: {
          code: string
          country: string
          created_at: string
          description: string | null
          goal: string
          id: string
          is_active: boolean
          label: string
          match_rules: Json
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          country?: string
          created_at?: string
          description?: string | null
          goal?: string
          id?: string
          is_active?: boolean
          label: string
          match_rules?: Json
          order_index?: number
          updated_at?: string
        }
        Update: {
          code?: string
          country?: string
          created_at?: string
          description?: string | null
          goal?: string
          id?: string
          is_active?: boolean
          label?: string
          match_rules?: Json
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          code: string
          conditional_on: Json | null
          country: string
          created_at: string
          goal: string
          help_text: string | null
          id: string
          is_active: boolean
          label: string
          options: Json | null
          order_index: number
          q_type: string
          required: boolean
          section: string
          updated_at: string
        }
        Insert: {
          code: string
          conditional_on?: Json | null
          country?: string
          created_at?: string
          goal?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          label: string
          options?: Json | null
          order_index?: number
          q_type: string
          required?: boolean
          section: string
          updated_at?: string
        }
        Update: {
          code?: string
          conditional_on?: Json | null
          country?: string
          created_at?: string
          goal?: string
          help_text?: string | null
          id?: string
          is_active?: boolean
          label?: string
          options?: Json | null
          order_index?: number
          q_type?: string
          required?: boolean
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_sessions: {
        Row: {
          answers: Json
          assigned_counselor_id: string | null
          client_id: string | null
          country: string
          created_at: string
          created_by: string | null
          goal: string
          id: string
          last_emailed_at: string | null
          lead_id: string | null
          output: Json
          pdf_path: string | null
          status: Database["public"]["Enums"]["assessment_session_status"]
          submitted_at: string | null
          temperature: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          assigned_counselor_id?: string | null
          client_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          goal?: string
          id?: string
          last_emailed_at?: string | null
          lead_id?: string | null
          output?: Json
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["assessment_session_status"]
          submitted_at?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          assigned_counselor_id?: string | null
          client_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          goal?: string
          id?: string
          last_emailed_at?: string | null
          lead_id?: string | null
          output?: Json
          pdf_path?: string | null
          status?: Database["public"]["Enums"]["assessment_session_status"]
          submitted_at?: string | null
          temperature?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_sessions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "assessment_leads"
            referencedColumns: ["id"]
          },
        ]
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
          lead_status: string | null
          next_call_at: string | null
          notes: string | null
          priority: number
          retry_count: number
          source: string | null
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
          lead_status?: string | null
          next_call_at?: string | null
          notes?: string | null
          priority?: number
          retry_count?: number
          source?: string | null
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
          lead_status?: string | null
          next_call_at?: string | null
          notes?: string | null
          priority?: number
          retry_count?: number
          source?: string | null
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
          {
            foreignKeyName: "call_queue_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "call_queue_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_queue_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
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
            foreignKeyName: "call_sessions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaign_performance"
            referencedColumns: ["campaign_id"]
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
      chat_message_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          message_id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          message_id: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          message_id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: []
      }
      chat_message_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
          read_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
          read_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
          read_at?: string | null
        }
        Relationships: []
      }
      chat_message_meta: {
        Row: {
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          message_id: string
          parent_id: string | null
          pinned: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          message_id: string
          parent_id?: string | null
          pinned?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          message_id?: string
          parent_id?: string | null
          pinned?: boolean
        }
        Relationships: []
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
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
      chat_read_receipts: {
        Row: {
          channel_key: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_key: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_key?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
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
      client_appointments: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          duration_min: number
          id: string
          mode: string
          notes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
          with_user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          mode?: string
          notes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
          with_user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          duration_min?: number
          id?: string
          mode?: string
          notes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
          with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
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
      client_emails: {
        Row: {
          bcc_addresses: string[]
          body_html: string | null
          body_text: string | null
          cc_addresses: string[]
          client_id: string
          created_at: string
          direction: string
          error_message: string | null
          from_address: string
          id: string
          in_reply_to: string | null
          internal_only: boolean
          metadata: Json
          provider_message_id: string | null
          received_at: string | null
          sender_user_id: string | null
          sent_at: string | null
          status: string
          subject: string
          thread_id: string
          to_addresses: string[]
        }
        Insert: {
          bcc_addresses?: string[]
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[]
          client_id: string
          created_at?: string
          direction: string
          error_message?: string | null
          from_address: string
          id?: string
          in_reply_to?: string | null
          internal_only?: boolean
          metadata?: Json
          provider_message_id?: string | null
          received_at?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          thread_id: string
          to_addresses?: string[]
        }
        Update: {
          bcc_addresses?: string[]
          body_html?: string | null
          body_text?: string | null
          cc_addresses?: string[]
          client_id?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          from_address?: string
          id?: string
          in_reply_to?: string | null
          internal_only?: boolean
          metadata?: Json
          provider_message_id?: string | null
          received_at?: string | null
          sender_user_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          thread_id?: string
          to_addresses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "client_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_emails_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          document_type: string
          file_name: string | null
          file_path: string | null
          id: string
          remarks: string | null
          status: string
          updated_at: string
          uploaded_at: string | null
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          remarks?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          remarks?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json
          paid_at: string | null
          points_redeemed: number
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json
          paid_at?: string | null
          points_redeemed?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json
          paid_at?: string | null
          points_redeemed?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notification_prefs: {
        Row: {
          client_id: string
          email_documents: boolean
          email_messages: boolean
          email_payments: boolean
          email_status_updates: boolean
          updated_at: string
        }
        Insert: {
          client_id: string
          email_documents?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_status_updates?: boolean
          updated_at?: string
        }
        Update: {
          client_id?: string
          email_documents?: boolean
          email_messages?: boolean
          email_payments?: boolean
          email_status_updates?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notification_prefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notification_prefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notifications: {
        Row: {
          body: string | null
          client_id: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          client_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          client_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      client_offers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          offer_id: string
          status: string
          used_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          offer_id: string
          status?: string
          used_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_offers_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_invites: {
        Row: {
          client_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_links: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_primary: boolean
          relation: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relation?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relation?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
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
          duolingo_score: number | null
          email_alt: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employer_name: string | null
          gap_years: number | null
          gender: string | null
          gic_amount: number | null
          gmat_score: number | null
          gpa_or_percentage: string | null
          graduation_year: number | null
          gre_score: number | null
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
          passport_available: boolean | null
          passport_country: string | null
          passport_expiry: string | null
          passport_issue_date: string | null
          passport_number: string | null
          person_id: string | null
          phone_alt: string | null
          place_of_birth: string | null
          pte_score: number | null
          source_documents: Json
          spouse_name: string | null
          toefl_score: number | null
          tuition_paid: number | null
          updated_at: string
          visa_refusal_history: boolean | null
          work_experience_years: number | null
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
          duolingo_score?: number | null
          email_alt?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          gap_years?: number | null
          gender?: string | null
          gic_amount?: number | null
          gmat_score?: number | null
          gpa_or_percentage?: string | null
          graduation_year?: number | null
          gre_score?: number | null
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
          passport_available?: boolean | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          person_id?: string | null
          phone_alt?: string | null
          place_of_birth?: string | null
          pte_score?: number | null
          source_documents?: Json
          spouse_name?: string | null
          toefl_score?: number | null
          tuition_paid?: number | null
          updated_at?: string
          visa_refusal_history?: boolean | null
          work_experience_years?: number | null
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
          duolingo_score?: number | null
          email_alt?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employer_name?: string | null
          gap_years?: number | null
          gender?: string | null
          gic_amount?: number | null
          gmat_score?: number | null
          gpa_or_percentage?: string | null
          graduation_year?: number | null
          gre_score?: number | null
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
          passport_available?: boolean | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_issue_date?: string | null
          passport_number?: string | null
          person_id?: string | null
          phone_alt?: string | null
          place_of_birth?: string | null
          pte_score?: number | null
          source_documents?: Json
          spouse_name?: string | null
          toefl_score?: number | null
          tuition_paid?: number | null
          updated_at?: string
          visa_refusal_history?: boolean | null
          work_experience_years?: number | null
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
      client_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          kind: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          kind?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
          alternate_phone: string | null
          application_id: string
          application_type: string
          budget: number | null
          country: string
          country_code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          enrollment_probability: number | null
          extra_items: Json
          full_name: string
          id: string
          intake: string | null
          interested_country: string | null
          interested_course: string | null
          lead_score: number
          lead_score_reasons: Json
          lead_source: string | null
          lead_stage: string | null
          lead_temperature: string | null
          next_followup_at: string | null
          notes: string | null
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          owner_id: string | null
          parent_contact: string | null
          phone: string | null
          preferred_contact_time: string | null
          preferred_language: string | null
          priority: string | null
          status: string
          suppressed_template_items: string[]
          tags: string[]
          template_id: string | null
          timezone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          alternate_phone?: string | null
          application_id?: string
          application_type: string
          budget?: number | null
          country: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrollment_probability?: number | null
          extra_items?: Json
          full_name: string
          id?: string
          intake?: string | null
          interested_country?: string | null
          interested_course?: string | null
          lead_score?: number
          lead_score_reasons?: Json
          lead_source?: string | null
          lead_stage?: string | null
          lead_temperature?: string | null
          next_followup_at?: string | null
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          owner_id?: string | null
          parent_contact?: string | null
          phone?: string | null
          preferred_contact_time?: string | null
          preferred_language?: string | null
          priority?: string | null
          status?: string
          suppressed_template_items?: string[]
          tags?: string[]
          template_id?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          alternate_phone?: string | null
          application_id?: string
          application_type?: string
          budget?: number | null
          country?: string
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrollment_probability?: number | null
          extra_items?: Json
          full_name?: string
          id?: string
          intake?: string | null
          interested_country?: string | null
          interested_course?: string | null
          lead_score?: number
          lead_score_reasons?: Json
          lead_source?: string | null
          lead_stage?: string | null
          lead_temperature?: string | null
          next_followup_at?: string | null
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          owner_id?: string | null
          parent_contact?: string | null
          phone?: string | null
          preferred_contact_time?: string | null
          preferred_language?: string | null
          priority?: string | null
          status?: string
          suppressed_template_items?: string[]
          tags?: string[]
          template_id?: string | null
          timezone?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      countries: {
        Row: {
          code: string
          created_at: string
          flag_emoji: string | null
          name: string
          order_index: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          flag_emoji?: string | null
          name: string
          order_index?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          flag_emoji?: string | null
          name?: string
          order_index?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      country_pathways: {
        Row: {
          country_code: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          label: string
          order_index: number
          pathway_code: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          order_index?: number
          pathway_code: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          order_index?: number
          pathway_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_pathways_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      course_finder_saved_filters: {
        Row: {
          created_at: string
          id: string
          is_shared: boolean
          name: string
          owner_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_shared?: boolean
          name: string
          owner_id: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_shared?: boolean
          name?: string
          owner_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: []
      }
      credit_wallet: {
        Row: {
          available_points: number
          client_id: string
          id: string
          last_updated: string
          points_value_rate: number
          total_points: number
        }
        Insert: {
          available_points?: number
          client_id: string
          id?: string
          last_updated?: string
          points_value_rate?: number
          total_points?: number
        }
        Update: {
          available_points?: number
          client_id?: string
          id?: string
          last_updated?: string
          points_value_rate?: number
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_wallet_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_wallet_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      de_chancenkarte_rules: {
        Row: {
          created_at: string
          description: string | null
          factor: string
          id: string
          is_active: boolean
          label: string
          max_points: number
          order_index: number
          tiers: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          factor: string
          id?: string
          is_active?: boolean
          label: string
          max_points?: number
          order_index?: number
          tiers?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          factor?: string
          id?: string
          is_active?: boolean
          label?: string
          max_points?: number
          order_index?: number
          tiers?: Json
          updated_at?: string
        }
        Relationships: []
      }
      de_shortage_occupations: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          keywords: string[]
          label: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          label: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          keywords?: string[]
          label?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
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
      distribution_rule_members: {
        Row: {
          created_at: string
          daily_cap: number | null
          id: string
          rule_id: string
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          daily_cap?: number | null
          id?: string
          rule_id: string
          user_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          daily_cap?: number | null
          id?: string
          rule_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rule_members_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "distribution_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_rules: {
        Row: {
          active: boolean
          campaign_id: string | null
          created_at: string
          created_by: string | null
          fixed_qty: number | null
          id: string
          mode: string
          name: string
          target_role: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          fixed_qty?: number | null
          id?: string
          mode: string
          name: string
          target_role?: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          fixed_qty?: number | null
          id?: string
          mode?: string
          name?: string
          target_role?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "distribution_rules_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_runs: {
        Row: {
          executed_at: string
          executed_by: string | null
          id: string
          lead_count: number
          rule_id: string | null
          summary: Json
        }
        Insert: {
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_count?: number
          rule_id?: string | null
          summary?: Json
        }
        Update: {
          executed_at?: string
          executed_by?: string | null
          id?: string
          lead_count?: number
          rule_id?: string | null
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "distribution_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "distribution_rules"
            referencedColumns: ["id"]
          },
        ]
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
      email_attachments: {
        Row: {
          created_at: string
          email_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string
          email_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string
          email_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_attachments_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "client_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          email_id: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
        }
        Insert: {
          email_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Update: {
          email_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "client_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      email_read_receipts: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_read_receipts_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          scope: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          scope?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          scope?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_threads: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          internal_only: boolean
          last_message_at: string | null
          message_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          internal_only?: boolean
          last_message_at?: string | null
          message_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          internal_only?: boolean
          last_message_at?: string | null
          message_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          responded_at: string | null
          status: string
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
          responded_at?: string | null
          status?: string
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
          responded_at?: string | null
          status?: string
          task_label?: string | null
          to_role?: string | null
          to_user?: string
        }
        Relationships: []
      }
      lead_remarks: {
        Row: {
          author_id: string
          call_session_id: string | null
          client_id: string
          created_at: string
          id: string
          lead_status: string | null
          next_callback_at: string | null
          outcome: string | null
          queue_item_id: string | null
          remark: string
        }
        Insert: {
          author_id: string
          call_session_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          lead_status?: string | null
          next_callback_at?: string | null
          outcome?: string | null
          queue_item_id?: string | null
          remark: string
        }
        Update: {
          author_id?: string
          call_session_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          lead_status?: string | null
          next_callback_at?: string | null
          outcome?: string | null
          queue_item_id?: string | null
          remark?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_remarks_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_remarks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_remarks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_remarks_queue_item_id_fkey"
            columns: ["queue_item_id"]
            isOneToOne: false
            referencedRelation: "call_queue_items"
            referencedColumns: ["id"]
          },
        ]
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
      noc_category_mappings: {
        Row: {
          category: string
          created_at: string
          noc_code: string
        }
        Insert: {
          category: string
          created_at?: string
          noc_code: string
        }
        Update: {
          category?: string
          created_at?: string
          noc_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "noc_category_mappings_noc_code_fkey"
            columns: ["noc_code"]
            isOneToOne: false
            referencedRelation: "noc_occupations"
            referencedColumns: ["noc_code"]
          },
        ]
      }
      noc_occupations: {
        Row: {
          broad_category: string | null
          created_at: string
          is_active: boolean
          keywords: string[]
          noc_code: string
          notes: string | null
          search_tsv: unknown
          teer: number
          title: string
          updated_at: string
        }
        Insert: {
          broad_category?: string | null
          created_at?: string
          is_active?: boolean
          keywords?: string[]
          noc_code: string
          notes?: string | null
          search_tsv?: unknown
          teer: number
          title: string
          updated_at?: string
        }
        Update: {
          broad_category?: string | null
          created_at?: string
          is_active?: boolean
          keywords?: string[]
          noc_code?: string
          notes?: string | null
          search_tsv?: unknown
          teer?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      offer_audience_targets: {
        Row: {
          client_id: string | null
          group_id: string | null
          id: string
          offer_id: string
        }
        Insert: {
          client_id?: string | null
          group_id?: string | null
          id?: string
          offer_id: string
        }
        Update: {
          client_id?: string | null
          group_id?: string | null
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_audience_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_audience_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_audience_targets_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "offer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_audience_targets_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_group_members: {
        Row: {
          added_at: string
          client_id: string
          group_id: string
        }
        Insert: {
          added_at?: string
          client_id: string
          group_id: string
        }
        Update: {
          added_at?: string
          client_id?: string
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "offer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          applicable_services: string[] | null
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          promo_code: string | null
          terms_conditions: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          applicable_services?: string[] | null
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          promo_code?: string | null
          terms_conditions?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          applicable_services?: string[] | null
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          promo_code?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      pathway_rules: {
        Row: {
          allowed_teers: number[] | null
          created_at: string
          description: string | null
          extra: Json
          id: string
          is_active: boolean
          label: string
          min_canadian_experience_years: number | null
          min_clb: number | null
          min_foreign_experience_years: number | null
          min_teer: number | null
          pathway: string
          requires_job_offer: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          allowed_teers?: number[] | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          is_active?: boolean
          label: string
          min_canadian_experience_years?: number | null
          min_clb?: number | null
          min_foreign_experience_years?: number | null
          min_teer?: number | null
          pathway: string
          requires_job_offer?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          allowed_teers?: number[] | null
          created_at?: string
          description?: string | null
          extra?: Json
          id?: string
          is_active?: boolean
          label?: string
          min_canadian_experience_years?: number | null
          min_clb?: number | null
          min_foreign_experience_years?: number | null
          min_teer?: number | null
          pathway?: string
          requires_job_offer?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      point_redemptions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          points_redeemed: number
          service_id: string | null
          status: string
          usd_value: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          points_redeemed: number
          service_id?: string | null
          status?: string
          usd_value: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          points_redeemed?: number
          service_id?: string | null
          status?: string
          usd_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "point_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          client_id: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          points: number
          points_value_rate: number
          reference_id: string | null
          type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points: number
          points_value_rate?: number
          reference_id?: string | null
          type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          points?: number
          points_value_rate?: number
          reference_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
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
      provincial_noc_targets: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          noc_code: string | null
          notes: string | null
          province_code: string
          province_name: string
          stream_name: string
          teer: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          noc_code?: string | null
          notes?: string | null
          province_code: string
          province_name: string
          stream_name: string
          teer?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          noc_code?: string | null
          notes?: string | null
          province_code?: string
          province_name?: string
          stream_name?: string
          teer?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provincial_noc_targets_noc_code_fkey"
            columns: ["noc_code"]
            isOneToOne: false
            referencedRelation: "noc_occupations"
            referencedColumns: ["noc_code"]
          },
        ]
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
      referrals: {
        Row: {
          created_at: string
          friend_email: string | null
          friend_name: string | null
          friend_phone: string | null
          id: string
          joined_client_id: string | null
          points_earned: number
          referrer_client_id: string
          status: string
        }
        Insert: {
          created_at?: string
          friend_email?: string | null
          friend_name?: string | null
          friend_phone?: string | null
          id?: string
          joined_client_id?: string | null
          points_earned?: number
          referrer_client_id: string
          status?: string
        }
        Update: {
          created_at?: string
          friend_email?: string | null
          friend_name?: string | null
          friend_phone?: string | null
          id?: string
          joined_client_id?: string | null
          points_earned?: number
          referrer_client_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_joined_client_id_fkey"
            columns: ["joined_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_joined_client_id_fkey"
            columns: ["joined_client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
        ]
      }
      remark_presets: {
        Row: {
          active: boolean
          category: string
          created_at: string
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          category?: string
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
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
      smtp_settings: {
        Row: {
          created_at: string
          encryption: string
          host: string
          id: string
          is_active: boolean
          last_error: string | null
          last_status: string | null
          last_verified_at: string | null
          password: string
          port: number
          provider: string
          reply_to: string | null
          sender_email: string
          sender_name: string
          singleton: boolean
          updated_at: string
          updated_by: string | null
          username: string
        }
        Insert: {
          created_at?: string
          encryption?: string
          host?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_status?: string | null
          last_verified_at?: string | null
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          sender_email?: string
          sender_name?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Update: {
          created_at?: string
          encryption?: string
          host?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_status?: string | null
          last_verified_at?: string | null
          password?: string
          port?: number
          provider?: string
          reply_to?: string | null
          sender_email?: string
          sender_name?: string
          singleton?: boolean
          updated_at?: string
          updated_by?: string | null
          username?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      telecaller_status: {
        Row: {
          campaign_id: string | null
          changed_at: string
          status: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          changed_at?: string
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          changed_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telecaller_status_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "call_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telecaller_status_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "vw_campaign_performance"
            referencedColumns: ["campaign_id"]
          },
        ]
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
      upi_agreement_versions: {
        Row: {
          agreement_id: string
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          file_path: string | null
          id: string
          version_number: number
        }
        Insert: {
          agreement_id: string
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          version_number: number
        }
        Update: {
          agreement_id?: string
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          file_path?: string | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "upi_agreement_versions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "upi_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_agreements: {
        Row: {
          agreement_type: string | null
          created_at: string | null
          extracted_data: Json | null
          file_path: string | null
          id: string
          institution_id: string
          metadata: Json | null
          notes: string | null
          renewal_reminder_days: number | null
          signed_by_institution: string | null
          signed_by_us: string | null
          signed_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          agreement_type?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          file_path?: string | null
          id?: string
          institution_id: string
          metadata?: Json | null
          notes?: string | null
          renewal_reminder_days?: number | null
          signed_by_institution?: string | null
          signed_by_us?: string | null
          signed_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          agreement_type?: string | null
          created_at?: string | null
          extracted_data?: Json | null
          file_path?: string | null
          id?: string
          institution_id?: string
          metadata?: Json | null
          notes?: string | null
          renewal_reminder_days?: number | null
          signed_by_institution?: string | null
          signed_by_us?: string | null
          signed_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_agreements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_ai_suggestions: {
        Row: {
          confidence: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          document_id: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          status: string | null
          suggestion_data: Json | null
          suggestion_type: string
          title: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string | null
          suggestion_data?: Json | null
          suggestion_type: string
          title?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          status?: string | null
          suggestion_data?: Json | null
          suggestion_type?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_ai_suggestions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upi_uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_ai_suggestions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_ai_suggestions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "upi_institution_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          changed_fields: Json | null
          created_at: string | null
          id: number
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_fields?: Json | null
          created_at?: string | null
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_fields?: Json | null
          created_at?: string | null
          id?: number
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      upi_campuses: {
        Row: {
          address: string | null
          city: string | null
          country_id: string | null
          country_name: string | null
          created_at: string | null
          email: string | null
          id: string
          institution_id: string
          is_main_campus: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          state_province: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id: string
          is_main_campus?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          state_province?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          institution_id?: string
          is_main_campus?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          state_province?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_campuses_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "upi_countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_campuses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_rules: {
        Row: {
          commission_id: string
          condition_field: string | null
          condition_operator: string | null
          condition_value: string | null
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          max_value: number | null
          metadata: Json | null
          min_value: number | null
          notes: string | null
          payout_amount: number | null
          payout_currency: string | null
          payout_type: string | null
          rule_name: string | null
          rule_type: string | null
          sort_order: number | null
        }
        Insert: {
          commission_id: string
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          max_value?: number | null
          metadata?: Json | null
          min_value?: number | null
          notes?: string | null
          payout_amount?: number | null
          payout_currency?: string | null
          payout_type?: string | null
          rule_name?: string | null
          rule_type?: string | null
          sort_order?: number | null
        }
        Update: {
          commission_id?: string
          condition_field?: string | null
          condition_operator?: string | null
          condition_value?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          max_value?: number | null
          metadata?: Json | null
          min_value?: number | null
          notes?: string | null
          payout_amount?: number | null
          payout_currency?: string | null
          payout_type?: string | null
          rule_name?: string | null
          rule_type?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_rules_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commissions: {
        Row: {
          agreement_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          is_proposed: boolean | null
          metadata: Json | null
          model_type: string
          name: string
          notes: string | null
          source: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          agreement_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          is_proposed?: boolean | null
          metadata?: Json | null
          model_type: string
          name: string
          notes?: string | null
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          agreement_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          is_proposed?: boolean | null
          metadata?: Json | null
          model_type?: string
          name?: string
          notes?: string | null
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commissions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "upi_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_countries: {
        Row: {
          created_at: string | null
          id: string
          iso_alpha2: string | null
          iso_alpha3: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          iso_alpha2?: string | null
          iso_alpha3?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          iso_alpha2?: string | null
          iso_alpha3?: string | null
          name?: string
        }
        Relationships: []
      }
      upi_course_intakes: {
        Row: {
          course_id: string
          id: string
          is_confirmed: boolean | null
          month: string
          notes: string | null
          year: number | null
        }
        Insert: {
          course_id: string
          id?: string
          is_confirmed?: boolean | null
          month: string
          notes?: string | null
          year?: number | null
        }
        Update: {
          course_id?: string
          id?: string
          is_confirmed?: boolean | null
          month?: string
          notes?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_course_intakes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "upi_courses_staging"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_courses_staging: {
        Row: {
          age_requirement: string | null
          application_fee: number | null
          bonus_info: string | null
          cambridge_overall: number | null
          campus_id: string | null
          campus_name: string | null
          city: string | null
          commission_info: string | null
          confidence_score: number | null
          country_name: string | null
          course_description: string | null
          course_title: string
          currency: string | null
          dedup_hash: string | null
          discipline_area_id: string | null
          duolingo_overall: number | null
          duration_unit: string | null
          duration_value: number | null
          extracted_at: string | null
          gpa_requirement: string | null
          has_scholarship: boolean | null
          id: string
          ielts_min_component: number | null
          ielts_overall: number | null
          institution_id: string | null
          intake_months: Json | null
          is_coop: boolean | null
          is_online: boolean | null
          is_part_time: boolean | null
          is_pr_pathway: boolean | null
          job_id: string | null
          metadata: Json | null
          program_level_id: string | null
          program_url: string | null
          pte_overall: number | null
          published_course_id: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          scholarship_amount: number | null
          scholarship_currency: string | null
          scholarship_detail: string | null
          source_id: string | null
          source_identifier: string | null
          source_last_updated: string | null
          source_url: string | null
          state_province: string | null
          study_area_id: string | null
          toefl_overall: number | null
          tuition_fee: number | null
          tuition_fee_per: string | null
          updated_at: string | null
          work_experience_years: number | null
        }
        Insert: {
          age_requirement?: string | null
          application_fee?: number | null
          bonus_info?: string | null
          cambridge_overall?: number | null
          campus_id?: string | null
          campus_name?: string | null
          city?: string | null
          commission_info?: string | null
          confidence_score?: number | null
          country_name?: string | null
          course_description?: string | null
          course_title: string
          currency?: string | null
          dedup_hash?: string | null
          discipline_area_id?: string | null
          duolingo_overall?: number | null
          duration_unit?: string | null
          duration_value?: number | null
          extracted_at?: string | null
          gpa_requirement?: string | null
          has_scholarship?: boolean | null
          id?: string
          ielts_min_component?: number | null
          ielts_overall?: number | null
          institution_id?: string | null
          intake_months?: Json | null
          is_coop?: boolean | null
          is_online?: boolean | null
          is_part_time?: boolean | null
          is_pr_pathway?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          program_level_id?: string | null
          program_url?: string | null
          pte_overall?: number | null
          published_course_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scholarship_amount?: number | null
          scholarship_currency?: string | null
          scholarship_detail?: string | null
          source_id?: string | null
          source_identifier?: string | null
          source_last_updated?: string | null
          source_url?: string | null
          state_province?: string | null
          study_area_id?: string | null
          toefl_overall?: number | null
          tuition_fee?: number | null
          tuition_fee_per?: string | null
          updated_at?: string | null
          work_experience_years?: number | null
        }
        Update: {
          age_requirement?: string | null
          application_fee?: number | null
          bonus_info?: string | null
          cambridge_overall?: number | null
          campus_id?: string | null
          campus_name?: string | null
          city?: string | null
          commission_info?: string | null
          confidence_score?: number | null
          country_name?: string | null
          course_description?: string | null
          course_title?: string
          currency?: string | null
          dedup_hash?: string | null
          discipline_area_id?: string | null
          duolingo_overall?: number | null
          duration_unit?: string | null
          duration_value?: number | null
          extracted_at?: string | null
          gpa_requirement?: string | null
          has_scholarship?: boolean | null
          id?: string
          ielts_min_component?: number | null
          ielts_overall?: number | null
          institution_id?: string | null
          intake_months?: Json | null
          is_coop?: boolean | null
          is_online?: boolean | null
          is_part_time?: boolean | null
          is_pr_pathway?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          program_level_id?: string | null
          program_url?: string | null
          pte_overall?: number | null
          published_course_id?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          scholarship_amount?: number | null
          scholarship_currency?: string | null
          scholarship_detail?: string | null
          source_id?: string | null
          source_identifier?: string | null
          source_last_updated?: string | null
          source_url?: string | null
          state_province?: string | null
          study_area_id?: string | null
          toefl_overall?: number | null
          tuition_fee?: number | null
          tuition_fee_per?: string | null
          updated_at?: string | null
          work_experience_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_courses_staging_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "upi_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_discipline_area_id_fkey"
            columns: ["discipline_area_id"]
            isOneToOne: false
            referencedRelation: "upi_discipline_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "upi_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_program_level_id_fkey"
            columns: ["program_level_id"]
            isOneToOne: false
            referencedRelation: "upi_program_levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "upi_institution_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_courses_staging_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "upi_study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_discipline_areas: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string
          study_area_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug: string
          study_area_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string
          study_area_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_discipline_areas_study_area_id_fkey"
            columns: ["study_area_id"]
            isOneToOne: false
            referencedRelation: "upi_study_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_document_categories: {
        Row: {
          category_id: string
          document_id: string
        }
        Insert: {
          category_id: string
          document_id: string
        }
        Update: {
          category_id?: string
          document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_document_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "upi_taxonomy_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_document_categories_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upi_uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_eligibility_rules: {
        Row: {
          course_id: string
          description: string
          id: string
          metadata: Json | null
          raw_text: string | null
          rule_type: string | null
        }
        Insert: {
          course_id: string
          description: string
          id?: string
          metadata?: Json | null
          raw_text?: string | null
          rule_type?: string | null
        }
        Update: {
          course_id?: string
          description?: string
          id?: string
          metadata?: Json | null
          raw_text?: string | null
          rule_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_eligibility_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "upi_courses_staging"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_extraction_results: {
        Row: {
          confidence: number | null
          created_at: string | null
          document_id: string | null
          entity_key: string | null
          entity_type: string
          entity_value: string | null
          entity_value_structured: Json | null
          field_path: string | null
          id: string
          is_approved: boolean | null
          is_rejected: boolean | null
          job_id: string | null
          metadata: Json | null
          page_number: number | null
          routed_to: string | null
          source_text: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          entity_key?: string | null
          entity_type: string
          entity_value?: string | null
          entity_value_structured?: Json | null
          field_path?: string | null
          id?: string
          is_approved?: boolean | null
          is_rejected?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          page_number?: number | null
          routed_to?: string | null
          source_text?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          document_id?: string | null
          entity_key?: string | null
          entity_type?: string
          entity_value?: string | null
          entity_value_structured?: Json | null
          field_path?: string | null
          id?: string
          is_approved?: boolean | null
          is_rejected?: boolean | null
          job_id?: string | null
          metadata?: Json | null
          page_number?: number | null
          routed_to?: string | null
          source_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_extraction_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upi_uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_extraction_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "upi_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_institution_sources: {
        Row: {
          confidence_score: number | null
          crawl_status: string | null
          created_at: string | null
          error_log: Json | null
          extracted_records_count: number | null
          file_path: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          name: string | null
          next_sync_at: string | null
          notes: string | null
          pages_found: number | null
          pages_scanned: number | null
          parser_type: string | null
          priority: number | null
          source_type: string
          sync_frequency: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          confidence_score?: number | null
          crawl_status?: string | null
          created_at?: string | null
          error_log?: Json | null
          extracted_records_count?: number | null
          file_path?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_sync_at?: string | null
          notes?: string | null
          pages_found?: number | null
          pages_scanned?: number | null
          parser_type?: string | null
          priority?: number | null
          source_type: string
          sync_frequency?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          confidence_score?: number | null
          crawl_status?: string | null
          created_at?: string | null
          error_log?: Json | null
          extracted_records_count?: number | null
          file_path?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          name?: string | null
          next_sync_at?: string | null
          notes?: string | null
          pages_found?: number | null
          pages_scanned?: number | null
          parser_type?: string | null
          priority?: number | null
          source_type?: string
          sync_frequency?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_institution_sources_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_institution_tags: {
        Row: {
          institution_id: string
          tag_id: string
        }
        Insert: {
          institution_id: string
          tag_id: string
        }
        Update: {
          institution_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_institution_tags_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_institution_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "upi_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_institutions: {
        Row: {
          accreditation: string | null
          address: string | null
          city: string | null
          country_id: string | null
          country_name: string | null
          created_at: string | null
          email: string | null
          established_year: number | null
          id: string
          institution_type: string | null
          is_active: boolean | null
          is_partner: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          notes: string | null
          partner_since: string | null
          phone: string | null
          ranking_info: string | null
          slug: string | null
          state_province: string | null
          total_programs: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          accreditation?: string | null
          address?: string | null
          city?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          institution_type?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          notes?: string | null
          partner_since?: string | null
          phone?: string | null
          ranking_info?: string | null
          slug?: string | null
          state_province?: string | null
          total_programs?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          accreditation?: string | null
          address?: string | null
          city?: string | null
          country_id?: string | null
          country_name?: string | null
          created_at?: string | null
          email?: string | null
          established_year?: number | null
          id?: string
          institution_type?: string | null
          is_active?: boolean | null
          is_partner?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          notes?: string | null
          partner_since?: string | null
          phone?: string | null
          ranking_info?: string | null
          slug?: string | null
          state_province?: string | null
          total_programs?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_institutions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "upi_countries"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_language_requirements: {
        Row: {
          component_name: string | null
          course_id: string
          id: string
          metadata: Json | null
          min_component_score: number | null
          notes: string | null
          overall_score: number | null
          test_name: string
        }
        Insert: {
          component_name?: string | null
          course_id: string
          id?: string
          metadata?: Json | null
          min_component_score?: number | null
          notes?: string | null
          overall_score?: number | null
          test_name: string
        }
        Update: {
          component_name?: string | null
          course_id?: string
          id?: string
          metadata?: Json | null
          min_component_score?: number | null
          notes?: string | null
          overall_score?: number | null
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_language_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "upi_courses_staging"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_marketing_campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          channel: string
          created_at: string | null
          generated_content: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          promotion_id: string | null
          prompt_context: Json | null
          sent_at: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string | null
          generated_content?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          promotion_id?: string | null
          prompt_context?: Json | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string | null
          generated_content?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          promotion_id?: string | null
          prompt_context?: Json | null
          sent_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_marketing_campaigns_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_marketing_campaigns_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "upi_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_program_levels: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      upi_promotions: {
        Row: {
          auto_detected: boolean | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          detection_source: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          metadata: Json | null
          promo_type: string | null
          target_countries: Json | null
          target_disciplines: Json | null
          title: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          auto_detected?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          detection_source?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          promo_type?: string | null
          target_countries?: Json | null
          target_disciplines?: Json | null
          title: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          auto_detected?: boolean | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          detection_source?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          promo_type?: string | null
          target_countries?: Json | null
          target_disciplines?: Json | null
          title?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_promotions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_scholarship_rules: {
        Row: {
          amount: number | null
          course_id: string
          coverage: string | null
          currency: string | null
          deadline_month: string | null
          eligibility: string | null
          id: string
          institution_id: string | null
          is_automatic: boolean | null
          metadata: Json | null
          name: string | null
          notes: string | null
        }
        Insert: {
          amount?: number | null
          course_id: string
          coverage?: string | null
          currency?: string | null
          deadline_month?: string | null
          eligibility?: string | null
          id?: string
          institution_id?: string | null
          is_automatic?: boolean | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
        }
        Update: {
          amount?: number | null
          course_id?: string
          coverage?: string | null
          currency?: string | null
          deadline_month?: string | null
          eligibility?: string | null
          id?: string
          institution_id?: string | null
          is_automatic?: boolean | null
          metadata?: Json | null
          name?: string | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_scholarship_rules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "upi_courses_staging"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_scholarship_rules_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_study_areas: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      upi_sync_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_summary: string | null
          id: string
          institution_id: string | null
          metadata: Json | null
          pages_discovered: number | null
          pages_failed: number | null
          pages_scanned: number | null
          records_extracted: number | null
          records_rejected: number | null
          records_upserted: number | null
          source_id: string
          started_at: string | null
          status: string | null
          triggered_by: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          pages_discovered?: number | null
          pages_failed?: number | null
          pages_scanned?: number | null
          records_extracted?: number | null
          records_rejected?: number | null
          records_upserted?: number | null
          source_id: string
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_summary?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json | null
          pages_discovered?: number | null
          pages_failed?: number | null
          pages_scanned?: number | null
          records_extracted?: number | null
          records_rejected?: number | null
          records_upserted?: number | null
          source_id?: string
          started_at?: string | null
          status?: string | null
          triggered_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_sync_jobs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_sync_jobs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "upi_institution_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_sync_logs: {
        Row: {
          created_at: string | null
          detail: Json | null
          id: number
          job_id: string
          level: string | null
          message: string
          page_url: string | null
        }
        Insert: {
          created_at?: string | null
          detail?: Json | null
          id?: number
          job_id: string
          level?: string | null
          message: string
          page_url?: string | null
        }
        Update: {
          created_at?: string | null
          detail?: Json | null
          id?: number
          job_id?: string
          level?: string | null
          message?: string
          page_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_sync_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "upi_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      upi_taxonomy_categories: {
        Row: {
          category_type: string | null
          created_at: string | null
          id: string
          is_system: boolean | null
          metadata: Json | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          category_type?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          metadata?: Json | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          category_type?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_taxonomy_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "upi_taxonomy_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_uploaded_documents: {
        Row: {
          classification: Json | null
          confidence_score: number | null
          created_at: string | null
          detected_language: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          institution_id: string | null
          is_processed: boolean | null
          metadata: Json | null
          mime_type: string | null
          page_count: number | null
          processing_error: string | null
          raw_text: string | null
          review_notes: string | null
          review_status: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          updated_at: string | null
        }
        Insert: {
          classification?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          detected_language?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          institution_id?: string | null
          is_processed?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          page_count?: number | null
          processing_error?: string | null
          raw_text?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Update: {
          classification?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          detected_language?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          institution_id?: string | null
          is_processed?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          page_count?: number | null
          processing_error?: string | null
          raw_text?: string | null
          review_notes?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_uploaded_documents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_uploaded_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "upi_institution_sources"
            referencedColumns: ["id"]
          },
        ]
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
      voice_note_transcripts: {
        Row: {
          created_at: string
          id: string
          language: string | null
          model: string | null
          status: string
          text: string
          voice_note_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          model?: string | null
          status?: string
          text?: string
          voice_note_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          model?: string | null
          status?: string
          text?: string
          voice_note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_note_transcripts_voice_note_id_fkey"
            columns: ["voice_note_id"]
            isOneToOne: false
            referencedRelation: "voice_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_notes: {
        Row: {
          author_id: string | null
          client_id: string
          context_id: string | null
          context_type: string
          created_at: string
          duration_ms: number | null
          id: string
          mime_type: string | null
          size_bytes: number | null
          status: string
          storage_path: string
        }
        Insert: {
          author_id?: string | null
          client_id: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
        }
        Update: {
          author_id?: string | null
          client_id?: string
          context_id?: string | null
          context_type?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
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
      smtp_settings_safe: {
        Row: {
          created_at: string | null
          encryption: string | null
          has_password: boolean | null
          host: string | null
          id: string | null
          is_active: boolean | null
          last_error: string | null
          last_status: string | null
          last_verified_at: string | null
          port: number | null
          provider: string | null
          reply_to: string | null
          sender_email: string | null
          sender_name: string | null
          updated_at: string | null
          updated_by: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          encryption?: string | null
          has_password?: never
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_status?: string | null
          last_verified_at?: string | null
          port?: number | null
          provider?: string | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          encryption?: string | null
          has_password?: never
          host?: string | null
          id?: string | null
          is_active?: boolean | null
          last_error?: string | null
          last_status?: string | null
          last_verified_at?: string | null
          port?: number | null
          provider?: string | null
          reply_to?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
          username?: string | null
        }
        Relationships: []
      }
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
      vw_call_stats_daily: {
        Row: {
          agent_id: string | null
          answered: number | null
          avg_duration: number | null
          day: string | null
          total_calls: number | null
          unanswered: number | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "telephony_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_campaign_performance: {
        Row: {
          callbacks_pending: number | null
          campaign_id: string | null
          cold: number | null
          converted: number | null
          hot: number | null
          leads: number | null
          name: string | null
          warm: number | null
        }
        Relationships: []
      }
      vw_counselor_productivity: {
        Row: {
          enrollments: number | null
          handoffs_accepted: number | null
          name: string | null
          tasks_done: number | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_country_intake_trends: {
        Row: {
          country: string | null
          intake: string | null
          leads: number | null
        }
        Relationships: []
      }
      vw_lead_funnel: {
        Row: {
          leads: number | null
          stage: string | null
          temperature: string | null
        }
        Relationships: []
      }
      vw_telecaller_productivity: {
        Row: {
          answered: number | null
          callbacks_pending: number | null
          calls: number | null
          name: string | null
          talk_seconds: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assessment_lead_has_creator: {
        Args: { _lead_id: string; _uid: string }
        Returns: boolean
      }
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
          lead_status: string | null
          next_call_at: string | null
          notes: string | null
          priority: number
          retry_count: number
          source: string | null
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
          alternate_phone: string | null
          application_id: string
          application_type: string
          budget: number | null
          country: string
          country_code: string | null
          created_at: string
          created_by: string | null
          email: string | null
          enrollment_probability: number | null
          extra_items: Json
          full_name: string
          id: string
          intake: string | null
          interested_country: string | null
          interested_course: string | null
          lead_score: number
          lead_score_reasons: Json
          lead_source: string | null
          lead_stage: string | null
          lead_temperature: string | null
          next_followup_at: string | null
          notes: string | null
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          owner_id: string | null
          parent_contact: string | null
          phone: string | null
          preferred_contact_time: string | null
          preferred_language: string | null
          priority: string | null
          status: string
          suppressed_template_items: string[]
          tags: string[]
          template_id: string | null
          timezone: string | null
          updated_at: string
          whatsapp: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      distribute_leads: {
        Args: { _lead_ids: string[]; _rule_id: string }
        Returns: Json
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_lead: {
        Args: {
          _academics?: string
          _assigned_counselor_email?: string
          _assigned_telecaller_email?: string
          _campaign_id?: string
          _country?: string
          _dedupe_action?: string
          _email?: string
          _full_name: string
          _ielts?: string
          _lead_status?: string
          _notes?: string
          _phone: string
          _service?: string
        }
        Returns: Json
      }
      import_lead_v2: {
        Args: { _dedupe?: string; payload: Json }
        Returns: Json
      }
      is_accounting_admin: { Args: { _uid: string }; Returns: boolean }
      is_chat_channel_member: {
        Args: { _channel: string; _uid: string }
        Returns: boolean
      }
      is_portal_user_for: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team: string; _uid: string }
        Returns: boolean
      }
      is_telephony_admin: { Args: { _uid: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reassign_leads: {
        Args: { _lead_ids: string[]; _to_user: string }
        Returns: number
      }
      recover_stale_calling_items: { Args: never; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_can_see_offer: {
        Args: { _offer_id: string; _uid: string }
        Returns: boolean
      }
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
        | "client"
      assessment_invite_status: "pending" | "registered" | "expired" | "revoked"
      assessment_lead_source: "invite" | "referral" | "existing_client"
      assessment_session_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "counselor_reviewed"
        | "archived"
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
      telephony_role:
        | "telecaller"
        | "counselor"
        | "admin"
        | "documentation"
        | "viewer"
        | "client"
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
      app_role: [
        "admin",
        "counselor",
        "documentation",
        "viewer",
        "telecaller",
        "client",
      ],
      assessment_invite_status: ["pending", "registered", "expired", "revoked"],
      assessment_lead_source: ["invite", "referral", "existing_client"],
      assessment_session_status: [
        "draft",
        "in_progress",
        "submitted",
        "counselor_reviewed",
        "archived",
      ],
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
      telephony_role: [
        "telecaller",
        "counselor",
        "admin",
        "documentation",
        "viewer",
        "client",
      ],
    },
  },
} as const
