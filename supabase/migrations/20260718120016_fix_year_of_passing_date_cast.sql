-- Repair: 20260718120015 failed at integer→date cast (42846). Safe if column is already date.
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
    ALTER TABLE public.clients
      ALTER COLUMN year_of_passing TYPE date
      USING (
        CASE
          WHEN year_of_passing IS NULL THEN NULL
          ELSE make_date(year_of_passing, 6, 30)
        END
      );
  END IF;
END $$;
