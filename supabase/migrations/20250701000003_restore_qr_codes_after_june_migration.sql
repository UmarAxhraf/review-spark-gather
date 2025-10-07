-- Restore QR code functionality after June migration overwrote it
-- Add missing QR code columns back to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_code_id TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_url TEXT;

-- Set default for company_qr_code_id
ALTER TABLE public.profiles ALTER COLUMN company_qr_code_id SET DEFAULT gen_random_uuid()::text;

-- Add missing columns that were removed by June migration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#3b82f6';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS thank_you_message TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS incentive_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS incentive_type TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS incentive_value TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follow_up_delay_days INTEGER DEFAULT 7;

-- Restore the complete handle_new_user function with QR code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  qr_code_id TEXT;
BEGIN
  -- Generate unique QR code ID
  qr_code_id := gen_random_uuid()::text;
  
  -- Update or insert profile with all necessary fields
  INSERT INTO public.profiles (
    id, 
    email, 
    company_name,
    company_qr_code_id,
    company_qr_url,
    trial_start,
    trial_end,
    trial_used,
    subscription_status,
    primary_color,
    thank_you_message,
    incentive_enabled,
    follow_up_enabled,
    follow_up_delay_days
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    qr_code_id,
    NULL,  -- URL will be generated dynamically in the application
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE,
    'trial',
    '#3b82f6',
    'Thank you for your feedback!',
    FALSE,
    FALSE,
    7
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_name = EXCLUDED.company_name,
    company_qr_code_id = COALESCE(profiles.company_qr_code_id, EXCLUDED.company_qr_code_id),
    trial_start = COALESCE(profiles.trial_start, EXCLUDED.trial_start),
    trial_end = COALESCE(profiles.trial_end, EXCLUDED.trial_end),
    trial_used = COALESCE(profiles.trial_used, EXCLUDED.trial_used),
    subscription_status = COALESCE(profiles.subscription_status, EXCLUDED.subscription_status),
    updated_at = NOW();

  -- Insert default departments if they don't exist
  INSERT INTO public.departments (name, company_id, created_at)
  SELECT unnest(ARRAY[
    'Executive Leadership',
    'Human Resources', 
    'Finance & Accounting',
    'Operations',
    'Sales & Marketing',
    'Customer Service',
    'Engineering & Development',
    'Information Technology'
  ]), NEW.id, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.departments WHERE company_id = NEW.id
  );

  -- Insert default positions if they don't exist
  INSERT INTO public.positions (name, company_id, created_at)
  SELECT unnest(ARRAY[
    'Manager',
    'Senior Manager',
    'Director',
    'Senior Director', 
    'Vice President',
    'Senior Vice President',
    'Executive Vice President',
    'Chief Executive Officer',
    'Chief Operating Officer',
    'Chief Financial Officer',
    'Chief Technology Officer',
    'Team Lead',
    'Senior Team Lead',
    'Specialist',
    'Senior Specialist',
    'Analyst',
    'Senior Analyst',
    'Coordinator',
    'Senior Coordinator',
    'Associate',
    'Senior Associate'
  ]), NEW.id, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.positions WHERE company_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with QR codes
UPDATE public.profiles 
SET company_qr_code_id = gen_random_uuid()::text
WHERE company_qr_code_id IS NULL;

-- Set NOT NULL constraint after backfilling
ALTER TABLE public.profiles ALTER COLUMN company_qr_code_id SET NOT NULL;