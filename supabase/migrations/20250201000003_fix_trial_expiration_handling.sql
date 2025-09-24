-- Function to update expired trials
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update profiles where trial has expired but status is still 'trial'
  UPDATE public.profiles 
  SET 
    subscription_status = 'ended',
    trial_used = true,
    updated_at = NOW()
  WHERE 
    trial_end IS NOT NULL 
    AND trial_end < NOW() 
    AND subscription_status = 'trial'
    AND (trial_used = false OR trial_used IS NULL);
    
  -- Log the number of updated records
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % expired trial records', updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function that runs on profile reads to check trial expiration
CREATE OR REPLACE FUNCTION public.check_trial_expiration_on_access()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a trial user and trial has expired, update status
  IF NEW.trial_end IS NOT NULL 
     AND NEW.trial_end < NOW() 
     AND NEW.subscription_status = 'trial' 
     AND (NEW.trial_used = false OR NEW.trial_used IS NULL) THEN
    
    NEW.subscription_status := 'ended';
    NEW.trial_used := true;
    NEW.updated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires before SELECT operations on profiles
-- Note: This approach updates on access rather than scheduled
CREATE OR REPLACE FUNCTION public.auto_update_expired_trials()
RETURNS TRIGGER AS $$
BEGIN
  -- Update any expired trials when profiles table is accessed
  PERFORM public.update_expired_trials();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative: Update subscription context to handle expired trials
-- This ensures the frontend properly reflects trial expiration
CREATE OR REPLACE VIEW public.profiles_with_current_status AS
SELECT 
  *,
  CASE 
    WHEN trial_end IS NOT NULL 
         AND trial_end < NOW() 
         AND subscription_status = 'trial' 
         AND (trial_used = false OR trial_used IS NULL)
    THEN 'ended'
    ELSE subscription_status
  END as current_subscription_status,
  CASE 
    WHEN trial_end IS NOT NULL 
         AND trial_end < NOW() 
         AND subscription_status = 'trial' 
         AND (trial_used = false OR trial_used IS NULL)
    THEN true
    ELSE trial_used
  END as current_trial_used
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_with_current_status TO authenticated;
GRANT SELECT ON public.profiles_with_current_status TO service_role;