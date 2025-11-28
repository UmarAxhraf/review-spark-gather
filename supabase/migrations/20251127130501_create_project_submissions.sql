-- Create table for employee project submissions and storage bucket for images

BEGIN;

-- Table: project_submissions
CREATE TABLE IF NOT EXISTS public.project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'submitted',
  image_paths TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_submissions_company_employee
  ON public.project_submissions(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_project_submissions_created_at
  ON public.project_submissions(created_at);

-- Enable RLS
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Allow public inserts (UI handles validation, DB trigger enforces rules)
DROP POLICY IF EXISTS "Allow public project submissions" ON public.project_submissions;
CREATE POLICY "Allow public project submissions" ON public.project_submissions
  FOR INSERT
  WITH CHECK (true);

-- Company-scoped access for admins
DROP POLICY IF EXISTS "Users can view their company projects" ON public.project_submissions;
CREATE POLICY "Users can view their company projects" ON public.project_submissions
  FOR SELECT
  USING (company_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their company projects" ON public.project_submissions;
CREATE POLICY "Users can update their company projects" ON public.project_submissions
  FOR UPDATE
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their company projects" ON public.project_submissions;
CREATE POLICY "Users can delete their company projects" ON public.project_submissions
  FOR DELETE
  USING (company_id = auth.uid());

-- Explicit grants to roles used by Supabase
GRANT INSERT ON public.project_submissions TO anon;
GRANT SELECT, UPDATE, DELETE ON public.project_submissions TO authenticated;

-- Storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow public uploads and reads for project images
DROP POLICY IF EXISTS "Allow public uploads to project-images bucket" ON storage.objects;
CREATE POLICY "Allow public uploads to project-images bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Allow public access to project-images bucket" ON storage.objects;
CREATE POLICY "Allow public access to project-images bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Allow updates to project-images bucket" ON storage.objects;
CREATE POLICY "Allow updates to project-images bucket" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'project-images')
  WITH CHECK (bucket_id = 'project-images');

DROP POLICY IF EXISTS "Allow deletes in project-images bucket" ON storage.objects;
CREATE POLICY "Allow deletes in project-images bucket" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'project-images');

-- DB trigger: prevent invalid project inserts (mirror review protections)
CREATE OR REPLACE FUNCTION public.prevent_invalid_project_insert()
RETURNS trigger AS $$
DECLARE
  v_company_id uuid;
  v_qr_is_active boolean;
  v_qr_expires_at timestamptz;
  v_status text;
  v_subscription_end timestamptz;
  v_trial_end timestamptz;
BEGIN
  -- Validate employee and QR state
  IF NEW.employee_id IS NOT NULL THEN
    SELECT e.company_id, e.qr_is_active, e.qr_expires_at
    INTO v_company_id, v_qr_is_active, v_qr_expires_at
    FROM public.employees e
    WHERE e.id = NEW.employee_id;

    IF v_company_id IS NULL THEN
      RAISE EXCEPTION 'Invalid employee for project submission' USING errcode = 'P0001';
    END IF;

    IF v_qr_is_active IS FALSE THEN
      RAISE EXCEPTION 'QR code is deactivated and cannot accept projects' USING errcode = 'P0001';
    END IF;

    IF v_qr_expires_at IS NOT NULL AND v_qr_expires_at <= NOW() THEN
      RAISE EXCEPTION 'QR code has expired and cannot accept projects' USING errcode = 'P0001';
    END IF;

    -- Ensure company_id consistency
    NEW.company_id := v_company_id;
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Company not found for project submission' USING errcode = 'P0001';
  END IF;

  -- Subscription validations
  SELECT p.subscription_status, p.subscription_end, p.trial_end
  INTO v_status, v_subscription_end, v_trial_end
  FROM public.profiles p
  WHERE p.id = NEW.company_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Company subscription is not active. Projects are not allowed' USING errcode = 'P0001';
  END IF;

  IF v_status IN ('expired','ended') THEN
    RAISE EXCEPTION 'Company subscription has expired or ended. Projects are not allowed' USING errcode = 'P0001';
  END IF;

  IF v_status = 'trial' AND v_trial_end IS NOT NULL AND v_trial_end <= NOW() THEN
    RAISE EXCEPTION 'Company trial has ended. Projects are not allowed' USING errcode = 'P0001';
  END IF;

  IF v_status IN ('active','canceled') AND v_subscription_end IS NOT NULL AND v_subscription_end <= NOW() THEN
    RAISE EXCEPTION 'Company subscription period has ended. Projects are not allowed' USING errcode = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_invalid_project_insert ON public.project_submissions;
CREATE TRIGGER trg_prevent_invalid_project_insert
BEFORE INSERT ON public.project_submissions
FOR EACH ROW
EXECUTE PROCEDURE public.prevent_invalid_project_insert();

COMMIT;