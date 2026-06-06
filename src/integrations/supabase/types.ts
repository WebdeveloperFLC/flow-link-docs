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
      accounting_access_audit: {
        Row: {
          action: string
          actor_auth_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          id: string
          module: string
          target_accounting_user_id: string
        }
        Insert: {
          action: string
          actor_auth_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          module: string
          target_accounting_user_id: string
        }
        Update: {
          action?: string
          actor_auth_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          id?: string
          module?: string
          target_accounting_user_id?: string
        }
        Relationships: []
      }
      accounting_ap_bills: {
        Row: {
          approved_by: string | null
          bill_date: string
          bill_number: string
          branch: string | null
          branch_country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          department: string | null
          description: string | null
          due_date: string | null
          entity: string | null
          id: string
          journal_id: string | null
          linked_bank_account_id: string | null
          linked_coa_code: string | null
          linked_expense_coa_code: string | null
          notes: string | null
          outstanding: number | null
          paid_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_proof_path: string | null
          payment_terms: string | null
          reference: string | null
          status: string | null
          subtotal: number | null
          tags: string[] | null
          tax_amount: number | null
          tax_code: string | null
          total_amount: number | null
          updated_at: string
          vendor_category: string | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string
          vendor_phone: string | null
        }
        Insert: {
          approved_by?: string | null
          bill_date: string
          bill_number: string
          branch?: string | null
          branch_country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          journal_id?: string | null
          linked_bank_account_id?: string | null
          linked_coa_code?: string | null
          linked_expense_coa_code?: string | null
          notes?: string | null
          outstanding?: number | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_path?: string | null
          payment_terms?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tax_code?: string | null
          total_amount?: number | null
          updated_at?: string
          vendor_category?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name: string
          vendor_phone?: string | null
        }
        Update: {
          approved_by?: string | null
          bill_date?: string
          bill_number?: string
          branch?: string | null
          branch_country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          journal_id?: string | null
          linked_bank_account_id?: string | null
          linked_coa_code?: string | null
          linked_expense_coa_code?: string | null
          notes?: string | null
          outstanding?: number | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_proof_path?: string | null
          payment_terms?: string | null
          reference?: string | null
          status?: string | null
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tax_code?: string | null
          total_amount?: number | null
          updated_at?: string
          vendor_category?: string | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string
          vendor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ap_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_ap_bills_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "accounting_vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ap_bills_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "accounting_vendors_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_ar_invoices: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          created_by: string | null
          currency: string | null
          due_date: string | null
          entity: string | null
          id: string
          invoice_date: string
          invoice_number: string
          journal_id: string | null
          notes: string | null
          outstanding_balance: number | null
          paid_amount: number | null
          payment_method: string | null
          payment_terms: string | null
          reference: string | null
          service_type: string | null
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          journal_id?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_terms?: string | null
          reference?: string | null
          service_type?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          entity?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          journal_id?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_terms?: string | null
          reference?: string | null
          service_type?: string | null
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_ar_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_ar_invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_ar_invoices_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bank_accounts: {
        Row: {
          account_holder: string | null
          account_number: string | null
          authorised_signatory_ids: string[]
          bank_name: string | null
          branch: string | null
          country: string
          created_at: string
          created_by: string | null
          currency: string
          current_balance: number | null
          entity: string
          iban: string | null
          id: string
          ifsc_code: string | null
          institution_number: string | null
          is_default_payment: boolean | null
          is_default_payroll: boolean | null
          last_reconciled_date: string | null
          linked_coa_code: string | null
          linked_coa_id: string | null
          nickname: string
          notes: string | null
          opening_balance: number | null
          reconciliation_enabled: boolean | null
          reconciliation_status: string | null
          status: string | null
          swift_bic: string | null
          transit_number: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          authorised_signatory_ids?: string[]
          bank_name?: string | null
          branch?: string | null
          country: string
          created_at?: string
          created_by?: string | null
          currency: string
          current_balance?: number | null
          entity: string
          iban?: string | null
          id?: string
          ifsc_code?: string | null
          institution_number?: string | null
          is_default_payment?: boolean | null
          is_default_payroll?: boolean | null
          last_reconciled_date?: string | null
          linked_coa_code?: string | null
          linked_coa_id?: string | null
          nickname: string
          notes?: string | null
          opening_balance?: number | null
          reconciliation_enabled?: boolean | null
          reconciliation_status?: string | null
          status?: string | null
          swift_bic?: string | null
          transit_number?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          authorised_signatory_ids?: string[]
          bank_name?: string | null
          branch?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          current_balance?: number | null
          entity?: string
          iban?: string | null
          id?: string
          ifsc_code?: string | null
          institution_number?: string | null
          is_default_payment?: boolean | null
          is_default_payroll?: boolean | null
          last_reconciled_date?: string | null
          linked_coa_code?: string | null
          linked_coa_id?: string | null
          nickname?: string
          notes?: string | null
          opening_balance?: number | null
          reconciliation_enabled?: boolean | null
          reconciliation_status?: string | null
          status?: string | null
          swift_bic?: string | null
          transit_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bank_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_bank_accounts_linked_coa_id_fkey"
            columns: ["linked_coa_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_card_reconciliation: {
        Row: {
          card_account_id: string | null
          card_account_name: string | null
          card_holder_name: string | null
          card_type: string | null
          closing_balance: number | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          entity: string | null
          generated_journal_id: string | null
          id: string
          imported_at: string | null
          lines: Json | null
          notes: string | null
          opening_balance: number | null
          reconciliation_number: string
          statement_from: string | null
          statement_month: string
          statement_to: string | null
          status: string | null
          total_business: number | null
          total_client_funds: number | null
          total_income: number | null
          total_personal: number | null
          total_transactions: number | null
          total_uncategorised: number | null
          updated_at: string | null
        }
        Insert: {
          card_account_id?: string | null
          card_account_name?: string | null
          card_holder_name?: string | null
          card_type?: string | null
          closing_balance?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          entity?: string | null
          generated_journal_id?: string | null
          id?: string
          imported_at?: string | null
          lines?: Json | null
          notes?: string | null
          opening_balance?: number | null
          reconciliation_number: string
          statement_from?: string | null
          statement_month: string
          statement_to?: string | null
          status?: string | null
          total_business?: number | null
          total_client_funds?: number | null
          total_income?: number | null
          total_personal?: number | null
          total_transactions?: number | null
          total_uncategorised?: number | null
          updated_at?: string | null
        }
        Update: {
          card_account_id?: string | null
          card_account_name?: string | null
          card_holder_name?: string | null
          card_type?: string | null
          closing_balance?: number | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          entity?: string | null
          generated_journal_id?: string | null
          id?: string
          imported_at?: string | null
          lines?: Json | null
          notes?: string | null
          opening_balance?: number | null
          reconciliation_number?: string
          statement_from?: string | null
          statement_month?: string
          statement_to?: string | null
          status?: string | null
          total_business?: number | null
          total_client_funds?: number | null
          total_income?: number | null
          total_personal?: number | null
          total_transactions?: number | null
          total_uncategorised?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_card_reconciliation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_card_reconciliation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_card_reconciliation_generated_journal_id_fkey"
            columns: ["generated_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_clients: {
        Row: {
          account_manager: string | null
          address: string | null
          client_type: string | null
          counselor_id: string | null
          counselor_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          email: string | null
          id: string
          intake: string | null
          lead_source: string | null
          legal_name: string | null
          linked_coa_id: string | null
          linked_crm_client_id: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          segment: string | null
          service_package: string | null
          status: string | null
          tax_id: string | null
          updated_at: string
          visa_category: string | null
        }
        Insert: {
          account_manager?: string | null
          address?: string | null
          client_type?: string | null
          counselor_id?: string | null
          counselor_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          intake?: string | null
          lead_source?: string | null
          legal_name?: string | null
          linked_coa_id?: string | null
          linked_crm_client_id?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          segment?: string | null
          service_package?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
          visa_category?: string | null
        }
        Update: {
          account_manager?: string | null
          address?: string | null
          client_type?: string | null
          counselor_id?: string | null
          counselor_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          intake?: string | null
          lead_source?: string | null
          legal_name?: string | null
          linked_coa_id?: string | null
          linked_crm_client_id?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          segment?: string | null
          service_package?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
          visa_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_clients_linked_coa_id_fkey"
            columns: ["linked_coa_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_coa: {
        Row: {
          ai_category: string | null
          automation_tags: string[] | null
          branch: string | null
          code: string
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_balance: number | null
          description: string | null
          entity_id: string | null
          group_code: string
          id: string
          is_active: boolean | null
          is_postable: boolean
          manual_entries_allowed: boolean | null
          name: string
          normal_balance: string | null
          notes: string | null
          opening_balance: number | null
          parent_id: string | null
          reconciliation_enabled: boolean | null
          reporting_group: string | null
          requires_approval: boolean | null
          sub_type_code: string | null
          tax_code: string | null
          type_code: string | null
          updated_at: string
        }
        Insert: {
          ai_category?: string | null
          automation_tags?: string[] | null
          branch?: string | null
          code: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_balance?: number | null
          description?: string | null
          entity_id?: string | null
          group_code: string
          id?: string
          is_active?: boolean | null
          is_postable?: boolean
          manual_entries_allowed?: boolean | null
          name: string
          normal_balance?: string | null
          notes?: string | null
          opening_balance?: number | null
          parent_id?: string | null
          reconciliation_enabled?: boolean | null
          reporting_group?: string | null
          requires_approval?: boolean | null
          sub_type_code?: string | null
          tax_code?: string | null
          type_code?: string | null
          updated_at?: string
        }
        Update: {
          ai_category?: string | null
          automation_tags?: string[] | null
          branch?: string | null
          code?: string
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_balance?: number | null
          description?: string | null
          entity_id?: string | null
          group_code?: string
          id?: string
          is_active?: boolean | null
          is_postable?: boolean
          manual_entries_allowed?: boolean | null
          name?: string
          normal_balance?: string | null
          notes?: string | null
          opening_balance?: number | null
          parent_id?: string | null
          reconciliation_enabled?: boolean | null
          reporting_group?: string | null
          requires_approval?: boolean | null
          sub_type_code?: string | null
          tax_code?: string | null
          type_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_coa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_coa_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_coa_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_documents: {
        Row: {
          approval_status: string
          created_at: string
          created_by: string | null
          doc_type: string
          entity: string | null
          extracted: Json | null
          file_size_kb: number
          file_type: string
          filename: string
          id: string
          line_items: Json | null
          linked_client: string | null
          linked_journal_id: string | null
          linked_vendor: string | null
          ocr_error: string | null
          ocr_status: string
          storage_path: string | null
          tags: string[]
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          approval_status?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          entity?: string | null
          extracted?: Json | null
          file_size_kb?: number
          file_type?: string
          filename: string
          id?: string
          line_items?: Json | null
          linked_client?: string | null
          linked_journal_id?: string | null
          linked_vendor?: string | null
          ocr_error?: string | null
          ocr_status?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          approval_status?: string
          created_at?: string
          created_by?: string | null
          doc_type?: string
          entity?: string | null
          extracted?: Json | null
          file_size_kb?: number
          file_type?: string
          filename?: string
          id?: string
          line_items?: Json | null
          linked_client?: string | null
          linked_journal_id?: string | null
          linked_vendor?: string | null
          ocr_error?: string | null
          ocr_status?: string
          storage_path?: string | null
          tags?: string[]
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      accounting_entities: {
        Row: {
          country: string | null
          created_at: string
          currency: string | null
          fiscal_year_start: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          tax_ids: Json | null
          type: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          currency?: string | null
          fiscal_year_start?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          tax_ids?: Json | null
          type: string
        }
        Update: {
          country?: string | null
          created_at?: string
          currency?: string | null
          fiscal_year_start?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          tax_ids?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entities_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounting_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_intercompany: {
        Row: {
          amount: number
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          currency: string
          description: string
          from_credit_account: string | null
          from_debit_account: string | null
          from_entity: string
          from_journal_id: string | null
          fx_rate: number | null
          id: string
          net_amount: number
          notes: string | null
          posted_at: string | null
          reference: string | null
          status: string | null
          tax_amount: number | null
          tax_rate: number | null
          tax_type: string | null
          to_credit_account: string | null
          to_debit_account: string | null
          to_entity: string
          to_journal_id: string | null
          transaction_type: string | null
          txn_date: string
          txn_number: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency: string
          description: string
          from_credit_account?: string | null
          from_debit_account?: string | null
          from_entity: string
          from_journal_id?: string | null
          fx_rate?: number | null
          id?: string
          net_amount: number
          notes?: string | null
          posted_at?: string | null
          reference?: string | null
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tax_type?: string | null
          to_credit_account?: string | null
          to_debit_account?: string | null
          to_entity: string
          to_journal_id?: string | null
          transaction_type?: string | null
          txn_date: string
          txn_number: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string
          description?: string
          from_credit_account?: string | null
          from_debit_account?: string | null
          from_entity?: string
          from_journal_id?: string | null
          fx_rate?: number | null
          id?: string
          net_amount?: number
          notes?: string | null
          posted_at?: string | null
          reference?: string | null
          status?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          tax_type?: string | null
          to_credit_account?: string | null
          to_debit_account?: string | null
          to_entity?: string
          to_journal_id?: string | null
          transaction_type?: string | null
          txn_date?: string
          txn_number?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_intercompany_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_intercompany_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_intercompany_from_journal_id_fkey"
            columns: ["from_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_intercompany_to_journal_id_fkey"
            columns: ["to_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journal_lines: {
        Row: {
          account_code: string | null
          account_id: string | null
          account_name: string | null
          branch: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_id: string
          line_number: number
          tax_code: string | null
        }
        Insert: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          branch?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id: string
          line_number: number
          tax_code?: string | null
        }
        Update: {
          account_code?: string | null
          account_id?: string | null
          account_name?: string | null
          branch?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_id?: string
          line_number?: number
          tax_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string | null
          entity: string
          entry_date: string
          fx_rate: number | null
          id: string
          is_balanced: boolean | null
          journal_number: string
          narration: string
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          source_type: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          entity: string
          entry_date: string
          fx_rate?: number | null
          id?: string
          is_balanced?: boolean | null
          journal_number: string
          narration: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string | null
          entity?: string
          entry_date?: string
          fx_rate?: number | null
          id?: string
          is_balanced?: boolean | null
          journal_number?: string
          narration?: string
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          source_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_journals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_journals_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_journals_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_journals_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounting_masters: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean | null
          label: string
          list_key: string
          metadata: Json | null
          sort_order: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          label: string
          list_key: string
          metadata?: Json | null
          sort_order?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean | null
          label?: string
          list_key?: string
          metadata?: Json | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_masters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_masters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounting_petty_cash: {
        Row: {
          amount: number
          approved_by: string | null
          branch: string
          category: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description: string
          entity: string | null
          id: string
          paid_to: string | null
          payment_mode: string | null
          receipt_url: string | null
          status: string | null
          txn_date: string
          txn_type: string
          updated_at: string
          voucher_number: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          branch: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description: string
          entity?: string | null
          id?: string
          paid_to?: string | null
          payment_mode?: string | null
          receipt_url?: string | null
          status?: string | null
          txn_date: string
          txn_type: string
          updated_at?: string
          voucher_number?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          branch?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description?: string
          entity?: string | null
          id?: string
          paid_to?: string | null
          payment_mode?: string | null
          receipt_url?: string | null
          status?: string | null
          txn_date?: string
          txn_type?: string
          updated_at?: string
          voucher_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_petty_cash_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_petty_cash_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
        ]
      }
      accounting_reimbursements: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch: string | null
          business_amount: number | null
          claim_date: string
          claim_number: string
          claimed_by: string
          company_bank_account: string | null
          created_at: string | null
          created_by: string | null
          entity: string
          expense_journal_id: string | null
          id: string
          lines: Json | null
          notes: string | null
          paid_at: string | null
          paid_by_account: string | null
          payment_journal_id: string | null
          payment_mode: string | null
          payment_reference: string | null
          personal_amount: number | null
          personal_card_account: string | null
          reimbursable_amount: number | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: string | null
          business_amount?: number | null
          claim_date: string
          claim_number: string
          claimed_by: string
          company_bank_account?: string | null
          created_at?: string | null
          created_by?: string | null
          entity: string
          expense_journal_id?: string | null
          id?: string
          lines?: Json | null
          notes?: string | null
          paid_at?: string | null
          paid_by_account?: string | null
          payment_journal_id?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          personal_amount?: number | null
          personal_card_account?: string | null
          reimbursable_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch?: string | null
          business_amount?: number | null
          claim_date?: string
          claim_number?: string
          claimed_by?: string
          company_bank_account?: string | null
          created_at?: string | null
          created_by?: string | null
          entity?: string
          expense_journal_id?: string | null
          id?: string
          lines?: Json | null
          notes?: string | null
          paid_at?: string | null
          paid_by_account?: string | null
          payment_journal_id?: string | null
          payment_mode?: string | null
          payment_reference?: string | null
          personal_amount?: number | null
          personal_card_account?: string | null
          reimbursable_amount?: number | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_reimbursements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_reimbursements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_reimbursements_expense_journal_id_fkey"
            columns: ["expense_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_reimbursements_payment_journal_id_fkey"
            columns: ["payment_journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_user_entity_scope: {
        Row: {
          accounting_user_id: string
          can_edit: boolean
          can_view: boolean
          country_code: string | null
          created_at: string
          entity_id: string | null
          id: string
          scope_type: string
        }
        Insert: {
          accounting_user_id: string
          can_edit?: boolean
          can_view?: boolean
          country_code?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          scope_type: string
        }
        Update: {
          accounting_user_id?: string
          can_edit?: boolean
          can_view?: boolean
          country_code?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          scope_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_user_entity_scope_accounting_user_id_fkey"
            columns: ["accounting_user_id"]
            isOneToOne: false
            referencedRelation: "accounting_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_user_entity_scope_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "accounting_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_user_module_permissions: {
        Row: {
          accounting_user_id: string
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          module: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          accounting_user_id: string
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          module: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          accounting_user_id?: string
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          module?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
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
      accounting_vendors: {
        Row: {
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          bank_swift: string | null
          category: string | null
          company_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          email: string | null
          id: string
          linked_coa_id: string | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          category?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          linked_coa_id?: string | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          bank_swift?: string | null
          category?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string
          linked_coa_id?: string | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_vendors_linked_coa_id_fkey"
            columns: ["linked_coa_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
        ]
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
      ai_help_conversations: {
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
      ai_help_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          note: string | null
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          note?: string | null
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          note?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_help_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "ai_help_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_help_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_help_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_help_conversations"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "ai_summaries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      app_notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          metadata: Json
          read_at: string | null
          severity: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          metadata?: Json
          read_at?: string | null
          severity?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ar_invoice_line_items: {
        Row: {
          created_at: string
          discount_amount: number
          family_member_id: string | null
          gst_amount: number
          gst_rate: number
          id: string
          invoice_id: string
          is_complimentary: boolean
          line_total: number
          offer_id: string | null
          person_name: string | null
          person_type: string
          quantity: number
          service_code: string | null
          service_name: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          family_member_id?: string | null
          gst_amount: number
          gst_rate?: number
          id?: string
          invoice_id: string
          is_complimentary?: boolean
          line_total: number
          offer_id?: string | null
          person_name?: string | null
          person_type: string
          quantity?: number
          service_code?: string | null
          service_name: string
          unit_price: number
        }
        Update: {
          created_at?: string
          discount_amount?: number
          family_member_id?: string | null
          gst_amount?: number
          gst_rate?: number
          id?: string
          invoice_id?: string
          is_complimentary?: boolean
          line_total?: number
          offer_id?: string | null
          person_name?: string | null
          person_type?: string
          quantity?: number
          service_code?: string | null
          service_name?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ar_invoice_line_items_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "client_family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_ar_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoice_line_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "service_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ar_invoice_line_items_service_code_fkey"
            columns: ["service_code"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["service_code"]
          },
        ]
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
          {
            foreignKeyName: "assessment_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          intended_country: string | null
          intended_goal: string | null
          invitation_id: string | null
          last_name: string
          middle_name: string | null
          phone: string
          promo_code: string | null
          promo_expired_at_registration: boolean | null
          promo_expires_at: string | null
          promo_first_opened_at: string | null
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
          intended_country?: string | null
          intended_goal?: string | null
          invitation_id?: string | null
          last_name: string
          middle_name?: string | null
          phone: string
          promo_code?: string | null
          promo_expired_at_registration?: boolean | null
          promo_expires_at?: string | null
          promo_first_opened_at?: string | null
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
          intended_country?: string | null
          intended_goal?: string | null
          invitation_id?: string | null
          last_name?: string
          middle_name?: string | null
          phone?: string
          promo_code?: string | null
          promo_expired_at_registration?: boolean | null
          promo_expires_at?: string | null
          promo_first_opened_at?: string | null
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
            foreignKeyName: "assessment_leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
            foreignKeyName: "assessment_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
            foreignKeyName: "binders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      branches: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          is_virtual: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          is_virtual?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_breaks: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          name: string | null
          repeat_weekly: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          name?: string | null
          repeat_weekly?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          name?: string | null
          repeat_weekly?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_company_branding: {
        Row: {
          booking_page_intro: string | null
          company_logo_url: string | null
          company_name: string | null
          footer_text: string | null
          id: string
          primary_color: string | null
          privacy_url: string | null
          secondary_color: string | null
          singleton: boolean
          terms_url: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_page_intro?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          footer_text?: string | null
          id?: string
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          singleton?: boolean
          terms_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_page_intro?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          footer_text?: string | null
          id?: string
          primary_color?: string | null
          privacy_url?: string | null
          secondary_color?: string | null
          singleton?: boolean
          terms_url?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      calendar_event_audit: {
        Row: {
          actor_id: string | null
          actor_kind: string
          at: string
          event_id: string
          from_status:
            | Database["public"]["Enums"]["calendar_event_status"]
            | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["calendar_event_status"]
        }
        Insert: {
          actor_id?: string | null
          actor_kind?: string
          at?: string
          event_id: string
          from_status?:
            | Database["public"]["Enums"]["calendar_event_status"]
            | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["calendar_event_status"]
        }
        Update: {
          actor_id?: string | null
          actor_kind?: string
          at?: string
          event_id?: string
          from_status?:
            | Database["public"]["Enums"]["calendar_event_status"]
            | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["calendar_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_crm_links: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          event_id: string
          id: string
          is_primary: boolean
          linked_automatically: boolean
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          event_id: string
          id?: string
          is_primary?: boolean
          linked_automatically?: boolean
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          event_id?: string
          id?: string
          is_primary?: boolean
          linked_automatically?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_crm_links_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          appointment_type: string | null
          cancellation_reason: string | null
          created_at: string
          end_time: string
          event_date: string
          event_reference: string | null
          event_title: string | null
          host_remarks: string | null
          host_timezone: string
          id: string
          internal_notes: string | null
          meeting_link: string | null
          meeting_type_id: string
          notes: string | null
          purpose: string | null
          requester_response_at: string | null
          reschedule_proposed_date: string | null
          reschedule_proposed_end: string | null
          reschedule_proposed_start: string | null
          reschedule_reason: string | null
          start_time: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          updated_at: string
          user_id: string
          visitor_timezone: string
        }
        Insert: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_time: string
          event_date: string
          event_reference?: string | null
          event_title?: string | null
          host_remarks?: string | null
          host_timezone: string
          id?: string
          internal_notes?: string | null
          meeting_link?: string | null
          meeting_type_id: string
          notes?: string | null
          purpose?: string | null
          requester_response_at?: string | null
          reschedule_proposed_date?: string | null
          reschedule_proposed_end?: string | null
          reschedule_proposed_start?: string | null
          reschedule_reason?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          updated_at?: string
          user_id: string
          visitor_timezone: string
        }
        Update: {
          appointment_type?: string | null
          cancellation_reason?: string | null
          created_at?: string
          end_time?: string
          event_date?: string
          event_reference?: string | null
          event_title?: string | null
          host_remarks?: string | null
          host_timezone?: string
          id?: string
          internal_notes?: string | null
          meeting_link?: string | null
          meeting_type_id?: string
          notes?: string | null
          purpose?: string | null
          requester_response_at?: string | null
          reschedule_proposed_date?: string | null
          reschedule_proposed_end?: string | null
          reschedule_proposed_start?: string | null
          reschedule_reason?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["calendar_event_status"]
          updated_at?: string
          user_id?: string
          visitor_timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "calendar_meeting_types"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_internal_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          event_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_internal_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_meeting_types: {
        Row: {
          assignment_strategy: string
          booking_window_days: number
          buffer_minutes: number
          category: string | null
          color_code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          meeting_name: string
          requires_approval: boolean
          reservation_ttl_minutes: number
          round_robin_enabled: boolean
          slot_duration_minutes: number
          slug: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_strategy?: string
          booking_window_days?: number
          buffer_minutes?: number
          category?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meeting_name: string
          requires_approval?: boolean
          reservation_ttl_minutes?: number
          round_robin_enabled?: boolean
          slot_duration_minutes: number
          slug: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_strategy?: string
          booking_window_days?: number
          buffer_minutes?: number
          category?: string | null
          color_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          meeting_name?: string
          requires_approval?: boolean
          reservation_ttl_minutes?: number
          round_robin_enabled?: boolean
          slot_duration_minutes?: number
          slug?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_meeting_types_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_notifications: {
        Row: {
          delivery_status: string
          event_id: string
          id: string
          notification_type: string
          recipient_email: string
          sent_at: string | null
        }
        Insert: {
          delivery_status?: string
          event_id: string
          id?: string
          notification_type: string
          recipient_email: string
          sent_at?: string | null
        }
        Update: {
          delivery_status?: string
          event_id?: string
          id?: string
          notification_type?: string
          recipient_email?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_participants: {
        Row: {
          company_name: string | null
          created_at: string
          designation: string | null
          email: string
          event_id: string
          full_name: string
          id: string
          mobile_number: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          designation?: string | null
          email: string
          event_id: string
          full_name: string
          id?: string
          mobile_number: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          designation?: string | null
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          mobile_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_profiles: {
        Row: {
          allow_cancellation: boolean
          allow_reschedule: boolean
          auto_confirm: boolean
          booking_slug: string
          company_logo: string | null
          company_name: string | null
          created_at: string
          designation: string | null
          full_name: string
          id: string
          is_active: boolean
          location: string | null
          profile_photo: string | null
          require_approval: boolean
          short_bio: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_cancellation?: boolean
          allow_reschedule?: boolean
          auto_confirm?: boolean
          booking_slug: string
          company_logo?: string | null
          company_name?: string | null
          created_at?: string
          designation?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          location?: string | null
          profile_photo?: string | null
          require_approval?: boolean
          short_bio?: string | null
          timezone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_cancellation?: boolean
          allow_reschedule?: boolean
          auto_confirm?: boolean
          booking_slug?: string
          company_logo?: string | null
          company_name?: string | null
          created_at?: string
          designation?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          location?: string | null
          profile_photo?: string | null
          require_approval?: boolean
          short_bio?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_slot_reservations: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          released: boolean
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          released?: boolean
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          released?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slot_reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_slug_history: {
        Row: {
          changed_at: string
          id: string
          meeting_type_id: string | null
          new_slug: string
          old_slug: string
          scope: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          meeting_type_id?: string | null
          new_slug: string
          old_slug: string
          scope: string
          user_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          meeting_type_id?: string | null
          new_slug?: string
          old_slug?: string
          scope?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slug_history_meeting_type_id_fkey"
            columns: ["meeting_type_id"]
            isOneToOne: false
            referencedRelation: "calendar_meeting_types"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_tokens: {
        Row: {
          created_at: string
          event_id: string
          expires_at: string
          id: string
          purpose: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          expires_at: string
          id?: string
          purpose?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          expires_at?: string
          id?: string
          purpose?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_unavailable_dates: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          unavailable_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          unavailable_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          unavailable_date?: string
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "call_queue_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "case_people_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      cf_client_programs: {
        Row: {
          client_id: string
          country_code: string
          course_id: string
          created_at: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_primary: boolean
          notes: string | null
          shortlisted_at: string
          shortlisted_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          country_code: string
          course_id: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          shortlisted_at?: string
          shortlisted_by?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          country_code?: string
          course_id?: string
          created_at?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_primary?: boolean
          notes?: string | null
          shortlisted_at?: string
          shortlisted_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cf_client_programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_client_programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cf_client_programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "cf_client_programs_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "cf_countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cf_client_programs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "cf_courses"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "client_access_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "client_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_document_extraction_queue: {
        Row: {
          attempts: number
          client_id: string
          created_at: string
          document_id: string
          finished_at: string | null
          id: string
          last_error: string | null
          priority: number
          scheduled_at: string
          started_at: string | null
          state: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          client_id: string
          created_at?: string
          document_id: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          state?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          client_id?: string
          created_at?: string
          document_id?: string
          finished_at?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_document_extraction_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_extraction_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_extraction_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_document_extraction_queue_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      client_document_extractions: {
        Row: {
          classify_confidence: number
          client_id: string
          created_at: string
          doc_type_detected: string | null
          document_id: string
          error: string | null
          fields: Json
          id: string
          ocr_lang: string | null
          ocr_pages: number | null
          ocr_text: string | null
          overall_confidence: number
          person_id: string | null
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          classify_confidence?: number
          client_id: string
          created_at?: string
          doc_type_detected?: string | null
          document_id: string
          error?: string | null
          fields?: Json
          id?: string
          ocr_lang?: string | null
          ocr_pages?: number | null
          ocr_text?: string | null
          overall_confidence?: number
          person_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          classify_confidence?: number
          client_id?: string
          created_at?: string
          doc_type_detected?: string | null
          document_id?: string
          error?: string | null
          fields?: Json
          id?: string
          ocr_lang?: string | null
          ocr_pages?: number | null
          ocr_text?: string | null
          overall_confidence?: number
          person_id?: string | null
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_document_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_extractions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_document_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "client_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_document_extractions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "case_people"
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
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
            foreignKeyName: "client_emails_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      client_family_members: {
        Row: {
          application_mode: string
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          education_history: Json
          english_overall: string | null
          english_sections: Json
          english_test: string | null
          english_test_date: string | null
          english_test_expiry: string | null
          first_name: string
          id: string
          institution_name: string | null
          last_education: string | null
          last_name: string
          notes: string | null
          other_tests: Json
          passport_expiry: string | null
          passport_number: string | null
          percentage_cgpa: string | null
          primary_client_id: string | null
          primary_lead_id: string | null
          relationship: string
          separate_applied_at: string | null
          separate_lead_id: string | null
          updated_at: string
          visa_services: string[]
          work_experience: Json
          year_of_passing: number | null
        }
        Insert: {
          application_mode?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          education_history?: Json
          english_overall?: string | null
          english_sections?: Json
          english_test?: string | null
          english_test_date?: string | null
          english_test_expiry?: string | null
          first_name: string
          id?: string
          institution_name?: string | null
          last_education?: string | null
          last_name: string
          notes?: string | null
          other_tests?: Json
          passport_expiry?: string | null
          passport_number?: string | null
          percentage_cgpa?: string | null
          primary_client_id?: string | null
          primary_lead_id?: string | null
          relationship: string
          separate_applied_at?: string | null
          separate_lead_id?: string | null
          updated_at?: string
          visa_services?: string[]
          work_experience?: Json
          year_of_passing?: number | null
        }
        Update: {
          application_mode?: string
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          education_history?: Json
          english_overall?: string | null
          english_sections?: Json
          english_test?: string | null
          english_test_date?: string | null
          english_test_expiry?: string | null
          first_name?: string
          id?: string
          institution_name?: string | null
          last_education?: string | null
          last_name?: string
          notes?: string | null
          other_tests?: Json
          passport_expiry?: string | null
          passport_number?: string | null
          percentage_cgpa?: string | null
          primary_client_id?: string | null
          primary_lead_id?: string | null
          relationship?: string
          separate_applied_at?: string | null
          separate_lead_id?: string | null
          updated_at?: string
          visa_services?: string[]
          work_experience?: Json
          year_of_passing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_family_members_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_family_members_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_family_members_primary_client_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_family_members_primary_lead_id_fkey"
            columns: ["primary_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_family_members_separate_lead_id_fkey"
            columns: ["separate_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
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
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_invoice_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          amount_in_cad: number | null
          amount_in_inr: number | null
          amount_in_usd: number | null
          applied_at: string | null
          applied_by: string | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          client_id: string
          created_at: string
          currency: string
          id: string
          invoice_id: string
          reason: string | null
          requested_at: string
          requested_by: string | null
          reversed_at: string | null
          reversed_by: string | null
          status: string
          target_installment_id: string | null
          target_line_item_key: string | null
          updated_at: string
        }
        Insert: {
          adjustment_type: string
          amount: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          target_installment_id?: string | null
          target_line_item_key?: string | null
          updated_at?: string
        }
        Update: {
          adjustment_type?: string
          amount?: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          applied_at?: string | null
          applied_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          reason?: string | null
          requested_at?: string
          requested_by?: string | null
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          target_installment_id?: string | null
          target_line_item_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_adjustments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoice_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_adjustments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_installments: {
        Row: {
          amount_in_cad: number | null
          amount_in_inr: number | null
          amount_in_usd: number | null
          archived_at: string | null
          created_at: string
          currency: string
          fee_category: string | null
          id: string
          installment_amount: number
          installment_due_date: string | null
          installment_label: string | null
          installment_number: number
          installment_status: string
          invoice_id: string
          paid_amount: number | null
          paid_at: string | null
          updated_at: string
        }
        Insert: {
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          archived_at?: string | null
          created_at?: string
          currency?: string
          fee_category?: string | null
          id?: string
          installment_amount?: number
          installment_due_date?: string | null
          installment_label?: string | null
          installment_number: number
          installment_status?: string
          invoice_id: string
          paid_amount?: number | null
          paid_at?: string | null
          updated_at?: string
        }
        Update: {
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          archived_at?: string | null
          created_at?: string
          currency?: string
          fee_category?: string | null
          id?: string
          installment_amount?: number
          installment_due_date?: string | null
          installment_label?: string | null
          installment_number?: number
          installment_status?: string
          invoice_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_payment_allocations: {
        Row: {
          allocated_at: string
          allocated_by: string | null
          amount_allocated: number
          amount_in_cad: number | null
          amount_in_inr: number | null
          amount_in_usd: number | null
          id: string
          installment_id: string | null
          invoice_id: string
          line_item_key: string | null
          payment_id: string
          service_id: string | null
        }
        Insert: {
          allocated_at?: string
          allocated_by?: string | null
          amount_allocated: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          id?: string
          installment_id?: string | null
          invoice_id: string
          line_item_key?: string | null
          payment_id: string
          service_id?: string | null
        }
        Update: {
          allocated_at?: string
          allocated_by?: string | null
          amount_allocated?: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          id?: string
          installment_id?: string | null
          invoice_id?: string
          line_item_key?: string | null
          payment_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_payments: {
        Row: {
          amount: number
          amount_in_cad: number | null
          amount_in_inr: number | null
          amount_in_usd: number | null
          archived_at: string | null
          archived_by: string | null
          bank_reconciled: boolean | null
          bank_reconciled_at: string | null
          bank_reconciled_by: string | null
          bank_reconciliation_ref: string | null
          client_id: string
          created_at: string
          currency: string
          fx_rate: number | null
          id: string
          invoice_id: string
          is_refund: boolean | null
          method: string
          notes: string | null
          paid_at: string
          payer_person_id: string | null
          payer_type: string | null
          payment_proof_file_id: string | null
          payment_proof_status: string | null
          payment_source: string | null
          payment_status: string | null
          posted_by: string | null
          reference: string | null
          refund_request_id: string | null
          split_group_id: string | null
          updated_at: string
          verification_notes: string | null
          verification_rejected_reason: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          archived_at?: string | null
          archived_by?: string | null
          bank_reconciled?: boolean | null
          bank_reconciled_at?: string | null
          bank_reconciled_by?: string | null
          bank_reconciliation_ref?: string | null
          client_id: string
          created_at?: string
          currency?: string
          fx_rate?: number | null
          id?: string
          invoice_id: string
          is_refund?: boolean | null
          method: string
          notes?: string | null
          paid_at?: string
          payer_person_id?: string | null
          payer_type?: string | null
          payment_proof_file_id?: string | null
          payment_proof_status?: string | null
          payment_source?: string | null
          payment_status?: string | null
          posted_by?: string | null
          reference?: string | null
          refund_request_id?: string | null
          split_group_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_rejected_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          amount_in_cad?: number | null
          amount_in_inr?: number | null
          amount_in_usd?: number | null
          archived_at?: string | null
          archived_by?: string | null
          bank_reconciled?: boolean | null
          bank_reconciled_at?: string | null
          bank_reconciled_by?: string | null
          bank_reconciliation_ref?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          fx_rate?: number | null
          id?: string
          invoice_id?: string
          is_refund?: boolean | null
          method?: string
          notes?: string | null
          paid_at?: string
          payer_person_id?: string | null
          payer_type?: string | null
          payment_proof_file_id?: string | null
          payment_proof_status?: string | null
          payment_source?: string | null
          payment_status?: string | null
          posted_by?: string | null
          reference?: string | null
          refund_request_id?: string | null
          split_group_id?: string | null
          updated_at?: string
          verification_notes?: string | null
          verification_rejected_reason?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_receipts: {
        Row: {
          amount: number
          archived_at: string | null
          archived_by: string | null
          branch_id: string | null
          created_at: string
          currency: string
          firm_entity_id: string | null
          generated_at: string
          generated_by: string | null
          id: string
          invoice_id: string
          payment_id: string | null
          pdf_path: string | null
          receipt_number: string
          receipt_prefix: string | null
          receipt_sequence: number | null
          receipt_snapshot_jsonb: Json | null
          receipt_snapshot_taken_at: string | null
          receipt_void_reason: string | null
          receipt_voided: boolean | null
          receipt_voided_at: string | null
          receipt_voided_by: string | null
        }
        Insert: {
          amount?: number
          archived_at?: string | null
          archived_by?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          firm_entity_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_id: string
          payment_id?: string | null
          pdf_path?: string | null
          receipt_number: string
          receipt_prefix?: string | null
          receipt_sequence?: number | null
          receipt_snapshot_jsonb?: Json | null
          receipt_snapshot_taken_at?: string | null
          receipt_void_reason?: string | null
          receipt_voided?: boolean | null
          receipt_voided_at?: string | null
          receipt_voided_by?: string | null
        }
        Update: {
          amount?: number
          archived_at?: string | null
          archived_by?: string | null
          branch_id?: string | null
          created_at?: string
          currency?: string
          firm_entity_id?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string | null
          pdf_path?: string | null
          receipt_number?: string
          receipt_prefix?: string | null
          receipt_sequence?: number | null
          receipt_snapshot_jsonb?: Json | null
          receipt_snapshot_taken_at?: string | null
          receipt_void_reason?: string | null
          receipt_voided?: boolean | null
          receipt_voided_at?: string | null
          receipt_voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_receipts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_receipts_firm_entity_id_fkey"
            columns: ["firm_entity_id"]
            isOneToOne: false
            referencedRelation: "firm_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_receipts_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_refund_requests: {
        Row: {
          amount: number
          approved_at: string | null
          archived_at: string | null
          client_id: string
          created_at: string
          currency: string
          id: string
          invoice_id: string
          payment_id: string | null
          processor_reference: string | null
          refund_approved_by: string | null
          refund_processed_at: string | null
          refund_processed_by: string | null
          refund_reason: string | null
          refund_requested_by: string | null
          refund_status: string
          requested_at: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          archived_at?: string | null
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id: string
          payment_id?: string | null
          processor_reference?: string | null
          refund_approved_by?: string | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_requested_by?: string | null
          refund_status?: string
          requested_at?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          archived_at?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string
          payment_id?: string | null
          processor_reference?: string | null
          refund_approved_by?: string | null
          refund_processed_at?: string | null
          refund_processed_by?: string | null
          refund_reason?: string | null
          refund_requested_by?: string | null
          refund_status?: string
          requested_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_refund_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_refund_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_refund_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoice_refund_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_refund_requests_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_refund_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_reminders: {
        Row: {
          archived_at: string | null
          channel: string
          client_id: string
          created_at: string
          created_by: string | null
          escalation_level: number | null
          id: string
          invoice_id: string
          is_external: boolean
          locked_by: string | null
          locked_until: string | null
          reminder_created_by: string | null
          reminder_status: string
          scheduled_for: string | null
          sent_at: string | null
        }
        Insert: {
          archived_at?: string | null
          channel: string
          client_id: string
          created_at?: string
          created_by?: string | null
          escalation_level?: number | null
          id?: string
          invoice_id: string
          is_external?: boolean
          locked_by?: string | null
          locked_until?: string | null
          reminder_created_by?: string | null
          reminder_status?: string
          scheduled_for?: string | null
          sent_at?: string | null
        }
        Update: {
          archived_at?: string | null
          channel?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          escalation_level?: number | null
          id?: string
          invoice_id?: string
          is_external?: boolean
          locked_by?: string | null
          locked_until?: string | null
          reminder_created_by?: string | null
          reminder_status?: string
          scheduled_for?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoice_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string
          reason: string | null
          snapshot_jsonb: Json
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id: string
          reason?: string | null
          snapshot_jsonb: Json
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string
          reason?: string | null
          snapshot_jsonb?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "client_invoice_snapshots_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "client_invoice_snapshots_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount: number
          amount_paid: number | null
          amount_paid_in_cad: number | null
          amount_paid_in_inr: number | null
          amount_paid_in_usd: number | null
          applied_offer_id: string | null
          archived_at: string | null
          archived_by: string | null
          assigned_accounts_user_id: string | null
          assigned_counselor_id: string | null
          attributed_counselor_id: string | null
          balance_due_in_cad: number | null
          balance_due_in_inr: number | null
          balance_due_in_usd: number | null
          bank_reconciled: boolean | null
          bank_reconciled_at: string | null
          bank_reconciled_by: string | null
          bank_reconciliation_ref: string | null
          branch_id: string | null
          client_id: string
          collected_by: string | null
          converted_by: string | null
          created_at: string
          created_by: string | null
          currency: string
          department_id: string | null
          due_date: string | null
          due_schedule: Json | null
          escalation_level: number | null
          escalation_locked: boolean | null
          external_request_sent_today: boolean | null
          firm_entity_id: string | null
          followed_up_by: string | null
          foreign_payment_due_amount: number | null
          foreign_payment_due_currency: string | null
          foreign_payment_status: string | null
          fx_locked: boolean | null
          fx_manual_override: boolean | null
          fx_provider: string | null
          fx_rate_to_cad: number | null
          fx_rate_to_inr: number | null
          fx_rate_to_usd: number | null
          fx_snapshot_date: string | null
          id: string
          immutable_after_paid: boolean | null
          invoice_branch_code: string | null
          invoice_category: string | null
          invoice_entity_code: string | null
          invoice_locked: boolean | null
          invoice_locked_at: string | null
          invoice_locked_by: string | null
          invoice_locked_for_edit: boolean | null
          invoice_number: string
          invoice_number_generated: boolean | null
          invoice_prefix: string | null
          invoice_reminder_last_sent_at: string | null
          invoice_reminder_locked_until: string | null
          invoice_sent_at: string | null
          invoice_sequence: number | null
          invoice_snapshot_jsonb: Json | null
          invoice_snapshot_taken_at: string | null
          invoice_snapshot_version: number | null
          invoice_stage: string | null
          invoice_viewed_at: string | null
          invoice_year: number | null
          line_items: Json
          offer_discount_amount: number
          paid_at: string | null
          payment_allocations: Json | null
          payment_posted_by: string | null
          payment_processing_lock: boolean | null
          payment_processing_lock_at: string | null
          payment_processing_lock_by: string | null
          points_redeemed: number
          receipt_generated_at: string | null
          receipt_generated_by: string | null
          receipt_prefix: string | null
          receipt_sequence: number | null
          reminder_lock_status: string | null
          status: string
          subtotal_in_cad: number | null
          subtotal_in_inr: number | null
          subtotal_in_usd: number | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_paid?: number | null
          amount_paid_in_cad?: number | null
          amount_paid_in_inr?: number | null
          amount_paid_in_usd?: number | null
          applied_offer_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_accounts_user_id?: string | null
          assigned_counselor_id?: string | null
          attributed_counselor_id?: string | null
          balance_due_in_cad?: number | null
          balance_due_in_inr?: number | null
          balance_due_in_usd?: number | null
          bank_reconciled?: boolean | null
          bank_reconciled_at?: string | null
          bank_reconciled_by?: string | null
          bank_reconciliation_ref?: string | null
          branch_id?: string | null
          client_id: string
          collected_by?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          due_date?: string | null
          due_schedule?: Json | null
          escalation_level?: number | null
          escalation_locked?: boolean | null
          external_request_sent_today?: boolean | null
          firm_entity_id?: string | null
          followed_up_by?: string | null
          foreign_payment_due_amount?: number | null
          foreign_payment_due_currency?: string | null
          foreign_payment_status?: string | null
          fx_locked?: boolean | null
          fx_manual_override?: boolean | null
          fx_provider?: string | null
          fx_rate_to_cad?: number | null
          fx_rate_to_inr?: number | null
          fx_rate_to_usd?: number | null
          fx_snapshot_date?: string | null
          id?: string
          immutable_after_paid?: boolean | null
          invoice_branch_code?: string | null
          invoice_category?: string | null
          invoice_entity_code?: string | null
          invoice_locked?: boolean | null
          invoice_locked_at?: string | null
          invoice_locked_by?: string | null
          invoice_locked_for_edit?: boolean | null
          invoice_number: string
          invoice_number_generated?: boolean | null
          invoice_prefix?: string | null
          invoice_reminder_last_sent_at?: string | null
          invoice_reminder_locked_until?: string | null
          invoice_sent_at?: string | null
          invoice_sequence?: number | null
          invoice_snapshot_jsonb?: Json | null
          invoice_snapshot_taken_at?: string | null
          invoice_snapshot_version?: number | null
          invoice_stage?: string | null
          invoice_viewed_at?: string | null
          invoice_year?: number | null
          line_items?: Json
          offer_discount_amount?: number
          paid_at?: string | null
          payment_allocations?: Json | null
          payment_posted_by?: string | null
          payment_processing_lock?: boolean | null
          payment_processing_lock_at?: string | null
          payment_processing_lock_by?: string | null
          points_redeemed?: number
          receipt_generated_at?: string | null
          receipt_generated_by?: string | null
          receipt_prefix?: string | null
          receipt_sequence?: number | null
          reminder_lock_status?: string | null
          status?: string
          subtotal_in_cad?: number | null
          subtotal_in_inr?: number | null
          subtotal_in_usd?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          amount_paid_in_cad?: number | null
          amount_paid_in_inr?: number | null
          amount_paid_in_usd?: number | null
          applied_offer_id?: string | null
          archived_at?: string | null
          archived_by?: string | null
          assigned_accounts_user_id?: string | null
          assigned_counselor_id?: string | null
          attributed_counselor_id?: string | null
          balance_due_in_cad?: number | null
          balance_due_in_inr?: number | null
          balance_due_in_usd?: number | null
          bank_reconciled?: boolean | null
          bank_reconciled_at?: string | null
          bank_reconciled_by?: string | null
          bank_reconciliation_ref?: string | null
          branch_id?: string | null
          client_id?: string
          collected_by?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          department_id?: string | null
          due_date?: string | null
          due_schedule?: Json | null
          escalation_level?: number | null
          escalation_locked?: boolean | null
          external_request_sent_today?: boolean | null
          firm_entity_id?: string | null
          followed_up_by?: string | null
          foreign_payment_due_amount?: number | null
          foreign_payment_due_currency?: string | null
          foreign_payment_status?: string | null
          fx_locked?: boolean | null
          fx_manual_override?: boolean | null
          fx_provider?: string | null
          fx_rate_to_cad?: number | null
          fx_rate_to_inr?: number | null
          fx_rate_to_usd?: number | null
          fx_snapshot_date?: string | null
          id?: string
          immutable_after_paid?: boolean | null
          invoice_branch_code?: string | null
          invoice_category?: string | null
          invoice_entity_code?: string | null
          invoice_locked?: boolean | null
          invoice_locked_at?: string | null
          invoice_locked_by?: string | null
          invoice_locked_for_edit?: boolean | null
          invoice_number?: string
          invoice_number_generated?: boolean | null
          invoice_prefix?: string | null
          invoice_reminder_last_sent_at?: string | null
          invoice_reminder_locked_until?: string | null
          invoice_sent_at?: string | null
          invoice_sequence?: number | null
          invoice_snapshot_jsonb?: Json | null
          invoice_snapshot_taken_at?: string | null
          invoice_snapshot_version?: number | null
          invoice_stage?: string | null
          invoice_viewed_at?: string | null
          invoice_year?: number | null
          line_items?: Json
          offer_discount_amount?: number
          paid_at?: string | null
          payment_allocations?: Json | null
          payment_posted_by?: string | null
          payment_processing_lock?: boolean | null
          payment_processing_lock_at?: string | null
          payment_processing_lock_by?: string | null
          points_redeemed?: number
          receipt_generated_at?: string | null
          receipt_generated_by?: string | null
          receipt_prefix?: string | null
          receipt_sequence?: number | null
          reminder_lock_status?: string | null
          status?: string
          subtotal_in_cad?: number | null
          subtotal_in_inr?: number | null
          subtotal_in_usd?: number | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_applied_offer_fkey"
            columns: ["applied_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_invoices_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_firm_entity_id_fkey"
            columns: ["firm_entity_id"]
            isOneToOne: false
            referencedRelation: "firm_profile"
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
          {
            foreignKeyName: "client_notification_prefs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "client_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
      client_offers: {
        Row: {
          attached_by: string | null
          client_id: string
          created_at: string
          id: string
          offer_id: string
          source: string
          status: string
          used_at: string | null
        }
        Insert: {
          attached_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          offer_id: string
          source?: string
          status?: string
          used_at?: string | null
        }
        Update: {
          attached_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          offer_id?: string
          source?: string
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
            foreignKeyName: "client_offers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "client_portal_invites_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "client_portal_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      client_stage_history: {
        Row: {
          client_id: string
          entered_at: string
          entered_by: string | null
          id: string
          metadata: Json | null
          notes: string | null
          pipeline_id: string
          stage_id: string
        }
        Insert: {
          client_id: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          pipeline_id: string
          stage_id: string
        }
        Update: {
          client_id?: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          pipeline_id?: string
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_stage_history_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "stage_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_stage_history_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "vw_portal_stages"
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
          is_staff_only: boolean
          metadata: Json
          summary: string | null
        }
        Insert: {
          actor_id?: string | null
          client_id: string
          created_at?: string
          event_type: string
          id?: string
          is_staff_only?: boolean
          metadata?: Json
          summary?: string | null
        }
        Update: {
          actor_id?: string | null
          client_id?: string
          created_at?: string
          event_type?: string
          id?: string
          is_staff_only?: boolean
          metadata?: Json
          summary?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          admission_services: string[]
          allied_services: string[]
          alternate_phone: string | null
          application_id: string
          application_type: string
          assigned_counselor_id: string | null
          billing_entity: string | null
          branch: string | null
          budget: number | null
          client_type: string | null
          coaching_services: string[]
          consent_form_date: string | null
          consent_form_submitted: boolean | null
          converted_at: string | null
          counselor_notes: string | null
          counselor_notes_locked: boolean
          counselor_notes_locked_at: string | null
          counselor_notes_unlock_reason: string | null
          country: string
          country_code: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          date_of_birth: string | null
          department: string | null
          education_history: Json
          email: string | null
          email_alternate: string | null
          english_overall: string | null
          english_sections: Json
          english_test: string | null
          english_test_date: string | null
          english_test_expiry: string | null
          enrollment_probability: number | null
          extra_items: Json
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          institution_name: string | null
          institution_student_id: string | null
          intake: string | null
          interested_countries: string[]
          interested_country: string | null
          interested_course: string | null
          last_education: string | null
          last_education_other: string | null
          last_name: string | null
          lead_score: number
          lead_score_reasons: Json
          lead_source: string | null
          lead_stage: string | null
          lead_temperature: string | null
          linked_institution_id: string | null
          linked_student_record_id: string | null
          marital_status: string | null
          middle_name: string | null
          national_id_last4: string | null
          next_followup_at: string | null
          notes: string | null
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          other_tests: Json
          owner_id: string | null
          pan_number: string | null
          parent_contact: string | null
          passport_expiry: string | null
          passport_number: string | null
          payment_terms: string | null
          percentage_cgpa: string | null
          phone: string | null
          phone_alternate: string | null
          phone_country_code: string | null
          pipeline_id: string | null
          preferred_contact_time: string | null
          preferred_language: string | null
          priority: string | null
          registration_number: string | null
          service_fees: Json
          source_lead_id: string | null
          status: string
          study_permit_approved_date: string | null
          study_permit_expiry: string | null
          study_permit_number: string | null
          suppressed_template_items: string[]
          tags: string[]
          tax_id: string | null
          template_id: string | null
          timezone: string | null
          travel_financial_services: string[]
          updated_at: string
          visa_services: string[]
          whatsapp: string | null
          work_experience: Json
          workflow_template_id: string | null
          year_of_passing: number | null
        }
        Insert: {
          admission_services?: string[]
          allied_services?: string[]
          alternate_phone?: string | null
          application_id?: string
          application_type: string
          assigned_counselor_id?: string | null
          billing_entity?: string | null
          branch?: string | null
          budget?: number | null
          client_type?: string | null
          coaching_services?: string[]
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          converted_at?: string | null
          counselor_notes?: string | null
          counselor_notes_locked?: boolean
          counselor_notes_locked_at?: string | null
          counselor_notes_unlock_reason?: string | null
          country: string
          country_code?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          date_of_birth?: string | null
          department?: string | null
          education_history?: Json
          email?: string | null
          email_alternate?: string | null
          english_overall?: string | null
          english_sections?: Json
          english_test?: string | null
          english_test_date?: string | null
          english_test_expiry?: string | null
          enrollment_probability?: number | null
          extra_items?: Json
          first_name?: string | null
          full_name: string
          gender?: string | null
          id?: string
          institution_name?: string | null
          institution_student_id?: string | null
          intake?: string | null
          interested_countries?: string[]
          interested_country?: string | null
          interested_course?: string | null
          last_education?: string | null
          last_education_other?: string | null
          last_name?: string | null
          lead_score?: number
          lead_score_reasons?: Json
          lead_source?: string | null
          lead_stage?: string | null
          lead_temperature?: string | null
          linked_institution_id?: string | null
          linked_student_record_id?: string | null
          marital_status?: string | null
          middle_name?: string | null
          national_id_last4?: string | null
          next_followup_at?: string | null
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          other_tests?: Json
          owner_id?: string | null
          pan_number?: string | null
          parent_contact?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          payment_terms?: string | null
          percentage_cgpa?: string | null
          phone?: string | null
          phone_alternate?: string | null
          phone_country_code?: string | null
          pipeline_id?: string | null
          preferred_contact_time?: string | null
          preferred_language?: string | null
          priority?: string | null
          registration_number?: string | null
          service_fees?: Json
          source_lead_id?: string | null
          status?: string
          study_permit_approved_date?: string | null
          study_permit_expiry?: string | null
          study_permit_number?: string | null
          suppressed_template_items?: string[]
          tags?: string[]
          tax_id?: string | null
          template_id?: string | null
          timezone?: string | null
          travel_financial_services?: string[]
          updated_at?: string
          visa_services?: string[]
          whatsapp?: string | null
          work_experience?: Json
          workflow_template_id?: string | null
          year_of_passing?: number | null
        }
        Update: {
          admission_services?: string[]
          allied_services?: string[]
          alternate_phone?: string | null
          application_id?: string
          application_type?: string
          assigned_counselor_id?: string | null
          billing_entity?: string | null
          branch?: string | null
          budget?: number | null
          client_type?: string | null
          coaching_services?: string[]
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          converted_at?: string | null
          counselor_notes?: string | null
          counselor_notes_locked?: boolean
          counselor_notes_locked_at?: string | null
          counselor_notes_unlock_reason?: string | null
          country?: string
          country_code?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          current_stage_id?: string | null
          date_of_birth?: string | null
          department?: string | null
          education_history?: Json
          email?: string | null
          email_alternate?: string | null
          english_overall?: string | null
          english_sections?: Json
          english_test?: string | null
          english_test_date?: string | null
          english_test_expiry?: string | null
          enrollment_probability?: number | null
          extra_items?: Json
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          institution_name?: string | null
          institution_student_id?: string | null
          intake?: string | null
          interested_countries?: string[]
          interested_country?: string | null
          interested_course?: string | null
          last_education?: string | null
          last_education_other?: string | null
          last_name?: string | null
          lead_score?: number
          lead_score_reasons?: Json
          lead_source?: string | null
          lead_stage?: string | null
          lead_temperature?: string | null
          linked_institution_id?: string | null
          linked_student_record_id?: string | null
          marital_status?: string | null
          middle_name?: string | null
          national_id_last4?: string | null
          next_followup_at?: string | null
          notes?: string | null
          odoo_lead_id?: number | null
          odoo_partner_id?: number | null
          odoo_synced_at?: string | null
          other_tests?: Json
          owner_id?: string | null
          pan_number?: string | null
          parent_contact?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          payment_terms?: string | null
          percentage_cgpa?: string | null
          phone?: string | null
          phone_alternate?: string | null
          phone_country_code?: string | null
          pipeline_id?: string | null
          preferred_contact_time?: string | null
          preferred_language?: string | null
          priority?: string | null
          registration_number?: string | null
          service_fees?: Json
          source_lead_id?: string | null
          status?: string
          study_permit_approved_date?: string | null
          study_permit_expiry?: string | null
          study_permit_number?: string | null
          suppressed_template_items?: string[]
          tags?: string[]
          tax_id?: string | null
          template_id?: string | null
          timezone?: string | null
          travel_financial_services?: string[]
          updated_at?: string
          visa_services?: string[]
          whatsapp?: string | null
          work_experience?: Json
          workflow_template_id?: string | null
          year_of_passing?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "vw_portal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_linked_institution_id_fkey"
            columns: ["linked_institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_linked_student_record_id_fkey"
            columns: ["linked_student_record_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "stage_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "credit_wallet_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      departments: {
        Row: {
          created_at: string | null
          display_order: number | null
          handles_services: string[] | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          handles_services?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          handles_services?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      discount_wallets: {
        Row: {
          allow_negative: boolean
          balance: number
          branch_id: string | null
          budget_kind: Database["public"]["Enums"]["wallet_budget_kind"]
          carried_to_wallet: string | null
          carry_to_period: string | null
          close_outcome: string | null
          closed_at: string | null
          counselor_id: string
          created_at: string
          currency: string
          id: string
          max_amount_per_client: number | null
          max_percent_per_client: number
          name: string | null
          period_key: string
          rollover_cap: number | null
          rollover_policy: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_country_tag: string | null
          scope_master_key: string | null
          scope_service_code: string | null
          scope_sub_category: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          allow_negative?: boolean
          balance?: number
          branch_id?: string | null
          budget_kind?: Database["public"]["Enums"]["wallet_budget_kind"]
          carried_to_wallet?: string | null
          carry_to_period?: string | null
          close_outcome?: string | null
          closed_at?: string | null
          counselor_id: string
          created_at?: string
          currency?: string
          id?: string
          max_amount_per_client?: number | null
          max_percent_per_client?: number
          name?: string | null
          period_key: string
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_country_tag?: string | null
          scope_master_key?: string | null
          scope_service_code?: string | null
          scope_sub_category?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          allow_negative?: boolean
          balance?: number
          branch_id?: string | null
          budget_kind?: Database["public"]["Enums"]["wallet_budget_kind"]
          carried_to_wallet?: string | null
          carry_to_period?: string | null
          close_outcome?: string | null
          closed_at?: string | null
          counselor_id?: string
          created_at?: string
          currency?: string
          id?: string
          max_amount_per_client?: number | null
          max_percent_per_client?: number
          name?: string | null
          period_key?: string
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_country_tag?: string | null
          scope_master_key?: string | null
          scope_service_code?: string | null
          scope_sub_category?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_wallets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_wallets_carried_to_wallet_fkey"
            columns: ["carried_to_wallet"]
            isOneToOne: false
            referencedRelation: "discount_wallets"
            referencedColumns: ["id"]
          },
        ]
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
      dsh_ai_generations: {
        Row: {
          brief: Json
          created_at: string
          id: string
          image_paths: string[]
          kind: string
          model: string | null
          output_text: string | null
          prompt: string | null
          user_id: string
        }
        Insert: {
          brief?: Json
          created_at?: string
          id?: string
          image_paths?: string[]
          kind: string
          model?: string | null
          output_text?: string | null
          prompt?: string | null
          user_id: string
        }
        Update: {
          brief?: Json
          created_at?: string
          id?: string
          image_paths?: string[]
          kind?: string
          model?: string | null
          output_text?: string | null
          prompt?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dsh_branch_contacts: {
        Row: {
          branch_id: string
          created_at: string
          email: string
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsh_branch_contacts_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      dsh_branch_notifications: {
        Row: {
          branch_id: string | null
          id: string
          media_id: string
          message_id: number | null
          recipient_email: string
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          branch_id?: string | null
          id?: string
          media_id: string
          message_id?: number | null
          recipient_email: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          branch_id?: string | null
          id?: string
          media_id?: string
          message_id?: number | null
          recipient_email?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsh_branch_notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsh_branch_notifications_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "dsh_media"
            referencedColumns: ["id"]
          },
        ]
      }
      dsh_brand_assets: {
        Row: {
          country: string | null
          created_at: string
          id: string
          institution_id: string | null
          is_default_brand: boolean
          kind: string
          storage_path: string
          tags: string[]
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          is_default_brand?: boolean
          kind: string
          storage_path: string
          tags?: string[]
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          is_default_brand?: boolean
          kind?: string
          storage_path?: string
          tags?: string[]
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      dsh_media: {
        Row: {
          branch_id: string | null
          campaign_name: string | null
          client_id: string | null
          client_link_url: string | null
          content_owner_department:
            | Database["public"]["Enums"]["dsh_owner_department"]
            | null
          content_scope: Database["public"]["Enums"]["dsh_content_scope"]
          content_type: Database["public"]["Enums"]["dsh_content_type"]
          country_name: string | null
          created_at: string
          credited_user_id: string | null
          department_id: string | null
          description: string | null
          display_until: string | null
          external_url: string | null
          file_name: string | null
          file_size: number | null
          front_desk_priority: number | null
          google_review_rating: number | null
          google_review_screenshot_path: string | null
          google_review_text: string | null
          google_review_url: string | null
          id: string
          institution_id: string | null
          is_front_desk: boolean
          is_google_review: boolean
          is_pinned: boolean
          last_notified_at: string | null
          link_type: Database["public"]["Enums"]["dsh_link_type"] | null
          mime_type: string | null
          notify_count: number
          preview_image_url: string | null
          review_received_at: string | null
          search_doc: unknown
          service_master_key: string | null
          service_sub_category: string | null
          sort_order: number
          source_type: Database["public"]["Enums"]["dsh_source_type"]
          status: Database["public"]["Enums"]["dsh_status"]
          storage_path: string | null
          title: string
          updated_at: string
          upload_source: Database["public"]["Enums"]["dsh_upload_source"]
          uploaded_by: string | null
          visa_category: string | null
          visible_to_all_branches: boolean
        }
        Insert: {
          branch_id?: string | null
          campaign_name?: string | null
          client_id?: string | null
          client_link_url?: string | null
          content_owner_department?:
            | Database["public"]["Enums"]["dsh_owner_department"]
            | null
          content_scope: Database["public"]["Enums"]["dsh_content_scope"]
          content_type: Database["public"]["Enums"]["dsh_content_type"]
          country_name?: string | null
          created_at?: string
          credited_user_id?: string | null
          department_id?: string | null
          description?: string | null
          display_until?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          front_desk_priority?: number | null
          google_review_rating?: number | null
          google_review_screenshot_path?: string | null
          google_review_text?: string | null
          google_review_url?: string | null
          id?: string
          institution_id?: string | null
          is_front_desk?: boolean
          is_google_review?: boolean
          is_pinned?: boolean
          last_notified_at?: string | null
          link_type?: Database["public"]["Enums"]["dsh_link_type"] | null
          mime_type?: string | null
          notify_count?: number
          preview_image_url?: string | null
          review_received_at?: string | null
          search_doc?: unknown
          service_master_key?: string | null
          service_sub_category?: string | null
          sort_order?: number
          source_type: Database["public"]["Enums"]["dsh_source_type"]
          status?: Database["public"]["Enums"]["dsh_status"]
          storage_path?: string | null
          title: string
          updated_at?: string
          upload_source: Database["public"]["Enums"]["dsh_upload_source"]
          uploaded_by?: string | null
          visa_category?: string | null
          visible_to_all_branches?: boolean
        }
        Update: {
          branch_id?: string | null
          campaign_name?: string | null
          client_id?: string | null
          client_link_url?: string | null
          content_owner_department?:
            | Database["public"]["Enums"]["dsh_owner_department"]
            | null
          content_scope?: Database["public"]["Enums"]["dsh_content_scope"]
          content_type?: Database["public"]["Enums"]["dsh_content_type"]
          country_name?: string | null
          created_at?: string
          credited_user_id?: string | null
          department_id?: string | null
          description?: string | null
          display_until?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size?: number | null
          front_desk_priority?: number | null
          google_review_rating?: number | null
          google_review_screenshot_path?: string | null
          google_review_text?: string | null
          google_review_url?: string | null
          id?: string
          institution_id?: string | null
          is_front_desk?: boolean
          is_google_review?: boolean
          is_pinned?: boolean
          last_notified_at?: string | null
          link_type?: Database["public"]["Enums"]["dsh_link_type"] | null
          mime_type?: string | null
          notify_count?: number
          preview_image_url?: string | null
          review_received_at?: string | null
          search_doc?: unknown
          service_master_key?: string | null
          service_sub_category?: string | null
          sort_order?: number
          source_type?: Database["public"]["Enums"]["dsh_source_type"]
          status?: Database["public"]["Enums"]["dsh_status"]
          storage_path?: string | null
          title?: string
          updated_at?: string
          upload_source?: Database["public"]["Enums"]["dsh_upload_source"]
          uploaded_by?: string | null
          visa_category?: string | null
          visible_to_all_branches?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dsh_media_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsh_media_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsh_media_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsh_media_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
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
          {
            foreignKeyName: "email_threads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      financial_accounts: {
        Row: {
          account_number: string | null
          account_type: string
          branch: string | null
          category: string
          closed_date: string | null
          country: string
          created_at: string
          currency: string
          current_balance: number | null
          dp_id: string | null
          emi_amount: number | null
          emi_day: number | null
          folio_number: string | null
          gl_account_id: string | null
          id: string
          ifsc_code: string | null
          institution_name: string
          interest_rate: number | null
          linked_entity_id: string | null
          maturity_date: string | null
          next_premium_date: string | null
          nickname: string
          opened_date: string | null
          owner_profile_id: string
          policy_number: string | null
          premium_amount: number | null
          premium_frequency: string | null
          remarks: string | null
          status: string
          sum_assured: number | null
          swift_code: string | null
          tags: string[]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type: string
          branch?: string | null
          category: string
          closed_date?: string | null
          country?: string
          created_at?: string
          currency?: string
          current_balance?: number | null
          dp_id?: string | null
          emi_amount?: number | null
          emi_day?: number | null
          folio_number?: string | null
          gl_account_id?: string | null
          id?: string
          ifsc_code?: string | null
          institution_name: string
          interest_rate?: number | null
          linked_entity_id?: string | null
          maturity_date?: string | null
          next_premium_date?: string | null
          nickname: string
          opened_date?: string | null
          owner_profile_id: string
          policy_number?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          remarks?: string | null
          status?: string
          sum_assured?: number | null
          swift_code?: string | null
          tags?: string[]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string
          branch?: string | null
          category?: string
          closed_date?: string | null
          country?: string
          created_at?: string
          currency?: string
          current_balance?: number | null
          dp_id?: string | null
          emi_amount?: number | null
          emi_day?: number | null
          folio_number?: string | null
          gl_account_id?: string | null
          id?: string
          ifsc_code?: string | null
          institution_name?: string
          interest_rate?: number | null
          linked_entity_id?: string | null
          maturity_date?: string | null
          next_premium_date?: string | null
          nickname?: string
          opened_date?: string | null
          owner_profile_id?: string
          policy_number?: string | null
          premium_amount?: number | null
          premium_frequency?: string | null
          remarks?: string | null
          status?: string
          sum_assured?: number | null
          swift_code?: string | null
          tags?: string[]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_accounts_owner_profile_id_fkey"
            columns: ["owner_profile_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
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
          theme_config: Json | null
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
          theme_config?: Json | null
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
          theme_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          notes: string | null
          period_key: string
          rate_to_inr: number
          set_by: string | null
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          notes?: string | null
          period_key: string
          rate_to_inr: number
          set_by?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          period_key?: string
          rate_to_inr?: number
          set_by?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      incentive_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          counselor_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          reason: string
          run_id: string | null
          source_payment_id: string | null
        }
        Insert: {
          adjustment_type?: string
          amount: number
          counselor_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          reason: string
          run_id?: string | null
          source_payment_id?: string | null
        }
        Update: {
          adjustment_type?: string
          amount?: number
          counselor_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          reason?: string
          run_id?: string | null
          source_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_adjustments_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "incentive_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_line_items: {
        Row: {
          base_amount: number
          base_currency: string
          client_id: string | null
          counselor_id: string
          created_at: string
          earned_amount: number
          fx_rate_used: number | null
          id: string
          note: string | null
          run_id: string
          settlement_currency: string
          slab_id: string | null
          source_commission_id: string | null
          source_invoice_id: string | null
          source_payment_id: string | null
          source_type: Database["public"]["Enums"]["incentive_source_type"]
        }
        Insert: {
          base_amount?: number
          base_currency?: string
          client_id?: string | null
          counselor_id: string
          created_at?: string
          earned_amount?: number
          fx_rate_used?: number | null
          id?: string
          note?: string | null
          run_id: string
          settlement_currency?: string
          slab_id?: string | null
          source_commission_id?: string | null
          source_invoice_id?: string | null
          source_payment_id?: string | null
          source_type: Database["public"]["Enums"]["incentive_source_type"]
        }
        Update: {
          base_amount?: number
          base_currency?: string
          client_id?: string | null
          counselor_id?: string
          created_at?: string
          earned_amount?: number
          fx_rate_used?: number | null
          id?: string
          note?: string | null
          run_id?: string
          settlement_currency?: string
          slab_id?: string | null
          source_commission_id?: string | null
          source_invoice_id?: string | null
          source_payment_id?: string | null
          source_type?: Database["public"]["Enums"]["incentive_source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "incentive_line_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_line_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_line_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "incentive_line_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "incentive_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_line_items_slab_id_fkey"
            columns: ["slab_id"]
            isOneToOne: false
            referencedRelation: "incentive_slabs"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_payouts: {
        Row: {
          accounting_ap_bill_id: string | null
          approved_at: string | null
          approved_by: string | null
          counselor_id: string
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          run_id: string | null
          settlement_currency: string
          status: Database["public"]["Enums"]["payout_status"]
          tds_amount: number
          tds_percent: number
          updated_at: string
        }
        Insert: {
          accounting_ap_bill_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          counselor_id: string
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          run_id?: string | null
          settlement_currency?: string
          status?: Database["public"]["Enums"]["payout_status"]
          tds_amount?: number
          tds_percent?: number
          updated_at?: string
        }
        Update: {
          accounting_ap_bill_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          counselor_id?: string
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          run_id?: string | null
          settlement_currency?: string
          status?: Database["public"]["Enums"]["payout_status"]
          tds_amount?: number
          tds_percent?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_payouts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "incentive_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_plans: {
        Row: {
          active_from: string
          active_to: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          period_type: Database["public"]["Enums"]["incentive_period_type"]
          revenue_basis: string
          role_key: string | null
          scope_type: string
          settlement_currency: string
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          period_type?: Database["public"]["Enums"]["incentive_period_type"]
          revenue_basis?: string
          role_key?: string | null
          scope_type?: string
          settlement_currency?: string
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period_type?: Database["public"]["Enums"]["incentive_period_type"]
          revenue_basis?: string
          role_key?: string | null
          scope_type?: string
          settlement_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_plans_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_runs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          calculated_at: string | null
          calculated_by: string | null
          created_at: string
          fx_snapshot: Json
          id: string
          locked: boolean
          period_key: string
          period_type: Database["public"]["Enums"]["incentive_period_type"]
          plan_id: string | null
          settlement_currency: string
          status: Database["public"]["Enums"]["incentive_run_status"]
          total_settlement: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string
          fx_snapshot?: Json
          id?: string
          locked?: boolean
          period_key: string
          period_type: Database["public"]["Enums"]["incentive_period_type"]
          plan_id?: string | null
          settlement_currency?: string
          status?: Database["public"]["Enums"]["incentive_run_status"]
          total_settlement?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          calculated_at?: string | null
          calculated_by?: string | null
          created_at?: string
          fx_snapshot?: Json
          id?: string
          locked?: boolean
          period_key?: string
          period_type?: Database["public"]["Enums"]["incentive_period_type"]
          plan_id?: string | null
          settlement_currency?: string
          status?: Database["public"]["Enums"]["incentive_run_status"]
          total_settlement?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incentive_runs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_runs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_schemes: {
        Row: {
          active_from: string
          active_to: string
          branch_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_active: boolean
          name: string
          rate_type: Database["public"]["Enums"]["incentive_rate_type"] | null
          rate_value: number | null
          role_key: string | null
          scheme_type: string
          scope_type: string
          service_filter: string | null
          source_type:
            | Database["public"]["Enums"]["incentive_source_type"]
            | null
        }
        Insert: {
          active_from: string
          active_to: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          rate_type?: Database["public"]["Enums"]["incentive_rate_type"] | null
          rate_value?: number | null
          role_key?: string | null
          scheme_type: string
          scope_type?: string
          service_filter?: string | null
          source_type?:
            | Database["public"]["Enums"]["incentive_source_type"]
            | null
        }
        Update: {
          active_from?: string
          active_to?: string
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          rate_type?: Database["public"]["Enums"]["incentive_rate_type"] | null
          rate_value?: number | null
          role_key?: string | null
          scheme_type?: string
          scope_type?: string
          service_filter?: string | null
          source_type?:
            | Database["public"]["Enums"]["incentive_source_type"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "incentive_schemes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_slabs: {
        Row: {
          created_at: string
          id: string
          max_threshold: number | null
          metric: string
          min_threshold: number
          plan_id: string
          rate_type: Database["public"]["Enums"]["incentive_rate_type"]
          rate_value: number
          service_filter: string | null
          sort_order: number
          source_type: Database["public"]["Enums"]["incentive_source_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          max_threshold?: number | null
          metric: string
          min_threshold?: number
          plan_id: string
          rate_type: Database["public"]["Enums"]["incentive_rate_type"]
          rate_value?: number
          service_filter?: string | null
          sort_order?: number
          source_type: Database["public"]["Enums"]["incentive_source_type"]
        }
        Update: {
          created_at?: string
          id?: string
          max_threshold?: number | null
          metric?: string
          min_threshold?: number
          plan_id?: string
          rate_type?: Database["public"]["Enums"]["incentive_rate_type"]
          rate_value?: number
          service_filter?: string | null
          sort_order?: number
          source_type?: Database["public"]["Enums"]["incentive_source_type"]
        }
        Relationships: [
          {
            foreignKeyName: "incentive_slabs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_targets: {
        Row: {
          bonus_rate_type:
            | Database["public"]["Enums"]["incentive_rate_type"]
            | null
          bonus_trigger_pct: number | null
          bonus_value: number | null
          branch_id: string | null
          counselor_id: string
          created_at: string
          id: string
          period_key: string
          period_type: Database["public"]["Enums"]["incentive_period_type"]
          plan_id: string | null
          target_currency: string
          target_metric: string
          target_value: number
        }
        Insert: {
          bonus_rate_type?:
            | Database["public"]["Enums"]["incentive_rate_type"]
            | null
          bonus_trigger_pct?: number | null
          bonus_value?: number | null
          branch_id?: string | null
          counselor_id: string
          created_at?: string
          id?: string
          period_key: string
          period_type: Database["public"]["Enums"]["incentive_period_type"]
          plan_id?: string | null
          target_currency?: string
          target_metric?: string
          target_value?: number
        }
        Update: {
          bonus_rate_type?:
            | Database["public"]["Enums"]["incentive_rate_type"]
            | null
          bonus_trigger_pct?: number | null
          bonus_value?: number | null
          branch_id?: string | null
          counselor_id?: string
          created_at?: string
          id?: string
          period_key?: string
          period_type?: Database["public"]["Enums"]["incentive_period_type"]
          plan_id?: string | null
          target_currency?: string
          target_metric?: string
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "incentive_targets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incentive_targets_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "incentive_plans"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_number_sequences: {
        Row: {
          branch_code: string
          entity_code: string
          last_number: number
          year: number
        }
        Insert: {
          branch_code?: string
          entity_code?: string
          last_number?: number
          year: number
        }
        Update: {
          branch_code?: string
          entity_code?: string
          last_number?: number
          year?: number
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
      lead_number_sequences: {
        Row: {
          last_number: number | null
          lead_type: string
          year: number
        }
        Insert: {
          last_number?: number | null
          lead_type: string
          year: number
        }
        Update: {
          last_number?: number | null
          lead_type?: string
          year?: number
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
            foreignKeyName: "lead_remarks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      leads: {
        Row: {
          admission_services: string[] | null
          allied_services: string[] | null
          assigned_counselor_id: string | null
          b2b_partner_id: string | null
          branch: string | null
          coaching_services: string[] | null
          cold_pool_campaign: string | null
          converted_at: string | null
          converted_to_client_id: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          interested_countries: string[] | null
          is_cold_pool: boolean | null
          last_education: string | null
          last_education_other: string | null
          last_name: string
          lead_number: string
          lead_source: string | null
          lead_temperature: string
          lead_type: string
          marital_status: string | null
          middle_name: string | null
          notes: string | null
          notes_locked: boolean | null
          notes_locked_at: string | null
          notes_locked_by: string | null
          phone: string | null
          phone_country_code: string | null
          priority: string | null
          source: string | null
          start_timeline: string | null
          status: string
          updated_at: string | null
          visa_lock_reason: string | null
          visa_locked: boolean | null
          visa_services: string[] | null
        }
        Insert: {
          admission_services?: string[] | null
          allied_services?: string[] | null
          assigned_counselor_id?: string | null
          b2b_partner_id?: string | null
          branch?: string | null
          coaching_services?: string[] | null
          cold_pool_campaign?: string | null
          converted_at?: string | null
          converted_to_client_id?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          id?: string
          interested_countries?: string[] | null
          is_cold_pool?: boolean | null
          last_education?: string | null
          last_education_other?: string | null
          last_name: string
          lead_number: string
          lead_source?: string | null
          lead_temperature?: string
          lead_type: string
          marital_status?: string | null
          middle_name?: string | null
          notes?: string | null
          notes_locked?: boolean | null
          notes_locked_at?: string | null
          notes_locked_by?: string | null
          phone?: string | null
          phone_country_code?: string | null
          priority?: string | null
          source?: string | null
          start_timeline?: string | null
          status?: string
          updated_at?: string | null
          visa_lock_reason?: string | null
          visa_locked?: boolean | null
          visa_services?: string[] | null
        }
        Update: {
          admission_services?: string[] | null
          allied_services?: string[] | null
          assigned_counselor_id?: string | null
          b2b_partner_id?: string | null
          branch?: string | null
          coaching_services?: string[] | null
          cold_pool_campaign?: string | null
          converted_at?: string | null
          converted_to_client_id?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          interested_countries?: string[] | null
          is_cold_pool?: boolean | null
          last_education?: string | null
          last_education_other?: string | null
          last_name?: string
          lead_number?: string
          lead_source?: string | null
          lead_temperature?: string
          lead_type?: string
          marital_status?: string | null
          middle_name?: string | null
          notes?: string | null
          notes_locked?: boolean | null
          notes_locked_at?: string | null
          notes_locked_by?: string | null
          phone?: string | null
          phone_country_code?: string | null
          priority?: string | null
          source?: string | null
          start_timeline?: string | null
          status?: string
          updated_at?: string | null
          visa_lock_reason?: string | null
          visa_locked?: boolean | null
          visa_services?: string[] | null
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
      notification_delivery_log: {
        Row: {
          category: string
          channel: string
          created_at: string
          error: string | null
          id: string
          metadata: Json
          status: string
          user_id: string | null
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          status: string
          user_id?: string | null
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_digest_log: {
        Row: {
          id: string
          period: string
          sent_at: string
          summary: Json
          user_id: string
        }
        Insert: {
          id?: string
          period: string
          sent_at?: string
          summary?: Json
          user_id: string
        }
        Update: {
          id?: string
          period?: string
          sent_at?: string
          summary?: Json
          user_id?: string
        }
        Relationships: []
      }
      notification_reminder_state: {
        Row: {
          entity_id: string
          entity_type: string
          escalation_level: number
          kind: string
          last_sent_at: string
          metadata: Json
          next_eligible_at: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          escalation_level?: number
          kind: string
          last_sent_at?: string
          metadata?: Json
          next_eligible_at?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          escalation_level?: number
          kind?: string
          last_sent_at?: string
          metadata?: Json
          next_eligible_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          accounting_inbox_email: string | null
          bcc_accounting_inbox: boolean
          cc_assigned_counselor: boolean
          id: boolean
          updated_at: string
        }
        Insert: {
          accounting_inbox_email?: string | null
          bcc_accounting_inbox?: boolean
          cc_assigned_counselor?: boolean
          id?: boolean
          updated_at?: string
        }
        Update: {
          accounting_inbox_email?: string | null
          bcc_accounting_inbox?: boolean
          cc_assigned_counselor?: boolean
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      notification_sla_tracking: {
        Row: {
          breached_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          resolved_at: string | null
          sla_kind: string
          sla_minutes: number
          started_at: string
        }
        Insert: {
          breached_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          resolved_at?: string | null
          sla_kind: string
          sla_minutes: number
          started_at?: string
        }
        Update: {
          breached_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          resolved_at?: string | null
          sla_kind?: string
          sla_minutes?: number
          started_at?: string
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
            foreignKeyName: "offer_audience_targets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      offer_events: {
        Row: {
          channel: string | null
          client_id: string | null
          counselor_id: string | null
          created_at: string
          event_type: string
          id: string
          offer_id: string
          revenue_amount: number
          tracking_code: string | null
        }
        Insert: {
          channel?: string | null
          client_id?: string | null
          counselor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          offer_id: string
          revenue_amount?: number
          tracking_code?: string | null
        }
        Update: {
          channel?: string | null
          client_id?: string | null
          counselor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          offer_id?: string
          revenue_amount?: number
          tracking_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "offer_events_offer_id_fkey"
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
            foreignKeyName: "offer_group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      offer_templates: {
        Row: {
          applicable_services: string[]
          channels: string[]
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          name: string
          target_countries: string[]
          trigger_condition: Json | null
          trigger_event: string | null
          trigger_type: string
          updated_at: string
          validity_days_after: number
          validity_days_before: number
        }
        Insert: {
          applicable_services?: string[]
          channels?: string[]
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          name: string
          target_countries?: string[]
          trigger_condition?: Json | null
          trigger_event?: string | null
          trigger_type: string
          updated_at?: string
          validity_days_after?: number
          validity_days_before?: number
        }
        Update: {
          applicable_services?: string[]
          channels?: string[]
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          name?: string
          target_countries?: string[]
          trigger_condition?: Json | null
          trigger_event?: string | null
          trigger_type?: string
          updated_at?: string
          validity_days_after?: number
          validity_days_before?: number
        }
        Relationships: []
      }
      offer_tracking_codes: {
        Row: {
          code: string
          counselor_id: string
          created_at: string
          id: string
          offer_id: string
        }
        Insert: {
          code: string
          counselor_id: string
          created_at?: string
          id?: string
          offer_id: string
        }
        Update: {
          code?: string
          counselor_id?: string
          created_at?: string
          id?: string
          offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_tracking_codes_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          applicable_services: string[] | null
          audience: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_redemptions: number | null
          per_client_limit: number
          promo_code: string | null
          redemption_count: number
          target_countries: string[]
          template_id: string | null
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
          currency?: string
          description?: string | null
          discount_type: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_redemptions?: number | null
          per_client_limit?: number
          promo_code?: string | null
          redemption_count?: number
          target_countries?: string[]
          template_id?: string | null
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
          currency?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          max_redemptions?: number | null
          per_client_limit?: number
          promo_code?: string | null
          redemption_count?: number
          target_countries?: string[]
          template_id?: string | null
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "offer_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profile_directors: {
        Row: {
          company_profile_id: string
          created_at: string
          id: string
          individual_profile_id: string
          ownership_percent: number | null
          role: string
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          id?: string
          individual_profile_id: string
          ownership_percent?: number | null
          role?: string
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          id?: string
          individual_profile_id?: string
          ownership_percent?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_profile_directors_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_profile_directors_individual_profile_id_fkey"
            columns: ["individual_profile_id"]
            isOneToOne: false
            referencedRelation: "owner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          aadhar_last4: string | null
          address: string | null
          avatar_color: string | null
          avatar_initials: string | null
          brand_name: string | null
          business_type: string | null
          category: string
          country: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          karta_name: string | null
          last_name: string | null
          legal_name: string | null
          linked_entity_id: string | null
          linked_individual_id: string | null
          notes: string | null
          pan_number: string | null
          personal_type: string | null
          phone: string | null
          relationship: string | null
          sin: string | null
          tags: string[]
          tax_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          aadhar_last4?: string | null
          address?: string | null
          avatar_color?: string | null
          avatar_initials?: string | null
          brand_name?: string | null
          business_type?: string | null
          category: string
          country?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          karta_name?: string | null
          last_name?: string | null
          legal_name?: string | null
          linked_entity_id?: string | null
          linked_individual_id?: string | null
          notes?: string | null
          pan_number?: string | null
          personal_type?: string | null
          phone?: string | null
          relationship?: string | null
          sin?: string | null
          tags?: string[]
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          aadhar_last4?: string | null
          address?: string | null
          avatar_color?: string | null
          avatar_initials?: string | null
          brand_name?: string | null
          business_type?: string | null
          category?: string
          country?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          karta_name?: string | null
          last_name?: string | null
          legal_name?: string | null
          linked_entity_id?: string | null
          linked_individual_id?: string | null
          notes?: string | null
          pan_number?: string | null
          personal_type?: string | null
          phone?: string | null
          relationship?: string | null
          sin?: string | null
          tags?: string[]
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string
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
      pipeline_stages: {
        Row: {
          client_label: string | null
          color: string | null
          created_at: string
          id: string
          is_client_visible: boolean
          key: string
          label: string
          notify_client: boolean
          notify_template_id: string | null
          pipeline_id: string
          sort_order: number
        }
        Insert: {
          client_label?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_client_visible?: boolean
          key: string
          label: string
          notify_client?: boolean
          notify_template_id?: string | null
          pipeline_id: string
          sort_order?: number
        }
        Update: {
          client_label?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_client_visible?: boolean
          key?: string
          label?: string
          notify_client?: boolean
          notify_template_id?: string | null
          pipeline_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "stage_pipelines"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "point_redemptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "point_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          deleted_at: string | null
          department_id: string | null
          designation: string | null
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
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
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
          branch_id?: string | null
          created_at?: string
          deleted_at?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          suspended_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
      receipt_number_sequences: {
        Row: {
          branch_code: string
          entity_code: string
          last_number: number
          year: number
        }
        Insert: {
          branch_code?: string
          entity_code?: string
          last_number?: number
          year: number
        }
        Update: {
          branch_code?: string
          entity_code?: string
          last_number?: number
          year?: number
        }
        Relationships: []
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
            foreignKeyName: "referrals_joined_client_id_fkey"
            columns: ["joined_client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
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
      service_catalogue: {
        Row: {
          bundle_note: string | null
          country_tag: string | null
          created_at: string | null
          display_order: number | null
          fee_aud: number | null
          fee_cad: number | null
          fee_gbp: number | null
          fee_inr: number | null
          gst_applicable: boolean | null
          gst_rate: number | null
          id: string
          is_active: boolean | null
          is_bundled: boolean | null
          master_key: string
          max_fee_inr: number | null
          min_fee_inr: number | null
          notes: string | null
          pricing_type: string
          service_code: string | null
          service_name: string
          sub_category: string | null
          suggested_fee_inr: number | null
          updated_at: string | null
        }
        Insert: {
          bundle_note?: string | null
          country_tag?: string | null
          created_at?: string | null
          display_order?: number | null
          fee_aud?: number | null
          fee_cad?: number | null
          fee_gbp?: number | null
          fee_inr?: number | null
          gst_applicable?: boolean | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_bundled?: boolean | null
          master_key: string
          max_fee_inr?: number | null
          min_fee_inr?: number | null
          notes?: string | null
          pricing_type?: string
          service_code?: string | null
          service_name: string
          sub_category?: string | null
          suggested_fee_inr?: number | null
          updated_at?: string | null
        }
        Update: {
          bundle_note?: string | null
          country_tag?: string | null
          created_at?: string | null
          display_order?: number | null
          fee_aud?: number | null
          fee_cad?: number | null
          fee_gbp?: number | null
          fee_inr?: number | null
          gst_applicable?: boolean | null
          gst_rate?: number | null
          id?: string
          is_active?: boolean | null
          is_bundled?: boolean | null
          master_key?: string
          max_fee_inr?: number | null
          min_fee_inr?: number | null
          notes?: string | null
          pricing_type?: string
          service_code?: string | null
          service_name?: string
          sub_category?: string | null
          suggested_fee_inr?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_library: {
        Row: {
          academy_metadata: Json
          checklist_text: string | null
          cost_summary_html: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          internal_sop_html: string | null
          is_active: boolean
          process_flow: Json | null
          quick_guide_common_mistakes: string | null
          quick_guide_escalation_rules: string | null
          quick_guide_important_reminders: string | null
          quick_guide_what_to_do: string | null
          service: string
          service_category: string
          sub_service: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academy_metadata?: Json
          checklist_text?: string | null
          cost_summary_html?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          internal_sop_html?: string | null
          is_active?: boolean
          process_flow?: Json | null
          quick_guide_common_mistakes?: string | null
          quick_guide_escalation_rules?: string | null
          quick_guide_important_reminders?: string | null
          quick_guide_what_to_do?: string | null
          service: string
          service_category: string
          sub_service: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academy_metadata?: Json
          checklist_text?: string | null
          cost_summary_html?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          internal_sop_html?: string | null
          is_active?: boolean
          process_flow?: Json | null
          quick_guide_common_mistakes?: string | null
          quick_guide_escalation_rules?: string | null
          quick_guide_important_reminders?: string | null
          quick_guide_what_to_do?: string | null
          service?: string
          service_category?: string
          sub_service?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      service_library_attachments: {
        Row: {
          country: string | null
          created_at: string
          display_order: number
          file_name: string
          file_path: string
          id: string
          label: string | null
          library_id: string
          mime_type: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          display_order?: number
          file_name: string
          file_path: string
          id?: string
          label?: string | null
          library_id: string
          mime_type?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          display_order?: number
          file_name?: string
          file_path?: string
          id?: string
          label?: string | null
          library_id?: string
          mime_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_attachments_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_checklist_files: {
        Row: {
          country: string | null
          created_at: string
          file_name: string
          file_path: string
          id: string
          is_current: boolean
          library_id: string
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          country?: string | null
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          is_current?: boolean
          library_id: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Update: {
          country?: string | null
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          is_current?: boolean
          library_id?: string
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_library_checklist_files_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_countries: {
        Row: {
          country: string
          created_at: string
          id: string
          library_id: string
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          library_id: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          library_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_countries_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_fee_items: {
        Row: {
          amount: string | null
          country: string | null
          created_at: string
          currency: string | null
          display_order: number
          fee_label: string
          id: string
          library_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          fee_label: string
          id?: string
          library_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          display_order?: number
          fee_label?: string
          id?: string
          library_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_fee_items_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_migration_log: {
        Row: {
          country_mappings_created: number
          duplicates_merged: number
          id: string
          masters_remaining: number
          overrides_created: number
          ran_at: string
        }
        Insert: {
          country_mappings_created?: number
          duplicates_merged?: number
          id?: string
          masters_remaining?: number
          overrides_created?: number
          ran_at?: string
        }
        Update: {
          country_mappings_created?: number
          duplicates_merged?: number
          id?: string
          masters_remaining?: number
          overrides_created?: number
          ran_at?: string
        }
        Relationships: []
      }
      service_library_overrides: {
        Row: {
          academy_metadata: Json
          checklist_text: string | null
          cost_summary_html: string | null
          country: string
          created_at: string
          id: string
          internal_sop_html: string | null
          library_id: string
          process_flow: Json | null
          quick_guide_common_mistakes: string | null
          quick_guide_escalation_rules: string | null
          quick_guide_important_reminders: string | null
          quick_guide_what_to_do: string | null
          updated_at: string
        }
        Insert: {
          academy_metadata?: Json
          checklist_text?: string | null
          cost_summary_html?: string | null
          country: string
          created_at?: string
          id?: string
          internal_sop_html?: string | null
          library_id: string
          process_flow?: Json | null
          quick_guide_common_mistakes?: string | null
          quick_guide_escalation_rules?: string | null
          quick_guide_important_reminders?: string | null
          quick_guide_what_to_do?: string | null
          updated_at?: string
        }
        Update: {
          academy_metadata?: Json
          checklist_text?: string | null
          cost_summary_html?: string | null
          country?: string
          created_at?: string
          id?: string
          internal_sop_html?: string | null
          library_id?: string
          process_flow?: Json | null
          quick_guide_common_mistakes?: string | null
          quick_guide_escalation_rules?: string | null
          quick_guide_important_reminders?: string | null
          quick_guide_what_to_do?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_overrides_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_sop_completions: {
        Row: {
          client_id: string | null
          completed_at: string
          created_at: string
          id: string
          lead_id: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_sop_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "service_library_sop_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_sop_tasks: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          library_id: string
          sort_order: number
          task_text: string
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          library_id: string
          sort_order?: number
          task_text: string
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          library_id?: string
          sort_order?: number
          task_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_sop_tasks_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_submission_checklist: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean
          is_mandatory: boolean
          item_key: string
          item_label: string
          library_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          item_key: string
          item_label: string
          library_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          item_key?: string
          item_label?: string
          library_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_submission_checklist_library_id_fkey"
            columns: ["library_id"]
            isOneToOne: false
            referencedRelation: "service_library"
            referencedColumns: ["id"]
          },
        ]
      }
      service_library_submission_completions: {
        Row: {
          client_id: string | null
          completed_at: string
          created_at: string
          id: string
          item_id: string
          lead_id: string | null
          user_id: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          item_id: string
          lead_id?: string | null
          user_id: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string
          created_at?: string
          id?: string
          item_id?: string
          lead_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_library_submission_completions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "service_library_submission_checklist"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offers: {
        Row: {
          applicable_branches: string[] | null
          applicable_services: string[] | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          discount_amount_inr: number | null
          discount_percent: number | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          max_uses: number | null
          min_services_for_combo: number | null
          notes: string | null
          offer_code: string | null
          offer_name: string
          offer_type: string
          uses_count: number | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          applicable_branches?: string[] | null
          applicable_services?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount_inr?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          max_uses?: number | null
          min_services_for_combo?: number | null
          notes?: string | null
          offer_code?: string | null
          offer_name: string
          offer_type: string
          uses_count?: number | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          applicable_branches?: string[] | null
          applicable_services?: string[] | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          discount_amount_inr?: number | null
          discount_percent?: number | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          max_uses?: number | null
          min_services_for_combo?: number | null
          notes?: string | null
          offer_code?: string | null
          offer_name?: string
          offer_type?: string
          uses_count?: number | null
          valid_from?: string
          valid_until?: string | null
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
      stage_pipelines: {
        Row: {
          country: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          service_category: string
          updated_at: string
        }
        Insert: {
          country: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          service_category: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          service_category?: string
          updated_at?: string
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
          sbc_password_set: boolean | null
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
          sbc_password_set?: boolean | null
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
          sbc_password_set?: boolean | null
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
      upi_claim_cycles: {
        Row: {
          claim_due_date: string | null
          created_at: string
          currency: string | null
          id: string
          institution_id: string
          intake: string | null
          invoice_due_date: string | null
          metadata: Json | null
          notes: string | null
          period_label: string
          status: string | null
          total_expected: number | null
          total_received: number | null
          updated_at: string
        }
        Insert: {
          claim_due_date?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          institution_id: string
          intake?: string | null
          invoice_due_date?: string | null
          metadata?: Json | null
          notes?: string | null
          period_label: string
          status?: string | null
          total_expected?: number | null
          total_received?: number | null
          updated_at?: string
        }
        Update: {
          claim_due_date?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          institution_id?: string
          intake?: string | null
          invoice_due_date?: string | null
          metadata?: Json | null
          notes?: string | null
          period_label?: string
          status?: string | null
          total_expected?: number | null
          total_received?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_claim_cycles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
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
          approved_date: string | null
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
          invoice_date: string
          invoice_number: string
          metadata: Json | null
          notes: string | null
          overdue_since: string | null
          paid_date: string | null
          payment_method: string | null
          payment_received_amount: number | null
          payment_received_date: string | null
          payment_reference: string | null
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
          approved_date?: string | null
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
          invoice_date: string
          invoice_number: string
          metadata?: Json | null
          notes?: string | null
          overdue_since?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_received_amount?: number | null
          payment_received_date?: string | null
          payment_reference?: string | null
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
          approved_date?: string | null
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
          invoice_date?: string
          invoice_number?: string
          metadata?: Json | null
          notes?: string | null
          overdue_since?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_received_amount?: number | null
          payment_received_date?: string | null
          payment_reference?: string | null
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
      upi_commission_students: {
        Row: {
          block_notes: string | null
          block_reason: string | null
          campus: string | null
          carried_from_cycle_id: string | null
          carry_forward_reason: string | null
          carry_forward_to_cycle_id: string | null
          cas_issued_date: string | null
          claim_cycle_id: string
          client_id: string | null
          commission_amount: number | null
          commission_calculated_date: string | null
          commission_id: string | null
          commission_paid_date: string | null
          commission_rate_applied: number | null
          commission_status: string | null
          consent_form_date: string | null
          consent_form_submitted: boolean | null
          consent_form_withdrawn: boolean | null
          consent_withdrawal_before_sp: boolean | null
          consent_withdrawal_date: string | null
          country_of_origin: string | null
          created_at: string | null
          enrollment_confirmed_date: string | null
          enrollment_status: string | null
          id: string
          institution_id: string | null
          institution_validation_notes: string | null
          intake_month: string | null
          intake_term: string | null
          intake_year: number | null
          invoice_id: string | null
          is_carried_forward: boolean | null
          is_full_time: boolean | null
          metadata: Json | null
          nationality: string | null
          passport_number: string | null
          program_duration: string | null
          program_level: string | null
          program_name: string
          registered_credits: number | null
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
          block_notes?: string | null
          block_reason?: string | null
          campus?: string | null
          carried_from_cycle_id?: string | null
          carry_forward_reason?: string | null
          carry_forward_to_cycle_id?: string | null
          cas_issued_date?: string | null
          claim_cycle_id: string
          client_id?: string | null
          commission_amount?: number | null
          commission_calculated_date?: string | null
          commission_id?: string | null
          commission_paid_date?: string | null
          commission_rate_applied?: number | null
          commission_status?: string | null
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          consent_form_withdrawn?: boolean | null
          consent_withdrawal_before_sp?: boolean | null
          consent_withdrawal_date?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          enrollment_confirmed_date?: string | null
          enrollment_status?: string | null
          id?: string
          institution_id?: string | null
          institution_validation_notes?: string | null
          intake_month?: string | null
          intake_term?: string | null
          intake_year?: number | null
          invoice_id?: string | null
          is_carried_forward?: boolean | null
          is_full_time?: boolean | null
          metadata?: Json | null
          nationality?: string | null
          passport_number?: string | null
          program_duration?: string | null
          program_level?: string | null
          program_name: string
          registered_credits?: number | null
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
          block_notes?: string | null
          block_reason?: string | null
          campus?: string | null
          carried_from_cycle_id?: string | null
          carry_forward_reason?: string | null
          carry_forward_to_cycle_id?: string | null
          cas_issued_date?: string | null
          claim_cycle_id?: string
          client_id?: string | null
          commission_amount?: number | null
          commission_calculated_date?: string | null
          commission_id?: string | null
          commission_paid_date?: string | null
          commission_rate_applied?: number | null
          commission_status?: string | null
          consent_form_date?: string | null
          consent_form_submitted?: boolean | null
          consent_form_withdrawn?: boolean | null
          consent_withdrawal_before_sp?: boolean | null
          consent_withdrawal_date?: string | null
          country_of_origin?: string | null
          created_at?: string | null
          enrollment_confirmed_date?: string | null
          enrollment_status?: string | null
          id?: string
          institution_id?: string | null
          institution_validation_notes?: string | null
          intake_month?: string | null
          intake_term?: string | null
          intake_year?: number | null
          invoice_id?: string | null
          is_carried_forward?: boolean | null
          is_full_time?: boolean | null
          metadata?: Json | null
          nationality?: string | null
          passport_number?: string | null
          program_duration?: string | null
          program_level?: string | null
          program_name?: string
          registered_credits?: number | null
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
            foreignKeyName: "upi_commission_students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
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
          is_pgwp_eligible: boolean | null
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
          is_pgwp_eligible?: boolean | null
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
          is_pgwp_eligible?: boolean | null
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
      upi_document_pipeline_events: {
        Row: {
          created_at: string
          document_id: string
          edge_function: string | null
          id: string
          message: string | null
          payload: Json | null
          state: string
        }
        Insert: {
          created_at?: string
          document_id: string
          edge_function?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          state: string
        }
        Update: {
          created_at?: string
          document_id?: string
          edge_function?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_document_pipeline_events_document_id_fkey"
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
          document_id: string | null
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
          document_id?: string | null
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
          document_id?: string | null
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
            foreignKeyName: "upi_institution_sources_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "upi_uploaded_documents"
            referencedColumns: ["id"]
          },
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
      upi_invoice_line_items: {
        Row: {
          commission_rate: number | null
          description: string
          id: string
          intake_term: string | null
          invoice_id: string
          line_amount: number
          notes: string | null
          program_name: string | null
          sort_order: number | null
          student_id: string | null
          student_name: string | null
          tuition_amount: number | null
        }
        Insert: {
          commission_rate?: number | null
          description: string
          id?: string
          intake_term?: string | null
          invoice_id: string
          line_amount: number
          notes?: string | null
          program_name?: string | null
          sort_order?: number | null
          student_id?: string | null
          student_name?: string | null
          tuition_amount?: number | null
        }
        Update: {
          commission_rate?: number | null
          description?: string
          id?: string
          intake_term?: string | null
          invoice_id?: string
          line_amount?: number
          notes?: string | null
          program_name?: string | null
          sort_order?: number | null
          student_id?: string | null
          student_name?: string | null
          tuition_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "upi_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_invoice_line_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "upi_commission_students"
            referencedColumns: ["id"]
          },
        ]
      }
      upi_invoices: {
        Row: {
          amount: number | null
          claim_cycle_id: string | null
          created_at: string
          currency: string | null
          file_path: string | null
          id: string
          institution_id: string
          invoice_no: string | null
          metadata: Json | null
          paid_at: string | null
          sent_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          claim_cycle_id?: string | null
          created_at?: string
          currency?: string | null
          file_path?: string | null
          id?: string
          institution_id: string
          invoice_no?: string | null
          metadata?: Json | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          claim_cycle_id?: string | null
          created_at?: string
          currency?: string | null
          file_path?: string | null
          id?: string
          institution_id?: string
          invoice_no?: string | null
          metadata?: Json | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_invoices_claim_cycle_id_fkey"
            columns: ["claim_cycle_id"]
            isOneToOne: false
            referencedRelation: "upi_claim_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upi_invoices_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "upi_institutions"
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
      upi_renewal_alerts: {
        Row: {
          agreement_id: string
          created_at: string
          dismissed_at: string | null
          dismissed_by: string | null
          fire_at: string
          id: string
          risk_flags: Json | null
          status: string | null
          threshold_days: number
        }
        Insert: {
          agreement_id: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          fire_at: string
          id?: string
          risk_flags?: Json | null
          status?: string | null
          threshold_days: number
        }
        Update: {
          agreement_id?: string
          created_at?: string
          dismissed_at?: string | null
          dismissed_by?: string | null
          fire_at?: string
          id?: string
          risk_flags?: Json | null
          status?: string | null
          threshold_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "upi_renewal_alerts_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "upi_agreements"
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
      upi_sync_queue: {
        Row: {
          attempts: number
          course_title: string | null
          created_at: string
          id: string
          institution_id: string | null
          job_id: string
          last_error: string | null
          program_url: string
          source_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          course_title?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          job_id: string
          last_error?: string | null
          program_url: string
          source_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          course_title?: string | null
          created_at?: string
          id?: string
          institution_id?: string | null
          job_id?: string
          last_error?: string | null
          program_url?: string
          source_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upi_sync_queue_job_id_fkey"
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
          extracted_payload: Json | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_type: string | null
          id: string
          institution_id: string | null
          is_processed: boolean | null
          linked_record_refs: Json | null
          metadata: Json | null
          mime_type: string | null
          page_count: number | null
          pipeline_status: string | null
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
          extracted_payload?: Json | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          institution_id?: string | null
          is_processed?: boolean | null
          linked_record_refs?: Json | null
          metadata?: Json | null
          mime_type?: string | null
          page_count?: number | null
          pipeline_status?: string | null
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
          extracted_payload?: Json | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          institution_id?: string | null
          is_processed?: boolean | null
          linked_record_refs?: Json | null
          metadata?: Json | null
          mime_type?: string | null
          page_count?: number | null
          pipeline_status?: string | null
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
      user_module_permissions: {
        Row: {
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          module: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          module: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          module?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_prefs: {
        Row: {
          browser_push_enabled: boolean
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          browser_push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          browser_push_enabled?: boolean
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
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
          {
            foreignKeyName: "voice_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
      wallet_allocations: {
        Row: {
          amount: number
          applied_at: string | null
          applies_service_code: string | null
          approved_by: string | null
          client_id: string | null
          client_offer_id: string | null
          counselor_id: string
          created_at: string
          created_by: string | null
          currency: string
          exceeded_cap: boolean
          id: string
          invoice_id: string | null
          lead_id: string | null
          offer_id: string | null
          percent: number | null
          reversal_reason: string | null
          reversed_at: string | null
          status: Database["public"]["Enums"]["wallet_alloc_status"]
          wallet_id: string
        }
        Insert: {
          amount: number
          applied_at?: string | null
          applies_service_code?: string | null
          approved_by?: string | null
          client_id?: string | null
          client_offer_id?: string | null
          counselor_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exceeded_cap?: boolean
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          offer_id?: string | null
          percent?: number | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: Database["public"]["Enums"]["wallet_alloc_status"]
          wallet_id: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          applies_service_code?: string | null
          approved_by?: string | null
          client_id?: string | null
          client_offer_id?: string | null
          counselor_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          exceeded_cap?: boolean
          id?: string
          invoice_id?: string | null
          lead_id?: string | null
          offer_id?: string | null
          percent?: number | null
          reversal_reason?: string | null
          reversed_at?: string | null
          status?: Database["public"]["Enums"]["wallet_alloc_status"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_allocations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_allocations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_allocations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "wallet_allocations_client_offer_id_fkey"
            columns: ["client_offer_id"]
            isOneToOne: false
            referencedRelation: "client_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoice_aging"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "wallet_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "client_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_allocations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_allocations_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "discount_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          currency: string
          entry_type: string
          id: string
          note: string | null
          ref_allocation_id: string | null
          ref_topup_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          entry_type: string
          id?: string
          note?: string | null
          ref_allocation_id?: string | null
          ref_topup_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          currency?: string
          entry_type?: string
          id?: string
          note?: string | null
          ref_allocation_id?: string | null
          ref_topup_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_ref_allocation_id_fkey"
            columns: ["ref_allocation_id"]
            isOneToOne: false
            referencedRelation: "wallet_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_ref_topup_id_fkey"
            columns: ["ref_topup_id"]
            isOneToOne: false
            referencedRelation: "wallet_topups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "discount_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_settings: {
        Row: {
          grace_days: number
          grace_unit: string
          id: number
          updated_at: string
        }
        Insert: {
          grace_days?: number
          grace_unit?: string
          id?: number
          updated_at?: string
        }
        Update: {
          grace_days?: number
          grace_unit?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      wallet_topup_rules: {
        Row: {
          branch_id: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          max_achievement_pct: number | null
          min_achievement_pct: number
          role_key: string | null
          rollover_policy: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_type: string
          topup_amount: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_achievement_pct?: number | null
          min_achievement_pct?: number
          role_key?: string | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_type?: string
          topup_amount?: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          max_achievement_pct?: number | null
          min_achievement_pct?: number
          role_key?: string | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scope_type?: string
          topup_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topup_rules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          reason: string | null
          rollover_cap: number | null
          rollover_policy: Database["public"]["Enums"]["wallet_rollover_policy"]
          scheme_id: string | null
          topup_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          reason?: string | null
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scheme_id?: string | null
          topup_type?: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          reason?: string | null
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["wallet_rollover_policy"]
          scheme_id?: string | null
          topup_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "incentive_schemes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "discount_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_business_lines: {
        Row: {
          active: boolean
          assigned_user_id: string | null
          created_at: string
          display_phone: string | null
          id: string
          is_default: boolean
          label: string
          line_type: string
          meta_phone_number_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          assigned_user_id?: string | null
          created_at?: string
          display_phone?: string | null
          id?: string
          is_default?: boolean
          label: string
          line_type?: string
          meta_phone_number_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          assigned_user_id?: string | null
          created_at?: string
          display_phone?: string | null
          id?: string
          is_default?: boolean
          label?: string
          line_type?: string
          meta_phone_number_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_conversation_assignments: {
        Row: {
          assigned_by_user_id: string | null
          assigned_user_id: string
          conversation_id: string
          created_at: string
          id: string
        }
        Insert: {
          assigned_by_user_id?: string | null
          assigned_user_id: string
          conversation_id: string
          created_at?: string
          id?: string
        }
        Update: {
          assigned_by_user_id?: string | null
          assigned_user_id?: string
          conversation_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          ai_mode: string
          assigned_user_id: string | null
          business_line_id: string | null
          client_id: string | null
          created_at: string
          id: string
          intake_data: Json
          last_inbound_at: string | null
          last_message_at: string | null
          lead_id: string | null
          phone_display: string | null
          phone_e164: string
          status: string
          unread_count_staff: number
          updated_at: string
        }
        Insert: {
          ai_mode?: string
          assigned_user_id?: string | null
          business_line_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          intake_data?: Json
          last_inbound_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          phone_display?: string | null
          phone_e164: string
          status?: string
          unread_count_staff?: number
          updated_at?: string
        }
        Update: {
          ai_mode?: string
          assigned_user_id?: string | null
          business_line_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          intake_data?: Json
          last_inbound_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          phone_display?: string | null
          phone_e164?: string
          status?: string
          unread_count_staff?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_business_line_id_fkey"
            columns: ["business_line_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_business_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_clients_masked"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          active: boolean
          body_preview: string | null
          created_at: string
          id: string
          label: string
          language_code: string
          name: string
          param_count: number
          param_labels: Json
          updated_at: string
        }
        Insert: {
          active?: boolean
          body_preview?: string | null
          created_at?: string
          id?: string
          label: string
          language_code?: string
          name: string
          param_count?: number
          param_labels?: Json
          updated_at?: string
        }
        Update: {
          active?: boolean
          body_preview?: string | null
          created_at?: string
          id?: string
          label?: string
          language_code?: string
          name?: string
          param_count?: number
          param_labels?: Json
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_mime: string | null
          media_provider_id: string | null
          media_storage_path: string | null
          message_type: string
          provider_message_id: string | null
          sent_by: string
          sent_by_user_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          media_mime?: string | null
          media_provider_id?: string | null
          media_storage_path?: string | null
          message_type?: string
          provider_message_id?: string | null
          sent_by?: string
          sent_by_user_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_mime?: string | null
          media_provider_id?: string | null
          media_storage_path?: string | null
          message_type?: string
          provider_message_id?: string | null
          sent_by?: string
          sent_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
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
      accounting_vendors_safe: {
        Row: {
          bank_account: string | null
          bank_ifsc: string | null
          bank_name: string | null
          bank_swift: string | null
          category: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          email: string | null
          id: string | null
          linked_coa_id: string | null
          name: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
        }
        Insert: {
          bank_account?: never
          bank_ifsc?: never
          bank_name?: string | null
          bank_swift?: never
          category?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string | null
          linked_coa_id?: string | null
          name?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: never
          updated_at?: string | null
        }
        Update: {
          bank_account?: never
          bank_ifsc?: never
          bank_name?: string | null
          bank_swift?: never
          category?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          email?: string | null
          id?: string | null
          linked_coa_id?: string | null
          name?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          status?: string | null
          tax_id?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "vw_counselor_productivity"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "accounting_vendors_linked_coa_id_fkey"
            columns: ["linked_coa_id"]
            isOneToOne: false
            referencedRelation: "accounting_coa"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoice_aging: {
        Row: {
          aging_bucket: string | null
          amount: number | null
          amount_paid: number | null
          balance_due: number | null
          client_id: string | null
          currency: string | null
          days_overdue: number | null
          due_date: string | null
          escalation_level: number | null
          invoice_id: string | null
          invoice_number: string | null
          status: string | null
        }
        Insert: {
          aging_bucket?: never
          amount?: number | null
          amount_paid?: number | null
          balance_due?: never
          client_id?: string | null
          currency?: string | null
          days_overdue?: never
          due_date?: string | null
          escalation_level?: number | null
          invoice_id?: string | null
          invoice_number?: string | null
          status?: string | null
        }
        Update: {
          aging_bucket?: never
          amount?: number | null
          amount_paid?: number | null
          balance_due?: never
          client_id?: string | null
          currency?: string | null
          days_overdue?: never
          due_date?: string | null
          escalation_level?: number | null
          invoice_id?: string | null
          invoice_number?: string | null
          status?: string | null
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
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vw_client_current_stage"
            referencedColumns: ["client_id"]
          },
        ]
      }
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
      v_calendar_activity_feed: {
        Row: {
          actor_id: string | null
          actor_kind: string | null
          appointment_type: string | null
          at: string | null
          event_date: string | null
          event_id: string | null
          event_reference: string | null
          event_title: string | null
          from_status:
            | Database["public"]["Enums"]["calendar_event_status"]
            | null
          host_user_id: string | null
          id: string | null
          start_time: string | null
          to_status: Database["public"]["Enums"]["calendar_event_status"] | null
          visitor_email: string | null
          visitor_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_audit_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
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
      vw_client_current_stage: {
        Row: {
          client_id: string | null
          client_label: string | null
          client_progress_percent: number | null
          current_stage_id: string | null
          is_client_visible: boolean | null
          notify_client: boolean | null
          pipeline_country: string | null
          pipeline_id: string | null
          pipeline_name: string | null
          progress_percent: number | null
          service_category: string | null
          stage_color: string | null
          stage_key: string | null
          stage_label: string | null
          stage_order: number | null
          total_client_stages: number | null
          total_stages: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "vw_portal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "stage_pipelines"
            referencedColumns: ["id"]
          },
        ]
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
      vw_portal_stages: {
        Row: {
          color: string | null
          id: string | null
          label: string | null
          pipeline_id: string | null
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          id?: string | null
          label?: never
          pipeline_id?: string | null
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          id?: string | null
          label?: never
          pipeline_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "stage_pipelines"
            referencedColumns: ["id"]
          },
        ]
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
      acct_user_has_module: {
        Args: { _level: string; _module: string; _uid: string }
        Returns: boolean
      }
      assessment_lead_has_creator: {
        Args: { _lead_id: string; _uid: string }
        Returns: boolean
      }
      calendar_available_slots: {
        Args: { _date: string; _meeting_type_id: string; _slug: string }
        Returns: string[]
      }
      calendar_create_booking: {
        Args: {
          _date: string
          _meeting_type_id: string
          _notes: string
          _purpose: string
          _slug: string
          _start_time: string
          _visitor: Json
          _visitor_timezone: string
        }
        Returns: Json
      }
      calendar_event_transition: {
        Args: { _action: string; _event_id: string }
        Returns: {
          appointment_type: string | null
          cancellation_reason: string | null
          created_at: string
          end_time: string
          event_date: string
          event_reference: string | null
          event_title: string | null
          host_remarks: string | null
          host_timezone: string
          id: string
          internal_notes: string | null
          meeting_link: string | null
          meeting_type_id: string
          notes: string | null
          purpose: string | null
          requester_response_at: string | null
          reschedule_proposed_date: string | null
          reschedule_proposed_end: string | null
          reschedule_proposed_start: string | null
          reschedule_reason: string | null
          start_time: string
          status: Database["public"]["Enums"]["calendar_event_status"]
          updated_at: string
          user_id: string
          visitor_timezone: string
        }
        SetofOptions: {
          from: "*"
          to: "calendar_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calendar_generate_slug: { Args: { _base: string }; Returns: string }
      calendar_resolve_profile: { Args: { _slug: string }; Returns: Json }
      calendar_validate_token: { Args: { _token: string }; Returns: string }
      can_edit_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_manage_service_library: {
        Args: { _user_id: string }
        Returns: boolean
      }
      can_manage_upi_catalog: { Args: { _uid: string }; Returns: boolean }
      can_manage_upi_confidential: { Args: { _uid: string }; Returns: boolean }
      can_upload_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_view_client: {
        Args: { _cid: string; _uid: string }
        Returns: boolean
      }
      can_view_upi_catalog: { Args: { _uid: string }; Returns: boolean }
      can_view_upi_confidential: { Args: { _uid: string }; Returns: boolean }
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
      client_convert_debug: {
        Args: {
          _allowed: boolean
          _assigned_counselor_id: string
          _cid: string
          _condition: string
          _created_by: string
          _owner_id: string
          _payload: Json
          _phase: string
          _policy: string
        }
        Returns: boolean
      }
      convert_assessment_to_client: {
        Args: { _session_id: string }
        Returns: Json
      }
      counselor_offer_stats: {
        Args: { _date_from?: string; _date_to?: string }
        Returns: {
          attributed_revenue: number
          counselor_id: string
          counselor_name: string
          redemptions: number
          total_discount: number
        }[]
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
          admission_services: string[]
          allied_services: string[]
          alternate_phone: string | null
          application_id: string
          application_type: string
          assigned_counselor_id: string | null
          billing_entity: string | null
          branch: string | null
          budget: number | null
          client_type: string | null
          coaching_services: string[]
          consent_form_date: string | null
          consent_form_submitted: boolean | null
          converted_at: string | null
          counselor_notes: string | null
          counselor_notes_locked: boolean
          counselor_notes_locked_at: string | null
          counselor_notes_unlock_reason: string | null
          country: string
          country_code: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string
          created_by: string | null
          current_stage_id: string | null
          date_of_birth: string | null
          department: string | null
          education_history: Json
          email: string | null
          email_alternate: string | null
          english_overall: string | null
          english_sections: Json
          english_test: string | null
          english_test_date: string | null
          english_test_expiry: string | null
          enrollment_probability: number | null
          extra_items: Json
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          institution_name: string | null
          institution_student_id: string | null
          intake: string | null
          interested_countries: string[]
          interested_country: string | null
          interested_course: string | null
          last_education: string | null
          last_education_other: string | null
          last_name: string | null
          lead_score: number
          lead_score_reasons: Json
          lead_source: string | null
          lead_stage: string | null
          lead_temperature: string | null
          linked_institution_id: string | null
          linked_student_record_id: string | null
          marital_status: string | null
          middle_name: string | null
          national_id_last4: string | null
          next_followup_at: string | null
          notes: string | null
          odoo_lead_id: number | null
          odoo_partner_id: number | null
          odoo_synced_at: string | null
          other_tests: Json
          owner_id: string | null
          pan_number: string | null
          parent_contact: string | null
          passport_expiry: string | null
          passport_number: string | null
          payment_terms: string | null
          percentage_cgpa: string | null
          phone: string | null
          phone_alternate: string | null
          phone_country_code: string | null
          pipeline_id: string | null
          preferred_contact_time: string | null
          preferred_language: string | null
          priority: string | null
          registration_number: string | null
          service_fees: Json
          source_lead_id: string | null
          status: string
          study_permit_approved_date: string | null
          study_permit_expiry: string | null
          study_permit_number: string | null
          suppressed_template_items: string[]
          tags: string[]
          tax_id: string | null
          template_id: string | null
          timezone: string | null
          travel_financial_services: string[]
          updated_at: string
          visa_services: string[]
          whatsapp: string | null
          work_experience: Json
          workflow_template_id: string | null
          year_of_passing: number | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_invoice_from_services: {
        Args: {
          p_branch_id?: string
          p_client_id: string
          p_currency?: string
          p_due_date?: string
          p_firm_entity_id?: string
          p_installments?: Json
          p_service_ids: string[]
        }
        Returns: string
      }
      create_lead_from_family_member: {
        Args: { _family_member_id: string }
        Returns: {
          admission_services: string[] | null
          allied_services: string[] | null
          assigned_counselor_id: string | null
          b2b_partner_id: string | null
          branch: string | null
          coaching_services: string[] | null
          cold_pool_campaign: string | null
          converted_at: string | null
          converted_to_client_id: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          first_name: string
          gender: string | null
          id: string
          interested_countries: string[] | null
          is_cold_pool: boolean | null
          last_education: string | null
          last_education_other: string | null
          last_name: string
          lead_number: string
          lead_source: string | null
          lead_temperature: string
          lead_type: string
          marital_status: string | null
          middle_name: string | null
          notes: string | null
          notes_locked: boolean | null
          notes_locked_at: string | null
          notes_locked_by: string | null
          phone: string | null
          phone_country_code: string | null
          priority: string | null
          source: string | null
          start_timeline: string | null
          status: string
          updated_at: string | null
          visa_lock_reason: string | null
          visa_locked: boolean | null
          visa_services: string[] | null
        }
        SetofOptions: {
          from: "*"
          to: "leads"
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
      dsh_can: { Args: { _level: string; _uid: string }; Returns: boolean }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      fn_close_due_wallets: { Args: never; Returns: number }
      fn_close_wallet: { Args: { _wallet_id: string }; Returns: string }
      fn_convert: {
        Args: {
          _amount: number
          _from: string
          _period_key: string
          _to: string
        }
        Returns: number
      }
      fn_fx_rate: {
        Args: { _ccy: string; _period_key: string }
        Returns: number
      }
      fn_get_or_create_wallet: {
        Args: {
          _branch: string
          _counselor: string
          _currency: string
          _max_amt: number
          _max_pct: number
          _period: string
        }
        Returns: string
      }
      fn_next_period_key: {
        Args: { _period_key: string; _valid_to: string }
        Returns: string
      }
      fn_reinstate_wallet: {
        Args: { _to_period?: string; _wallet_id: string }
        Returns: string
      }
      fn_release_expired_reservations: { Args: never; Returns: number }
      fn_suggest_meeting_slug: {
        Args: { _base: string; _user: string }
        Returns: string
      }
      fn_suggest_profile_slug: { Args: { _base: string }; Returns: string }
      fn_user_manages_user: {
        Args: { _manager: string; _target: string }
        Returns: boolean
      }
      generate_client_registration_number: { Args: never; Returns: string }
      generate_invoice_number: {
        Args: { p_branch_code: string; p_entity_code: string }
        Returns: string
      }
      generate_lead_number: { Args: { p_type: string }; Returns: string }
      generate_offer_tracking_code: {
        Args: { _counselor_id: string; _offer_id: string }
        Returns: string
      }
      generate_receipt_number: {
        Args: { p_branch_code: string; p_entity_code: string }
        Returns: string
      }
      get_assessment_invite_token: {
        Args: { _invite_id: string }
        Returns: string
      }
      get_portal_invite_token: { Args: { _invite_id: string }; Returns: string }
      has_any_app_role: {
        Args: { _roles: string[]; _uid: string }
        Returns: boolean
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
      is_accounting_user: { Args: { _uid: string }; Returns: boolean }
      is_chat_channel_member: {
        Args: { _channel: string; _uid: string }
        Returns: boolean
      }
      is_client_admin: { Args: { _uid: string }; Returns: boolean }
      is_client_operational_staff: { Args: { _uid: string }; Returns: boolean }
      is_client_staff_editor: { Args: { _uid: string }; Returns: boolean }
      is_client_staff_viewer: { Args: { _uid: string }; Returns: boolean }
      is_commission_admin: { Args: { _uid: string }; Returns: boolean }
      is_confidential_upi_document: {
        Args: { _metadata: Json }
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
      list_assessment_sessions_admin: {
        Args: { _limit?: number }
        Returns: {
          answers: Json
          client_email: string
          client_id: string
          client_name: string
          client_phone: string
          country: string
          created_at: string
          goal: string
          id: string
          lead_email: string
          lead_id: string
          lead_name: string
          lead_phone: string
          output: Json
          pdf_path: string
          status: string
          submitted_at: string
        }[]
      }
      list_assignable_staff: {
        Args: never
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      list_assignable_teams: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      log_offer_event: {
        Args: {
          _channel?: string
          _client_id?: string
          _counselor_id?: string
          _event_type?: string
          _offer_id: string
          _revenue_amount?: number
          _tracking_code?: string
        }
        Returns: string
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_phone_digits: { Args: { p_raw: string }; Returns: string }
      offer_roi_stats: {
        Args: { _date_from?: string; _date_to?: string }
        Returns: {
          claims: number
          influenced_revenue: number
          is_active: boolean
          offer_id: string
          redemption_rate: number
          redemptions: number
          title: string
          total_discount: number
          views: number
        }[]
      }
      offers_eligible_for_client: {
        Args: { _client_id: string; _service_codes?: string[] }
        Returns: {
          applicable_services: string[] | null
          audience: string
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_amount: number | null
          max_redemptions: number | null
          per_client_limit: number
          promo_code: string | null
          redemption_count: number
          target_countries: string[]
          template_id: string | null
          terms_conditions: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      phone_digits_match: { Args: { a: string; b: string }; Returns: boolean }
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
      upi_canonical_course_title: {
        Args: { level?: string; title: string }
        Returns: string
      }
      upi_course_dedup_hash: {
        Args: {
          _campus_name: string
          _course_title: string
          _institution_id: string
          _program_level: string
          _program_level_id: string
        }
        Returns: string
      }
      upi_course_dedup_key: {
        Args: {
          _campus_name: string
          _course_title: string
          _institution_id: string
          _program_level: string
          _program_level_id: string
        }
        Returns: string
      }
      upi_course_dedup_level: {
        Args: { _metadata: Json; _program_level_id: string }
        Returns: string
      }
      upi_staging_row_dedup_hash: {
        Args: {
          _campus_name: string
          _course_title: string
          _institution_id: string
          _metadata: Json
          _program_level_id: string
        }
        Returns: string
      }
      user_can_see_offer: {
        Args: { _offer_id: string; _uid: string }
        Returns: boolean
      }
      user_client_permission: {
        Args: { _cid: string; _uid: string }
        Returns: Database["public"]["Enums"]["client_permission"]
      }
      user_has_module: {
        Args: { _level: string; _module: string; _uid: string }
        Returns: boolean
      }
      user_telephony_agent_id: { Args: { _uid: string }; Returns: string }
      whatsapp_can_edit_conversation: {
        Args: { _conv_id: string; _uid: string }
        Returns: boolean
      }
      whatsapp_can_view_conversation: {
        Args: { _conv_id: string; _uid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "counselor"
        | "documentation"
        | "viewer"
        | "telecaller"
        | "client"
        | "commission_admin"
        | "administrator"
        | "manager"
      assessment_invite_status: "pending" | "registered" | "expired" | "revoked"
      assessment_lead_source:
        | "invite"
        | "referral"
        | "existing_client"
        | "public"
      assessment_session_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "counselor_reviewed"
        | "archived"
      calendar_event_status:
        | "pending"
        | "scheduled"
        | "completed"
        | "cancelled"
        | "declined"
        | "no_show"
        | "awaiting_requester"
        | "confirmed"
        | "declined_by_requester"
        | "reschedule_requested"
        | "rescheduled_awaiting"
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
      dsh_content_scope:
        | "common"
        | "country"
        | "institution"
        | "service_category"
      dsh_content_type:
        | "testimonial"
        | "review"
        | "visa_approval"
        | "promo_video"
        | "reel"
        | "poster"
        | "document"
        | "social"
        | "branch_promo"
        | "institution_promo"
        | "country_promo"
        | "visa_category_promo"
        | "other"
      dsh_link_type:
        | "onedrive_file"
        | "onedrive_folder"
        | "google_drive_file"
        | "google_drive_folder"
        | "download"
        | "video"
        | "shared_folder"
        | "other"
      dsh_owner_department:
        | "marketing"
        | "admissions"
        | "visa_team"
        | "pr_team"
        | "ielts_team"
        | "other"
      dsh_source_type: "upload" | "link"
      dsh_status: "active" | "archived"
      dsh_upload_source: "upload" | "onedrive" | "google_drive" | "external_url"
      incentive_period_type: "monthly" | "quarterly" | "half_yearly" | "yearly"
      incentive_rate_type: "flat" | "per_unit" | "percent" | "slab"
      incentive_run_status:
        | "draft"
        | "calculated"
        | "submitted"
        | "approved"
        | "paid"
        | "void"
      incentive_source_type:
        | "service_revenue"
        | "ancillary"
        | "direct_visa_commission"
        | "b2b_admission_commission"
      payout_status: "pending" | "approved" | "processed" | "paid" | "cancelled"
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
      wallet_alloc_status: "reserved" | "applied" | "reversed"
      wallet_budget_kind: "month_to_month" | "festive" | "scoped"
      wallet_rollover_policy: "expire" | "partial" | "full"
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
        "commission_admin",
        "administrator",
        "manager",
      ],
      assessment_invite_status: ["pending", "registered", "expired", "revoked"],
      assessment_lead_source: [
        "invite",
        "referral",
        "existing_client",
        "public",
      ],
      assessment_session_status: [
        "draft",
        "in_progress",
        "submitted",
        "counselor_reviewed",
        "archived",
      ],
      calendar_event_status: [
        "pending",
        "scheduled",
        "completed",
        "cancelled",
        "declined",
        "no_show",
        "awaiting_requester",
        "confirmed",
        "declined_by_requester",
        "reschedule_requested",
        "rescheduled_awaiting",
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
      dsh_content_scope: [
        "common",
        "country",
        "institution",
        "service_category",
      ],
      dsh_content_type: [
        "testimonial",
        "review",
        "visa_approval",
        "promo_video",
        "reel",
        "poster",
        "document",
        "social",
        "branch_promo",
        "institution_promo",
        "country_promo",
        "visa_category_promo",
        "other",
      ],
      dsh_link_type: [
        "onedrive_file",
        "onedrive_folder",
        "google_drive_file",
        "google_drive_folder",
        "download",
        "video",
        "shared_folder",
        "other",
      ],
      dsh_owner_department: [
        "marketing",
        "admissions",
        "visa_team",
        "pr_team",
        "ielts_team",
        "other",
      ],
      dsh_source_type: ["upload", "link"],
      dsh_status: ["active", "archived"],
      dsh_upload_source: ["upload", "onedrive", "google_drive", "external_url"],
      incentive_period_type: ["monthly", "quarterly", "half_yearly", "yearly"],
      incentive_rate_type: ["flat", "per_unit", "percent", "slab"],
      incentive_run_status: [
        "draft",
        "calculated",
        "submitted",
        "approved",
        "paid",
        "void",
      ],
      incentive_source_type: [
        "service_revenue",
        "ancillary",
        "direct_visa_commission",
        "b2b_admission_commission",
      ],
      payout_status: ["pending", "approved", "processed", "paid", "cancelled"],
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
      wallet_alloc_status: ["reserved", "applied", "reversed"],
      wallet_budget_kind: ["month_to_month", "festive", "scoped"],
      wallet_rollover_policy: ["expire", "partial", "full"],
    },
  },
} as const
