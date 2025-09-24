-- Fix profiles table constraint to include all Stripe statuses
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_status_check 
  CHECK (subscription_status IN ('trial', 'trialing', 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'));

-- Fix subscriptions table constraint to include trialing status
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
  CHECK (status IN ('trialing', 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'));

-- Add plan_type column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_type TEXT;

-- Update the sync trigger to include plan_type
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when subscriptions table changes
  UPDATE public.profiles SET
    subscription_status = NEW.status,
    plan_name = NEW.plan_name,
    plan_type = NEW.plan_type,  -- Add this line
    subscription_price = NEW.subscription_price,
    subscription_start = NEW.current_period_start,
    subscription_end = NEW.current_period_end,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id,
    cancel_at_period_end = NEW.cancel_at_period_end,
    next_billing_date = NEW.current_period_end,
    trial_used = CASE 
      WHEN NEW.status = 'active' AND trial_used = false THEN true 
      ELSE trial_used 
    END,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE WARNING 'No profile found for user_id: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;