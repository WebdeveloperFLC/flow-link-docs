/**
 * AUTO-EXTRACTED commission-related Supabase types from types.ts
 * Generated for commission-module-handoff package.
 * Phase 2B aggregator tables/views may be missing — see migrations and as any usage in UI.
 */
export type CommissionDatabaseExtract = {
  public: {
    Tables: {
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
          {
            foreignKeyName: "upi_agreements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_agreements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_agreement_versions: {
        Row: {
          agreement_id: string
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          file_path: string | null
          id: string
          status: string | null
          version_number: number
        }
        Insert: {
          agreement_id: string
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          file_path?: string | null
          id?: string
          status?: string | null
          version_number: number
        }
        Update: {
          agreement_id?: string
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          file_path?: string | null
          id?: string
          status?: string | null
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
      upi_billing_profiles: {
        Row: {
          aggregator_id: string | null
          billing_address: string | null
          billing_email: string | null
          billing_phone: string | null
          created_at: string
          default_invoice_currency: string
          default_receipt_currency: string
          id: string
          institution_id: string
          is_default: boolean
          legal_entity_name: string | null
          metadata: Json
          payment_terms_days: number | null
          profile_name: string
          remittance_instructions: string | null
          status: string
          tax_registration_number: string | null
          updated_at: string
        }
        Insert: {
          aggregator_id?: string | null
          billing_address?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string
          default_invoice_currency?: string
          default_receipt_currency?: string
          id?: string
          institution_id: string
          is_default?: boolean
          legal_entity_name?: string | null
          metadata?: Json
          payment_terms_days?: number | null
          profile_name: string
          remittance_instructions?: string | null
          status?: string
          tax_registration_number?: string | null
          updated_at?: string
        }
        Update: {
          aggregator_id?: string | null
          billing_address?: string | null
          billing_email?: string | null
          billing_phone?: string | null
          created_at?: string
          default_invoice_currency?: string
          default_receipt_currency?: string
          id?: string
          institution_id?: string
          is_default?: boolean
          legal_entity_name?: string | null
          metadata?: Json
          payment_terms_days?: number | null
          profile_name?: string
          remittance_instructions?: string | null
          status?: string
          tax_registration_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_billing_profiles_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_billing_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_billing_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_billing_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_claim_cycles: {
        Row: {
          aggregator_id: string | null
          aggregator_scope: boolean
          claim_due_date: string | null
          created_at: string
          currency: string | null
          cycle_label: string | null
          id: string
          institution_id: string
          intake: string | null
          invoice_due_date: string | null
          metadata: Json | null
          notes: string | null
          partnership_route_id: string | null
          payer_type: string | null
          period_label: string
          status: string | null
          total_expected: number | null
          total_received: number | null
          updated_at: string
        }
        Insert: {
          aggregator_id?: string | null
          aggregator_scope?: boolean
          claim_due_date?: string | null
          created_at?: string
          currency?: string | null
          cycle_label?: string | null
          id?: string
          institution_id: string
          intake?: string | null
          invoice_due_date?: string | null
          metadata?: Json | null
          notes?: string | null
          partnership_route_id?: string | null
          payer_type?: string | null
          period_label: string
          status?: string | null
          total_expected?: number | null
          total_received?: number | null
          updated_at?: string
        }
        Update: {
          aggregator_id?: string | null
          aggregator_scope?: boolean
          claim_due_date?: string | null
          created_at?: string
          currency?: string | null
          cycle_label?: string | null
          id?: string
          institution_id?: string
          intake?: string | null
          invoice_due_date?: string | null
          metadata?: Json | null
          notes?: string | null
          partnership_route_id?: string | null
          payer_type?: string | null
          period_label?: string
          status?: string | null
          total_expected?: number | null
          total_received?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_claim_cycles_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_claim_cycles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_claim_cycles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_claim_cycles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_claim_cycles_partnership_route_id_fkey"
            columns: ["partnership_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commissions: {
        Row: {
          aggregator_id: string | null
          agreement_id: string | null
          agreement_version_id: string | null
          base_rate_percent: number | null
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
          partnership_route_id: string | null
          published_at: string | null
          published_by: string | null
          source: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          aggregator_id?: string | null
          agreement_id?: string | null
          agreement_version_id?: string | null
          base_rate_percent?: number | null
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
          partnership_route_id?: string | null
          published_at?: string | null
          published_by?: string | null
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          aggregator_id?: string | null
          agreement_id?: string | null
          agreement_version_id?: string | null
          base_rate_percent?: number | null
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
          partnership_route_id?: string | null
          published_at?: string | null
          published_by?: string | null
          source?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commissions_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "upi_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_agreement_version_id_fkey"
            columns: ["agreement_version_id"]
            isOneToOne: false
            referencedRelation: "upi_agreement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commissions_partnership_route_id_fkey"
            columns: ["partnership_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
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
          precedence_rank: number | null
          rule_name: string | null
          rule_type: string | null
          scope_campus: string | null
          scope_country: string | null
          scope_intake: string | null
          scope_program_category: string | null
          scope_program_code: string | null
          scope_promotion_id: string | null
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
          precedence_rank?: number | null
          rule_name?: string | null
          rule_type?: string | null
          scope_campus?: string | null
          scope_country?: string | null
          scope_intake?: string | null
          scope_program_category?: string | null
          scope_program_code?: string | null
          scope_promotion_id?: string | null
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
          precedence_rank?: number | null
          rule_name?: string | null
          rule_type?: string | null
          scope_campus?: string | null
          scope_country?: string | null
          scope_intake?: string | null
          scope_program_category?: string | null
          scope_program_code?: string | null
          scope_promotion_id?: string | null
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
      upi_commission_eligibility_configs: {
        Row: {
          aggregator_id: string | null
          agreement_version_id: string | null
          config_name: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          institution_id: string
          metadata: Json
          notes: string | null
          partnership_route_id: string | null
          status: string
          trigger_params: Json
          trigger_type: string
          updated_at: string
          version_number: number
        }
        Insert: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          config_name: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          institution_id: string
          metadata?: Json
          notes?: string | null
          partnership_route_id?: string | null
          status?: string
          trigger_params?: Json
          trigger_type?: string
          updated_at?: string
          version_number?: number
        }
        Update: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          config_name?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          institution_id?: string
          metadata?: Json
          notes?: string | null
          partnership_route_id?: string | null
          status?: string
          trigger_params?: Json
          trigger_type?: string
          updated_at?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_eligibility_configs_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_eligibility_configs_agreement_version_id_fkey"
            columns: ["agreement_version_id"]
            isOneToOne: false
            referencedRelation: "upi_agreement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_eligibility_configs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_eligibility_configs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_eligibility_configs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_eligibility_configs_partnership_route_id_fkey"
            columns: ["partnership_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_hold_reasons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      upi_commission_periods: {
        Row: {
          code: string
          description: string | null
          is_active: boolean
          label: string
          sort_order: number
        }
        Insert: {
          code: string
          description?: string | null
          is_active?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          code?: string
          description?: string | null
          is_active?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      upi_commission_students: {
        Row: {
          aggregator_id: string | null
          agreement_version_id: string | null
          amended_expected_amount: number | null
          amount_outstanding: number | null
          amount_received: number
          approved_amount: number | null
          base_currency: string | null
          billing_profile_id: string | null
          block_notes: string | null
          block_reason: string | null
          campus: string | null
          carried_from_cycle_id: string | null
          carry_forward_reason: string | null
          carry_forward_to_cycle_id: string | null
          cas_issued_date: string | null
          channel_type: string | null
          claim_cycle_id: string
          claim_status: string | null
          clawback_amount: number | null
          clawback_status: string | null
          client_id: string | null
          commission_amount: number | null
          commission_calculated_date: string | null
          commission_id: string | null
          commission_paid_date: string | null
          commission_period_code: string | null
          commission_period_label: string | null
          commission_rate_applied: number | null
          commission_snapshot_id: string | null
          commission_status: string | null
          consent_form_date: string | null
          consent_form_submitted: boolean | null
          consent_form_withdrawn: boolean | null
          consent_withdrawal_before_sp: boolean | null
          consent_withdrawal_date: string | null
          country_of_origin: string | null
          created_at: string | null
          eligibility_config_id: string | null
          eligibility_date: string | null
          eligibility_status: string | null
          enrollment_confirmed_date: string | null
          enrollment_status: string | null
          expected_amount: number | null
          expected_claim_date: string | null
          hold_notes: string | null
          hold_reason: string | null
          hold_status: string | null
          id: string
          institution_id: string | null
          institution_reference_number: string | null
          institution_validation_notes: string | null
          intake_month: string | null
          intake_term: string | null
          intake_year: number | null
          invoice_currency: string | null
          invoice_id: string | null
          is_carried_forward: boolean | null
          is_full_time: boolean | null
          last_receipt_id: string | null
          matched_rule_id: string | null
          metadata: Json | null
          nationality: string | null
          partnership_route_id: string | null
          passport_number: string | null
          payment_status: string | null
          program_duration: string | null
          program_level: string | null
          program_name: string
          receipt_currency: string | null
          registered_credits: number | null
          remittance_reference_number: string | null
          snapshot_currency: string | null
          student_email: string | null
          student_id_at_institution: string | null
          student_name: string
          study_permit_approved_date: string | null
          study_permit_expiry: string | null
          study_permit_number: string | null
          submitted_by_agency_date: string | null
          tuition_amount: number | null
          tuition_currency: string | null
          tuition_full_payment_date: string | null
          tuition_paid_amount: number | null
          tuition_paid_date: string | null
          tuition_payment_plan: boolean | null
          updated_at: string | null
          validated_by_institution_date: string | null
        }
        Insert: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          amended_expected_amount?: number | null
          amount_outstanding?: number | null
          amount_received?: number
          approved_amount?: number | null
          base_currency?: string | null
          billing_profile_id?: string | null
          block_notes?: string | null
          block_reason?: string | null
          campus?: string | null
          carried_from_cycle_id?: string | null
          carry_forward_reason?: string | null
          carry_forward_to_cycle_id?: string | null
          cas_issued_date?: string | null
          channel_type?: string | null
          claim_cycle_id: string
          claim_status?: string | null
          clawback_amount?: number | null
          clawback_status?: string | null
          client_id?: string | null
          commission_amount?: number | null
          commission_calculated_date?: string | null
          commission_id?: string | null
          commission_paid_date?: string | null
          commission_period_code?: string | null
          commission_period_label?: string | null
          commission_rate_applied?: number | null
          commission_snapshot_id?: string | null
          commission_status?: string | null
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          consent_form_withdrawn?: boolean | null
          consent_withdrawal_before_sp?: boolean | null
          consent_withdrawal_date?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          eligibility_config_id?: string | null
          eligibility_date?: string | null
          eligibility_status?: string | null
          enrollment_confirmed_date?: string | null
          enrollment_status?: string | null
          expected_amount?: number | null
          expected_claim_date?: string | null
          hold_notes?: string | null
          hold_reason?: string | null
          hold_status?: string | null
          id?: string
          institution_id?: string | null
          institution_reference_number?: string | null
          institution_validation_notes?: string | null
          intake_month?: string | null
          intake_term?: string | null
          intake_year?: number | null
          invoice_currency?: string | null
          invoice_id?: string | null
          is_carried_forward?: boolean | null
          is_full_time?: boolean | null
          last_receipt_id?: string | null
          matched_rule_id?: string | null
          metadata?: Json | null
          nationality?: string | null
          partnership_route_id?: string | null
          passport_number?: string | null
          payment_status?: string | null
          program_duration?: string | null
          program_level?: string | null
          program_name: string
          receipt_currency?: string | null
          registered_credits?: number | null
          remittance_reference_number?: string | null
          snapshot_currency?: string | null
          student_email?: string | null
          student_id_at_institution?: string | null
          student_name: string
          study_permit_approved_date?: string | null
          study_permit_expiry?: string | null
          study_permit_number?: string | null
          submitted_by_agency_date?: string | null
          tuition_amount?: number | null
          tuition_currency?: string | null
          tuition_full_payment_date?: string | null
          tuition_paid_amount?: number | null
          tuition_paid_date?: string | null
          tuition_payment_plan?: boolean | null
          updated_at?: string | null
          validated_by_institution_date?: string | null
        }
        Update: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          amended_expected_amount?: number | null
          amount_outstanding?: number | null
          amount_received?: number
          approved_amount?: number | null
          base_currency?: string | null
          billing_profile_id?: string | null
          block_notes?: string | null
          block_reason?: string | null
          campus?: string | null
          carried_from_cycle_id?: string | null
          carry_forward_reason?: string | null
          carry_forward_to_cycle_id?: string | null
          cas_issued_date?: string | null
          channel_type?: string | null
          claim_cycle_id?: string
          claim_status?: string | null
          clawback_amount?: number | null
          clawback_status?: string | null
          client_id?: string | null
          commission_amount?: number | null
          commission_calculated_date?: string | null
          commission_id?: string | null
          commission_paid_date?: string | null
          commission_period_code?: string | null
          commission_period_label?: string | null
          commission_rate_applied?: number | null
          commission_snapshot_id?: string | null
          commission_status?: string | null
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          consent_form_withdrawn?: boolean | null
          consent_withdrawal_before_sp?: boolean | null
          consent_withdrawal_date?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          eligibility_config_id?: string | null
          eligibility_date?: string | null
          eligibility_status?: string | null
          enrollment_confirmed_date?: string | null
          enrollment_status?: string | null
          expected_amount?: number | null
          expected_claim_date?: string | null
          hold_notes?: string | null
          hold_reason?: string | null
          hold_status?: string | null
          id?: string
          institution_id?: string | null
          institution_reference_number?: string | null
          institution_validation_notes?: string | null
          intake_month?: string | null
          intake_term?: string | null
          intake_year?: number | null
          invoice_currency?: string | null
          invoice_id?: string | null
          is_carried_forward?: boolean | null
          is_full_time?: boolean | null
          last_receipt_id?: string | null
          matched_rule_id?: string | null
          metadata?: Json | null
          nationality?: string | null
          partnership_route_id?: string | null
          passport_number?: string | null
          payment_status?: string | null
          program_duration?: string | null
          program_level?: string | null
          program_name?: string
          receipt_currency?: string | null
          registered_credits?: number | null
          remittance_reference_number?: string | null
          snapshot_currency?: string | null
          student_email?: string | null
          student_id_at_institution?: string | null
          student_name?: string
          study_permit_approved_date?: string | null
          study_permit_expiry?: string | null
          study_permit_number?: string | null
          submitted_by_agency_date?: string | null
          tuition_amount?: number | null
          tuition_currency?: string | null
          tuition_full_payment_date?: string | null
          tuition_paid_amount?: number | null
          tuition_paid_date?: string | null
          tuition_payment_plan?: boolean | null
          updated_at?: string | null
          validated_by_institution_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_students_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_agreement_version_id_fkey"
            columns: ["agreement_version_id"]
            isOneToOne: false
            referencedRelation: "upi_agreement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_billing_profile_id_fkey"
            columns: ["billing_profile_id"]
            isOneToOne: false
            referencedRelation: "upi_billing_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_claim_cycle_id_fkey"
            columns: ["claim_cycle_id"]
            isOneToOne: false
            referencedRelation: "upi_claim_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_commission_snapshot_id_fkey"
            columns: ["commission_snapshot_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_eligibility_config_id_fkey"
            columns: ["eligibility_config_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_eligibility_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_last_receipt_id_fkey"
            columns: ["last_receipt_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_last_receipt_id_fkey"
            columns: ["last_receipt_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipts_in_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_matched_rule_id_fkey"
            columns: ["matched_rule_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_partnership_route_id_fkey"
            columns: ["partnership_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_snapshots: {
        Row: {
          aggregator_id: string | null
          agreement_version_id: string | null
          breakdown_json: Json
          calculated_at: string
          campus: string | null
          channel_type: string | null
          commission_id: string | null
          country: string | null
          currency: string | null
          eligibility_date: string | null
          expected_amount: number | null
          id: string
          input_json: Json
          institution_id: string | null
          intake_term: string | null
          matched_rule_id: string | null
          metadata: Json
          partnership_route_id: string | null
          program_category: string | null
          program_name: string | null
          rules_json: Json
          snapshot_payload: Json
          student_commission_id: string | null
          total_amount: number | null
        }
        Insert: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          breakdown_json?: Json
          calculated_at?: string
          campus?: string | null
          channel_type?: string | null
          commission_id?: string | null
          country?: string | null
          currency?: string | null
          eligibility_date?: string | null
          expected_amount?: number | null
          id?: string
          input_json?: Json
          institution_id?: string | null
          intake_term?: string | null
          matched_rule_id?: string | null
          metadata?: Json
          partnership_route_id?: string | null
          program_category?: string | null
          program_name?: string | null
          rules_json?: Json
          snapshot_payload?: Json
          student_commission_id?: string | null
          total_amount?: number | null
        }
        Update: {
          aggregator_id?: string | null
          agreement_version_id?: string | null
          breakdown_json?: Json
          calculated_at?: string
          campus?: string | null
          channel_type?: string | null
          commission_id?: string | null
          country?: string | null
          currency?: string | null
          eligibility_date?: string | null
          expected_amount?: number | null
          id?: string
          input_json?: Json
          institution_id?: string | null
          intake_term?: string | null
          matched_rule_id?: string | null
          metadata?: Json
          partnership_route_id?: string | null
          program_category?: string | null
          program_name?: string | null
          rules_json?: Json
          snapshot_payload?: Json
          student_commission_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_snapshots_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_agreement_version_id_fkey"
            columns: ["agreement_version_id"]
            isOneToOne: false
            referencedRelation: "upi_agreement_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_matched_rule_id_fkey"
            columns: ["matched_rule_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_partnership_route_id_fkey"
            columns: ["partnership_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_client_commission_status"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_snapshots_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_commission_student_receipt_ledger"
            referencedColumns: ["student_commission_id"]
          },
        ]
      }
      upi_commission_transfer_events: {
        Row: {
          created_at: string
          event_status: string
          from_institution_id: string | null
          from_route_id: string | null
          id: string
          initiated_at: string
          initiated_by: string | null
          institution_id: string
          metadata: Json
          notes: string | null
          outcome: string | null
          replacement_student_commission_id: string | null
          resolved_at: string | null
          source_student_commission_id: string
          to_institution_id: string | null
          to_route_id: string | null
          transfer_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_status?: string
          from_institution_id?: string | null
          from_route_id?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          institution_id: string
          metadata?: Json
          notes?: string | null
          outcome?: string | null
          replacement_student_commission_id?: string | null
          resolved_at?: string | null
          source_student_commission_id: string
          to_institution_id?: string | null
          to_route_id?: string | null
          transfer_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_status?: string
          from_institution_id?: string | null
          from_route_id?: string | null
          id?: string
          initiated_at?: string
          initiated_by?: string | null
          institution_id?: string
          metadata?: Json
          notes?: string | null
          outcome?: string | null
          replacement_student_commission_id?: string | null
          resolved_at?: string | null
          source_student_commission_id?: string
          to_institution_id?: string | null
          to_route_id?: string | null
          transfer_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_transfer_event_replacement_student_commissi_fkey"
            columns: ["replacement_student_commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_event_replacement_student_commissi_fkey"
            columns: ["replacement_student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_client_commission_status"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_event_replacement_student_commissi_fkey"
            columns: ["replacement_student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_commission_student_receipt_ledger"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_event_source_student_commission_id_fkey"
            columns: ["source_student_commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_event_source_student_commission_id_fkey"
            columns: ["source_student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_client_commission_status"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_event_source_student_commission_id_fkey"
            columns: ["source_student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_commission_student_receipt_ledger"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_from_institution_id_fkey"
            columns: ["from_institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_from_institution_id_fkey"
            columns: ["from_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_from_institution_id_fkey"
            columns: ["from_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_from_route_id_fkey"
            columns: ["from_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_to_institution_id_fkey"
            columns: ["to_institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_to_institution_id_fkey"
            columns: ["to_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_to_institution_id_fkey"
            columns: ["to_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_transfer_events_to_route_id_fkey"
            columns: ["to_route_id"]
            isOneToOne: false
            referencedRelation: "upi_partnership_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_invoices: {
        Row: {
          agency_address: string | null
          agency_email: string | null
          agency_gst_hst_number: string | null
          agency_name: string | null
          agency_phone: string | null
          amount_outstanding: number | null
          amount_received: number
          approved_date: string | null
          base_currency: string | null
          billing_profile_id: string | null
          claim_cycle_id: string | null
          commission_id: string | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          eligible_students: number | null
          id: string
          institution_address: string | null
          institution_contact: string | null
          institution_email: string | null
          institution_id: string | null
          institution_name: string | null
          internal_notes: string | null
          invoice_currency: string | null
          invoice_date: string
          invoice_number: string
          last_receipt_id: string | null
          metadata: Json | null
          notes: string | null
          overdue_since: string | null
          paid_date: string | null
          payment_method: string | null
          payment_received_amount: number | null
          payment_received_date: string | null
          payment_reference: string | null
          receipt_currency: string | null
          short_paid: boolean
          status: string | null
          submitted_date: string | null
          subtotal: number
          tax_amount: number | null
          tax_type: string | null
          total_amount: number
          total_students: number | null
          updated_at: string | null
        }
        Insert: {
          agency_address?: string | null
          agency_email?: string | null
          agency_gst_hst_number?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          amount_outstanding?: number | null
          amount_received?: number
          approved_date?: string | null
          base_currency?: string | null
          billing_profile_id?: string | null
          claim_cycle_id?: string | null
          commission_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          eligible_students?: number | null
          id?: string
          institution_address?: string | null
          institution_contact?: string | null
          institution_email?: string | null
          institution_id?: string | null
          institution_name?: string | null
          internal_notes?: string | null
          invoice_currency?: string | null
          invoice_date: string
          invoice_number: string
          last_receipt_id?: string | null
          metadata?: Json | null
          notes?: string | null
          overdue_since?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_received_amount?: number | null
          payment_received_date?: string | null
          payment_reference?: string | null
          receipt_currency?: string | null
          short_paid?: boolean
          status?: string | null
          submitted_date?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_type?: string | null
          total_amount?: number
          total_students?: number | null
          updated_at?: string | null
        }
        Update: {
          agency_address?: string | null
          agency_email?: string | null
          agency_gst_hst_number?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          amount_outstanding?: number | null
          amount_received?: number
          approved_date?: string | null
          base_currency?: string | null
          billing_profile_id?: string | null
          claim_cycle_id?: string | null
          commission_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          eligible_students?: number | null
          id?: string
          institution_address?: string | null
          institution_contact?: string | null
          institution_email?: string | null
          institution_id?: string | null
          institution_name?: string | null
          internal_notes?: string | null
          invoice_currency?: string | null
          invoice_date?: string
          invoice_number?: string
          last_receipt_id?: string | null
          metadata?: Json | null
          notes?: string | null
          overdue_since?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_received_amount?: number | null
          payment_received_date?: string | null
          payment_reference?: string | null
          receipt_currency?: string | null
          short_paid?: boolean
          status?: string | null
          submitted_date?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_type?: string | null
          total_amount?: number
          total_students?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_invoices_billing_profile_id_fkey"
            columns: ["billing_profile_id"]
            isOneToOne: false
            referencedRelation: "upi_billing_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_claim_cycle_id_fkey"
            columns: ["claim_cycle_id"]
            isOneToOne: false
            referencedRelation: "upi_claim_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_last_receipt_id_fkey"
            columns: ["last_receipt_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_last_receipt_id_fkey"
            columns: ["last_receipt_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipts_in_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_invoice_line_items: {
        Row: {
          amount_received: number
          commission_period_code: string | null
          commission_rate: number | null
          description: string
          id: string
          intake_term: string | null
          invoice_id: string
          line_amount: number
          line_outstanding: number | null
          notes: string | null
          program_name: string | null
          snapshot_id: string | null
          sort_order: number | null
          student_id: string | null
          student_name: string | null
          tuition_amount: number | null
        }
        Insert: {
          amount_received?: number
          commission_period_code?: string | null
          commission_rate?: number | null
          description: string
          id?: string
          intake_term?: string | null
          invoice_id: string
          line_amount: number
          line_outstanding?: number | null
          notes?: string | null
          program_name?: string | null
          snapshot_id?: string | null
          sort_order?: number | null
          student_id?: string | null
          student_name?: string | null
          tuition_amount?: number | null
        }
        Update: {
          amount_received?: number
          commission_period_code?: string | null
          commission_rate?: number | null
          description?: string
          id?: string
          intake_term?: string | null
          invoice_id?: string
          line_amount?: number
          line_outstanding?: number | null
          notes?: string | null
          program_name?: string | null
          snapshot_id?: string | null
          sort_order?: number | null
          student_id?: string | null
          student_name?: string | null
          tuition_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_invoice_line_items_commission_period_code_fkey"
            columns: ["commission_period_code"]
            isOneToOne: false
            referencedRelation: "upi_commission_periods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipt_open_items"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_client_commission_status"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_commission_student_receipt_ledger"
            referencedColumns: ["student_commission_id"]
          },
        ]
      }
      upi_commission_receipts: {
        Row: {
          accounting_journal_id: string | null
          aggregator_id: string | null
          amount_allocated: number
          bank_reference: string | null
          base_amount: number | null
          base_currency: string
          context_institution_id: string | null
          created_at: string
          created_by: string | null
          exchange_rate: number
          fx_review_notes: string | null
          fx_review_status: string
          fx_reviewed_at: string | null
          fx_reviewed_by: string | null
          id: string
          institution_id: string | null
          metadata: Json
          notes: string | null
          payer_id: string
          payer_name_snapshot: string
          payer_type: string
          payment_method: string | null
          posted_at: string | null
          posted_by: string | null
          posting_date: string | null
          ready_at: string | null
          ready_by: string | null
          receipt_amount: number
          receipt_currency: string
          receipt_date: string
          receipt_number: string
          remittance_batch_id: string | null
          remittance_reference: string | null
          status: string
          unallocated_amount: number
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          accounting_journal_id?: string | null
          aggregator_id?: string | null
          amount_allocated?: number
          bank_reference?: string | null
          base_amount?: number | null
          base_currency?: string
          context_institution_id?: string | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          fx_review_notes?: string | null
          fx_review_status?: string
          fx_reviewed_at?: string | null
          fx_reviewed_by?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json
          notes?: string | null
          payer_id: string
          payer_name_snapshot: string
          payer_type: string
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          ready_at?: string | null
          ready_by?: string | null
          receipt_amount: number
          receipt_currency?: string
          receipt_date?: string
          receipt_number: string
          remittance_batch_id?: string | null
          remittance_reference?: string | null
          status?: string
          unallocated_amount?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          accounting_journal_id?: string | null
          aggregator_id?: string | null
          amount_allocated?: number
          bank_reference?: string | null
          base_amount?: number | null
          base_currency?: string
          context_institution_id?: string | null
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          fx_review_notes?: string | null
          fx_review_status?: string
          fx_reviewed_at?: string | null
          fx_reviewed_by?: string | null
          id?: string
          institution_id?: string | null
          metadata?: Json
          notes?: string | null
          payer_id?: string
          payer_name_snapshot?: string
          payer_type?: string
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          ready_at?: string | null
          ready_by?: string | null
          receipt_amount?: number
          receipt_currency?: string
          receipt_date?: string
          receipt_number?: string
          remittance_batch_id?: string | null
          remittance_reference?: string | null
          status?: string
          unallocated_amount?: number
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_receipts_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_remittance_batch_id_fkey"
            columns: ["remittance_batch_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_remittance_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_receipt_invoice_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          amount_allocated: number
          currency: string
          id: string
          invoice_id: string
          receipt_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          amount_allocated: number
          currency?: string
          id?: string
          invoice_id: string
          receipt_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          amount_allocated?: number
          currency?: string
          id?: string
          invoice_id?: string
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_receipt_invoice_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_invoice_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipt_open_items"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_invoice_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_invoice_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipts_in_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_receipt_student_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          allocation_method: string
          amount_allocated: number
          currency: string
          id: string
          invoice_allocation_id: string
          invoice_line_item_id: string | null
          receipt_id: string
          snapshot_id: string | null
          student_commission_id: string
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_method?: string
          amount_allocated: number
          currency?: string
          id?: string
          invoice_allocation_id: string
          invoice_line_item_id?: string | null
          receipt_id: string
          snapshot_id?: string | null
          student_commission_id: string
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          allocation_method?: string
          amount_allocated?: number
          currency?: string
          id?: string
          invoice_allocation_id?: string
          invoice_line_item_id?: string | null
          receipt_id?: string
          snapshot_id?: string | null
          student_commission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_receipt_student_alloc_invoice_allocation_id_fkey"
            columns: ["invoice_allocation_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipt_invoice_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_alloc_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_alloc_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_client_commission_status"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_alloc_student_commission_id_fkey"
            columns: ["student_commission_id"]
            isOneToOne: false
            referencedRelation: "v_commission_student_receipt_ledger"
            referencedColumns: ["student_commission_id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_alloca_invoice_line_item_id_fkey"
            columns: ["invoice_line_item_id"]
            isOneToOne: false
            referencedRelation: "upi_invoice_line_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipts_in_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_student_allocations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_receipt_attachments: {
        Row: {
          attachment_type: string
          created_at: string
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          receipt_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          attachment_type: string
          created_at?: string
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          receipt_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          attachment_type?: string
          created_at?: string
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          receipt_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_receipt_attachments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipt_attachments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "v_commission_receipts_in_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_commission_remittance_batches: {
        Row: {
          aggregator_id: string | null
          batch_reference: string
          created_at: string
          currency: string
          id: string
          institution_id: string | null
          notes: string | null
          payer_type: string
          received_date: string | null
          status: string
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          aggregator_id?: string | null
          batch_reference: string
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          payer_type: string
          received_date?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          aggregator_id?: string | null
          batch_reference?: string
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          payer_type?: string
          received_date?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_remittance_batches_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_remittance_batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_remittance_batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_remittance_batches_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_partnership_routes: {
        Row: {
          aggregator_id: string | null
          aggregator_institution_code: string | null
          agreement_id: string | null
          application_fee: number | null
          application_fee_waiver: boolean
          application_fee_waiver_from: string | null
          application_fee_waiver_to: string | null
          application_portal_url: string | null
          bonus_notes: string | null
          channel_type: string
          commission_currency: string | null
          commission_model: string | null
          commission_rate: number | null
          commission_slabs: Json
          created_at: string
          default_commission_id: string | null
          display_name: string
          estimated_payout_days: number | null
          id: string
          institution_id: string
          intakes_covered: string[] | null
          is_default_route: boolean
          metadata: Json
          notes: string | null
          payment_terms: string | null
          priority_rank: number
          processing_sla_days: number | null
          program_levels_covered: string[] | null
          route_code: string | null
          status: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          aggregator_id?: string | null
          aggregator_institution_code?: string | null
          agreement_id?: string | null
          application_fee?: number | null
          application_fee_waiver?: boolean
          application_fee_waiver_from?: string | null
          application_fee_waiver_to?: string | null
          application_portal_url?: string | null
          bonus_notes?: string | null
          channel_type: string
          commission_currency?: string | null
          commission_model?: string | null
          commission_rate?: number | null
          commission_slabs?: Json
          created_at?: string
          default_commission_id?: string | null
          display_name: string
          estimated_payout_days?: number | null
          id?: string
          institution_id: string
          intakes_covered?: string[] | null
          is_default_route?: boolean
          metadata?: Json
          notes?: string | null
          payment_terms?: string | null
          priority_rank?: number
          processing_sla_days?: number | null
          program_levels_covered?: string[] | null
          route_code?: string | null
          status?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          aggregator_id?: string | null
          aggregator_institution_code?: string | null
          agreement_id?: string | null
          application_fee?: number | null
          application_fee_waiver?: boolean
          application_fee_waiver_from?: string | null
          application_fee_waiver_to?: string | null
          application_portal_url?: string | null
          bonus_notes?: string | null
          channel_type?: string
          commission_currency?: string | null
          commission_model?: string | null
          commission_rate?: number | null
          commission_slabs?: Json
          created_at?: string
          default_commission_id?: string | null
          display_name?: string
          estimated_payout_days?: number | null
          id?: string
          institution_id?: string
          intakes_covered?: string[] | null
          is_default_route?: boolean
          metadata?: Json
          notes?: string | null
          payment_terms?: string | null
          priority_rank?: number
          processing_sla_days?: number | null
          program_levels_covered?: string[] | null
          route_code?: string | null
          status?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_partnership_routes_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_partnership_routes_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "upi_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_partnership_routes_default_commission_id_fkey"
            columns: ["default_commission_id"]
            isOneToOne: false
            referencedRelation: "upi_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_partnership_routes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_partnership_routes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_partnership_routes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_aggregators: {
        Row: {
          address: string | null
          agreement_reference: string | null
          agreement_status: string | null
          agreement_valid_from: string | null
          agreement_valid_to: string | null
          billing_email: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          countries_served: string[] | null
          country_name: string | null
          created_at: string
          default_currency: string | null
          default_payment_terms: string | null
          default_portal_url: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          metadata: Json
          name: string
          notes: string | null
          short_code: string | null
          tax_id: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address?: string | null
          agreement_reference?: string | null
          agreement_status?: string | null
          agreement_valid_from?: string | null
          agreement_valid_to?: string | null
          billing_email?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          countries_served?: string[] | null
          country_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_portal_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          short_code?: string | null
          tax_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address?: string | null
          agreement_reference?: string | null
          agreement_status?: string | null
          agreement_valid_from?: string | null
          agreement_valid_to?: string | null
          billing_email?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          countries_served?: string[] | null
          country_name?: string | null
          created_at?: string
          default_currency?: string | null
          default_payment_terms?: string | null
          default_portal_url?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          short_code?: string | null
          tax_id?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
    };
    Views: {
      v_client_commission_status: {
        Row: {
          claim_status: string | null
          client_id: string | null
          commission_period_code: string | null
          eligibility_date: string | null
          eligibility_status: string | null
          expected_claim_date: string | null
          hold_reason: string | null
          hold_status: string | null
          institution_id: string | null
          institution_name: string | null
          intake_term: string | null
          legacy_status: string | null
          payment_status: string | null
          program_name: string | null
          student_commission_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      v_commission_receipt_open_items: {
        Row: {
          amount_outstanding: number | null
          amount_received: number | null
          currency: string | null
          institution_id: string | null
          invoice_id: string | null
          invoice_number: string | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          amount_outstanding?: never
          amount_received?: number | null
          currency?: string | null
          institution_id?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          amount_outstanding?: never
          amount_received?: number | null
          currency?: string | null
          institution_id?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
      v_commission_receipts_in_progress: {
        Row: {
          accounting_journal_id: string | null
          aggregator_id: string | null
          amount_allocated: number | null
          bank_reference: string | null
          base_amount: number | null
          base_currency: string | null
          context_institution_id: string | null
          created_at: string | null
          created_by: string | null
          exchange_rate: number | null
          fx_review_notes: string | null
          fx_review_status: string | null
          fx_reviewed_at: string | null
          fx_reviewed_by: string | null
          id: string | null
          institution_id: string | null
          metadata: Json | null
          notes: string | null
          payer_id: string | null
          payer_name_snapshot: string | null
          payer_type: string | null
          payment_method: string | null
          posted_at: string | null
          posted_by: string | null
          posting_date: string | null
          ready_at: string | null
          ready_by: string | null
          receipt_amount: number | null
          receipt_currency: string | null
          receipt_date: string | null
          receipt_number: string | null
          remittance_batch_id: string | null
          remittance_reference: string | null
          status: string | null
          unallocated_amount: number | null
          updated_at: string | null
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          accounting_journal_id?: string | null
          aggregator_id?: string | null
          amount_allocated?: number | null
          bank_reference?: string | null
          base_amount?: number | null
          base_currency?: string | null
          context_institution_id?: string | null
          created_at?: string | null
          created_by?: string | null
          exchange_rate?: number | null
          fx_review_notes?: string | null
          fx_review_status?: string | null
          fx_reviewed_at?: string | null
          fx_reviewed_by?: string | null
          id?: string | null
          institution_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payer_id?: string | null
          payer_name_snapshot?: string | null
          payer_type?: string | null
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          ready_at?: string | null
          ready_by?: string | null
          receipt_amount?: number | null
          receipt_currency?: string | null
          receipt_date?: string | null
          receipt_number?: string | null
          remittance_batch_id?: string | null
          remittance_reference?: string | null
          status?: string | null
          unallocated_amount?: number | null
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          accounting_journal_id?: string | null
          aggregator_id?: string | null
          amount_allocated?: number | null
          bank_reference?: string | null
          base_amount?: number | null
          base_currency?: string | null
          context_institution_id?: string | null
          created_at?: string | null
          created_by?: string | null
          exchange_rate?: number | null
          fx_review_notes?: string | null
          fx_review_status?: string | null
          fx_reviewed_at?: string | null
          fx_reviewed_by?: string | null
          id?: string | null
          institution_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payer_id?: string | null
          payer_name_snapshot?: string | null
          payer_type?: string | null
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          ready_at?: string | null
          ready_by?: string | null
          receipt_amount?: number | null
          receipt_currency?: string | null
          receipt_date?: string | null
          receipt_number?: string | null
          remittance_batch_id?: string | null
          remittance_reference?: string | null
          status?: string | null
          unallocated_amount?: number | null
          updated_at?: string | null
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_receipts_aggregator_id_fkey"
            columns: ["aggregator_id"]
            isOneToOne: false
            referencedRelation: "upi_aggregators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_context_institution_id_fkey"
            columns: ["context_institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_receipts_remittance_batch_id_fkey"
            columns: ["remittance_batch_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_remittance_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      v_commission_student_receipt_ledger: {
        Row: {
          amount_outstanding: number | null
          amount_received: number | null
          claim_status: string | null
          eligibility_status: string | null
          expected_amount: number | null
          institution_id: string | null
          payment_status: string | null
          student_commission_id: string | null
          student_name: string | null
        }
        Insert: {
          amount_outstanding?: never
          amount_received?: number | null
          claim_status?: string | null
          eligibility_status?: string | null
          expected_amount?: never
          institution_id?: string | null
          payment_status?: string | null
          student_commission_id?: string | null
          student_name?: string | null
        }
        Update: {
          amount_outstanding?: never
          amount_received?: number | null
          claim_status?: string | null
          eligibility_status?: string | null
          expected_amount?: never
          institution_id?: string | null
          payment_status?: string | null
          student_commission_id?: string | null
          student_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_country_unmapped"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "v_upi_institution_profile_readiness"
            referencedColumns: ["id"]
          },
        ]
      }
    };
    Functions: {
      fn_resolve_commission_rule: {
        Args: {
          p_as_of?: string
          p_campus?: string
          p_country?: string
          p_institution_id: string
          p_intake?: string
          p_partnership_route_id?: string
          p_program_category?: string
          p_program_code?: string
          p_promotion_id?: string
        }
        Returns: {
          agreement_version_id: string
          base_rate_percent: number
          commission_id: string
          commission_name: string
          currency: string
          match_level: string
          matched_rule_id: string
        }[]
      }
      fn_evaluate_eligibility: {
        Args: { p_student_commission_id: string }
        Returns: Json
      }
      fn_create_commission_snapshot: {
        Args: {
          p_breakdown?: Json
          p_expected_amount?: number
          p_input?: Json
          p_rules?: Json
          p_student_commission_id: string
        }
        Returns: string
      }
      fn_mark_student_eligible: {
        Args: { p_eligibility_date?: string; p_student_commission_id: string }
        Returns: string
      }
      fn_publish_commission_rules: {
        Args: { p_commission_id: string; p_published_by?: string }
        Returns: undefined
      }
      fn_apply_commission_hold: {
        Args: {
          p_expected_claim_date?: string
          p_hold_notes?: string
          p_hold_reason: string
          p_student_commission_id: string
        }
        Returns: undefined
      }
      fn_release_commission_hold: {
        Args: { p_student_commission_id: string }
        Returns: undefined
      }
      fn_initiate_commission_transfer: {
        Args: {
          p_notes?: string
          p_source_student_commission_id: string
          p_to_institution_id?: string
          p_to_route_id?: string
          p_transfer_reason?: string
        }
        Returns: string
      }
      fn_create_replacement_commission: {
        Args: {
          p_claim_cycle_id: string
          p_commission_period_code?: string
          p_partnership_route_id?: string
          p_source_student_commission_id: string
        }
        Returns: string
      }
      fn_process_transfer_outcome: {
        Args: {
          p_amended_amount?: number
          p_event_id: string
          p_outcome: string
          p_replacement_student_commission_id?: string
        }
        Returns: undefined
      }
// NOT FOUND IN types.ts: is_commission_admin
      fn_create_commission_receipt: {
        Args: {
          p_bank_reference?: string
          p_context_institution_id?: string
          p_exchange_rate?: number
          p_metadata?: Json
          p_notes?: string
          p_payer_id: string
          p_payer_type: string
          p_payment_method?: string
          p_receipt_amount: number
          p_receipt_currency?: string
          p_receipt_date?: string
          p_remittance_batch_id?: string
          p_remittance_reference?: string
        }
        Returns: string
      }
      fn_update_commission_receipt: {
        Args: {
          p_bank_reference?: string
          p_exchange_rate?: number
          p_metadata?: Json
          p_notes?: string
          p_payment_method?: string
          p_receipt_amount?: number
          p_receipt_currency?: string
          p_receipt_date?: string
          p_receipt_id: string
          p_remittance_reference?: string
        }
        Returns: undefined
      }
      fn_upsert_receipt_invoice_allocations: {
        Args: { p_allocations: Json; p_receipt_id: string }
        Returns: undefined
      }
      fn_upsert_receipt_student_allocations: {
        Args: { p_allocations: Json; p_receipt_id: string }
        Returns: undefined
      }
      fn_approve_receipt_fx_review: {
        Args: { p_notes?: string; p_receipt_id: string }
        Returns: undefined
      }
      fn_mark_receipt_ready: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
      fn_post_commission_receipt: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
      fn_void_commission_receipt: {
        Args: { p_reason?: string; p_receipt_id: string }
        Returns: undefined
      }
// NOT FOUND IN types.ts: fn_reopen_receipt
// NOT FOUND IN types.ts: fn_receipt_summary
      fn_register_receipt_attachment: {
        Args: {
          p_attachment_type: string
          p_file_name: string
          p_file_size_bytes?: number
          p_mime_type?: string
          p_receipt_id: string
          p_storage_path: string
        }
        Returns: string
      }
      fn_sync_student_from_receipts: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      fn_sync_invoice_from_receipts: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      fn_student_commission_expected: {
        Args: { p_student_id: string }
        Returns: number
      }
      fn_validate_receipt_allocations: {
        Args: { p_receipt_id: string }
        Returns: undefined
      }
// NOT FOUND IN types.ts: fn_assert_commission_receipt_actor
      fn_create_remittance_batch: {
        Args: {
          p_aggregator_id: string
          p_aggregator_reference_number?: string
          p_amount_expected?: number
          p_batch_reference: string
          p_commission_period_code?: string
          p_currency?: string
          p_notes?: string
          p_received_date?: string
        }
        Returns: string
      }
      fn_dispute_remittance_batch: {
        Args: {
          p_batch_id: string
          p_dispute_notes?: string
          p_dispute_reason: string
        }
        Returns: undefined
      }
      fn_resolve_batch_dispute: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      fn_register_batch_statement: {
        Args: {
          p_batch_id: string
          p_file_name: string
          p_file_size_bytes?: number
          p_mime_type?: string
          p_storage_path: string
        }
        Returns: string
      }
      fn_create_aggregator_invoice: {
        Args: {
          p_aggregator_id: string
          p_commission_period_code?: string
          p_invoice_date?: string
          p_invoice_number: string
          p_notes?: string
        }
        Returns: string
      }
      fn_add_invoices_to_aggregator_invoice: {
        Args: {
          p_aggregator_invoice_id: string
          p_institution_invoice_ids: string[]
        }
        Returns: undefined
      }
      fn_submit_aggregator_invoice: {
        Args: { p_aggregator_invoice_id: string }
        Returns: undefined
      }
      fn_get_aggregator_workbench_summary: {
        Args: { p_aggregator_id: string; p_commission_period_code?: string }
        Returns: Json
      }
// NOT FOUND IN types.ts: fn_assert_commission_aggregator_actor
// NOT FOUND IN types.ts: fn_refresh_remittance_batch_totals
// NOT FOUND IN types.ts: fn_refresh_aggregator_invoice_totals
    };
  };
};
