-- Enforce uniqueness of customer per company by (company_name, email)
-- Case-insensitive and trimmed uniqueness within each company_id
--
-- This script performs two steps:
-- 1) Remove pre-existing duplicates keeping the most recent entry
-- 2) Create a unique index on normalized (trimmed/lowercased) values

-- 1) Clean existing duplicates (keep latest by created_at, then id)
WITH dedup AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY company_id, lower(trim(company_name)), lower(trim(email))
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.review_requests
)
DELETE FROM public.review_requests r
USING dedup d
WHERE r.id = d.id AND d.rn > 1;

-- 2) Create unique index on normalized columns
CREATE UNIQUE INDEX IF NOT EXISTS review_requests_company_email_unique
  ON public.review_requests (
    company_id,
    lower(trim(company_name)),
    lower(trim(email))
  );

-- Notes:
-- - Using a UNIQUE INDEX with expressions ensures case-insensitive, whitespace-trimmed uniqueness.
-- - If you prefer a named constraint, keep the index. It behaves identically for enforcement.