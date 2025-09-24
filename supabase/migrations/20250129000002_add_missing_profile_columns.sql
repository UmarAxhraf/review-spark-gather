-- Add missing subscription-related columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add index for better performance on stripe_customer_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Update existing users to have a default plan
UPDATE public.profiles 
SET subscription_plan = 'trial' 
WHERE subscription_plan IS NULL;