-- Debug script to identify and fix QR code issues

-- 1. Check current profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if company_qr_code_id column exists and has data
SELECT 
  COUNT(*) as total_profiles,
  COUNT(company_qr_code_id) as profiles_with_qr_codes,
  COUNT(CASE WHEN company_qr_code_id IS NULL THEN 1 END) as profiles_without_qr_codes
FROM public.profiles;

-- 3. Show sample of existing QR codes
SELECT id, company_name, company_qr_code_id, created_at
FROM public.profiles 
WHERE company_qr_code_id IS NOT NULL
LIMIT 10;

-- 4. Test the specific QR code from your screenshot
SELECT id, company_name, company_qr_code_id, email
FROM public.profiles 
WHERE company_qr_code_id = '9c088d43-8be7-4ecd-aa1f-91b419624a2a';

-- 5. Check for duplicate QR codes (should be unique)
SELECT company_qr_code_id, COUNT(*) as count
FROM public.profiles 
WHERE company_qr_code_id IS NOT NULL
GROUP BY company_qr_code_id
HAVING COUNT(*) > 1;

-- 6. Check current handle_new_user function
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- 7. Fix any missing QR codes
UPDATE public.profiles 
SET company_qr_code_id = gen_random_uuid()::text 
WHERE company_qr_code_id IS NULL;

-- 8. Ensure the column has proper constraints
ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET NOT NULL;

ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET DEFAULT gen_random_uuid()::text;

-- 9. Recreate the handle_new_user function to ensure it's current
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
    role = COALESCE(profiles.role, EXCLUDED.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Final verification
SELECT 'Debug complete. Check results above.' as status;