-- Add missing subscription_status column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'canceled', 'past_due', 'unpaid'));

-- Update existing users to have trial status
UPDATE public.profiles 
SET subscription_status = 'trial' 
WHERE subscription_status IS NULL;