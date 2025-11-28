-- Add optional employee detail fields to project_submissions

BEGIN;

ALTER TABLE public.project_submissions
  ADD COLUMN IF NOT EXISTS employee_name TEXT,
  ADD COLUMN IF NOT EXISTS employee_designation TEXT,
  ADD COLUMN IF NOT EXISTS employee_email TEXT,
  ADD COLUMN IF NOT EXISTS employee_phone TEXT;

COMMIT;