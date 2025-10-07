-- Comprehensive QR Code Fix Migration
-- This migration ensures all QR code functionality works correctly

-- 1. Ensure company_qr_code_id column exists with proper constraints
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_code_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_url TEXT;

-- 2. Create unique index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'profiles' 
        AND indexname = 'profiles_company_qr_code_id_key'
    ) THEN
        CREATE UNIQUE INDEX profiles_company_qr_code_id_key 
        ON public.profiles(company_qr_code_id) 
        WHERE company_qr_code_id IS NOT NULL;
    END IF;
END $$;

-- 3. Fix any NULL QR codes for existing companies
UPDATE public.profiles 
SET company_qr_code_id = gen_random_uuid()::text 
WHERE company_qr_code_id IS NULL;

-- 4. Set proper default and NOT NULL constraint
ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET NOT NULL;

-- 5. Recreate the handle_new_user function with QR code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  qr_code_id TEXT;
BEGIN
  -- Generate unique QR code ID
  qr_code_id := gen_random_uuid()::text;
  
  -- Insert profile with QR code
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
    follow_up_delay_days,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    qr_code_id,
    NULL,
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE,
    'trial',
    '#3b82f6',
    'Thank you for your feedback!',
    FALSE,
    FALSE,
    7,
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_name = EXCLUDED.company_name,
    company_qr_code_id = COALESCE(profiles.company_qr_code_id, EXCLUDED.company_qr_code_id),
    trial_start = COALESCE(profiles.trial_start, EXCLUDED.trial_start),
    trial_end = COALESCE(profiles.trial_end, EXCLUDED.trial_end),
    trial_used = COALESCE(profiles.trial_used, EXCLUDED.trial_used),
    subscription_status = COALESCE(profiles.subscription_status, EXCLUDED.subscription_status),
    primary_color = COALESCE(profiles.primary_color, EXCLUDED.primary_color),
    thank_you_message = COALESCE(profiles.thank_you_message, EXCLUDED.thank_you_message),
    incentive_enabled = COALESCE(profiles.incentive_enabled, EXCLUDED.incentive_enabled),
    follow_up_enabled = COALESCE(profiles.follow_up_enabled, EXCLUDED.follow_up_enabled),
    follow_up_delay_days = COALESCE(profiles.follow_up_delay_days, EXCLUDED.follow_up_delay_days),
    role = COALESCE(profiles.role, EXCLUDED.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Verify the fix
SELECT 'QR Code fix completed. Total profiles with QR codes:' as status, 
       COUNT(*) as count 
FROM public.profiles 
WHERE company_qr_code_id IS NOT NULL;