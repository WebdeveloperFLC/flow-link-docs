ALTER TABLE public.accounting_bank_accounts
ADD COLUMN IF NOT EXISTS authorised_signatory_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];