-- Enforce uniqueness on profiles by (company_name, email)
-- Case-insensitive and trimmed uniqueness across the whole system
--
-- Steps:
-- 1) Clean existing duplicates keeping most recently updated
-- 2) Create a unique index on normalized (lower/trim) values
-- 3) Provide an RPC helper for safe duplicate pre-checks from the client

-- 1) Clean existing duplicates (keep latest by updated_at, then created_at, then id)
WITH dedup AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY lower(trim(company_name)), lower(trim(email))
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.profiles
)
DELETE FROM public.profiles p
USING dedup d
WHERE p.id = d.id AND d.rn > 1;

-- 2) Unique index on normalized columns
CREATE UNIQUE INDEX IF NOT EXISTS profiles_company_email_unique
  ON public.profiles (
    lower(trim(company_name)),
    lower(trim(email))
  );

-- 3) RPC function: check if a (company_name, email) combination exists
CREATE OR REPLACE FUNCTION public.is_profile_company_email_taken(company_name TEXT, email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  exists_profile BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(trim(company_name)) = lower(trim($1))
      AND lower(trim(email)) = lower(trim($2))
  ) INTO exists_profile;
  RETURN exists_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Limit access to execution only
REVOKE ALL ON FUNCTION public.is_profile_company_email_taken(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_profile_company_email_taken(TEXT, TEXT) TO anon, authenticated;

-- Notes:
-- - SECURITY DEFINER allows this check to bypass RLS safely.
-- - Client can call supabase.rpc('is_profile_company_email_taken', { company_name, email }).