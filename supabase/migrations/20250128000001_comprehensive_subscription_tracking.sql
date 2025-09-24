-- Add comprehensive subscription tracking fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_price INTEGER; -- Price in cents
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

-- Enhance subscriptions table with missing fields
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_price INTEGER; -- Price in cents
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Enhance payment_history table
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id);
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS invoice_id TEXT;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);

-- Function to sync subscription data between tables
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when subscriptions table changes
  UPDATE public.profiles SET
    subscription_status = NEW.status,
    plan_name = NEW.plan_name,
    subscription_price = NEW.subscription_price,
    subscription_start = NEW.current_period_start,
    subscription_end = NEW.current_period_end,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id,
    cancel_at_period_end = NEW.cancel_at_period_end,
    next_billing_date = NEW.current_period_end,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync subscription data
DROP TRIGGER IF EXISTS sync_subscription_to_profile_trigger ON public.subscriptions;
CREATE TRIGGER sync_subscription_to_profile_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_profile();