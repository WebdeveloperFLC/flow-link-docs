-- Idempotent repair when 20260718120015 failed at year_of_passing cast (column already date).
-- Safe to run after partial 15 failure; no-op if year_of_passing is already date.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'clients'
       AND column_name = 'year_of_passing'
       AND udt_name = 'int4'
  ) THEN
    DROP TRIGGER IF EXISTS clients_sync_client_profile ON public.clients;
    ALTER TABLE public.clients
      ALTER COLUMN year_of_passing TYPE date
      USING (
        CASE
          WHEN year_of_passing IS NULL THEN NULL
          ELSE make_date(year_of_passing::integer, 6, 30)
        END
      );
  END IF;
END $$;
