
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS odoo_lead_id bigint,
  ADD COLUMN IF NOT EXISTS odoo_partner_id bigint,
  ADD COLUMN IF NOT EXISTS odoo_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS clients_odoo_lead_id_idx ON public.clients(odoo_lead_id);
CREATE INDEX IF NOT EXISTS clients_odoo_partner_id_idx ON public.clients(odoo_partner_id);

ALTER TABLE public.case_people
  ADD COLUMN IF NOT EXISTS odoo_partner_id bigint,
  ADD COLUMN IF NOT EXISTS odoo_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS case_people_odoo_partner_id_idx ON public.case_people(odoo_partner_id);
