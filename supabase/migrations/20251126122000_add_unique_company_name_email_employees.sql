-- Enforce unique (company_id, name, email) for employees, case-insensitive and trimmed
-- Only enforce when email is provided (email IS NOT NULL)

BEGIN;

-- 1) Clean existing duplicates: keep the most recently updated per (company_id, norm_name, norm_email)
WITH normalized AS (
  SELECT 
    id,
    company_id,
    lower(trim(name)) AS norm_name,
    lower(trim(email)) AS norm_email,
    updated_at
  FROM public.employees
  WHERE email IS NOT NULL
),
dupes AS (
  SELECT 
    id,
    company_id,
    norm_name,
    norm_email,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, norm_name, norm_email 
      ORDER BY updated_at DESC, id DESC
    ) AS rn
  FROM normalized
)
DELETE FROM public.employees e
USING dupes d
WHERE e.id = d.id
  AND d.rn > 1;

-- 2) Create unique index on normalized (company_id, name, email) for employees where email IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS employees_unique_company_name_email_idx
ON public.employees (
  company_id,
  lower(trim(name)),
  lower(trim(email))
)
WHERE email IS NOT NULL;

COMMIT;