-- Add trial fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_used BOOLEAN DEFAULT FALSE;

-- Function to initialize trial for new users
CREATE OR REPLACE FUNCTION public.initialize_user_trial()
RETURNS TRIGGER AS $$
BEGIN
  -- Set trial period (7 days from signup)
  NEW.trial_start = NOW();
  NEW.trial_end = NOW() + INTERVAL '7 days';
  NEW.trial_used = FALSE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to include trial initialization
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    company_name,
    trial_start,
    trial_end,
    trial_used
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user has active trial
CREATE OR REPLACE FUNCTION public.has_active_trial(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  trial_end_date TIMESTAMPTZ;
BEGIN
  SELECT trial_end INTO trial_end_date
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN (trial_end_date IS NOT NULL AND trial_end_date > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  trial_end_date TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT trial_end INTO trial_end_date
  FROM public.profiles
  WHERE id = user_id;
  
  IF trial_end_date IS NULL THEN
    RETURN 0;
  END IF;
  
  days_remaining := CEIL(EXTRACT(EPOCH FROM (trial_end_date - NOW())) / 86400);
  RETURN GREATEST(0, days_remaining);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin check function (secure approach)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  admin_emails TEXT[] := ARRAY[
    'admin@devbion.com',
    'umar@devbion.com', 
    'umar.axhraf@gmail.com'
  ];
  admin_ids UUID[] := ARRAY[
    '4d1b2870-a7c2-4135-9eea-ce2a60fec34b'::UUID,
    '2427a418-2481-4d11-984e-5e298246207d'::UUID,
    '881dbdbc-ed1c-400e-b2d4-bf5822749428'::UUID
  ];
  user_email TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;
  
  -- Check if user ID or email matches admin list
  RETURN (user_id = ANY(admin_ids) OR user_email = ANY(admin_emails));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;