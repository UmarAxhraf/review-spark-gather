-- Enhanced trigger function to properly handle trial cancellation
CREATE OR REPLACE FUNCTION sync_subscription_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profiles table when subscriptions table changes
  UPDATE public.profiles SET
    subscription_status = NEW.status,
    plan_name = NEW.plan_name,
    plan_type = NEW.plan_type,
    subscription_price = NEW.subscription_price,
    subscription_start = NEW.current_period_start,
    subscription_end = NEW.current_period_end,
    stripe_customer_id = NEW.stripe_customer_id,
    stripe_subscription_id = NEW.stripe_subscription_id,
    cancel_at_period_end = NEW.cancel_at_period_end,
    next_billing_date = NEW.current_period_end,
    -- Clear trial data when active subscription starts
    trial_start = CASE 
      WHEN NEW.status = 'active' THEN NULL 
      ELSE trial_start 
    END,
    trial_end = CASE 
      WHEN NEW.status = 'active' THEN NULL 
      ELSE trial_end 
    END,
    -- Mark trial as used when first paid subscription starts
    trial_used = CASE 
      WHEN NEW.status = 'active' AND trial_used = false THEN true 
      ELSE trial_used 
    END,
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Log if no rows were updated
  IF NOT FOUND THEN
    RAISE WARNING 'No profile found for user_id: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle trial cancellation when subscription is canceled
CREATE OR REPLACE FUNCTION handle_subscription_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- If a trial subscription is being canceled, clear trial data from profile
  IF OLD.status = 'trial' AND NEW.status = 'canceled' THEN
    UPDATE public.profiles SET
      trial_start = NULL,
      trial_end = NULL,
      trial_used = true,
      subscription_status = 'ended',
      updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for subscription cancellation
DROP TRIGGER IF EXISTS handle_subscription_cancellation_trigger ON public.subscriptions;
CREATE TRIGGER handle_subscription_cancellation_trigger
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW 
  WHEN (OLD.status != NEW.status AND NEW.status = 'canceled')
  EXECUTE FUNCTION handle_subscription_cancellation();

-- Recreate the main sync trigger
DROP TRIGGER IF EXISTS sync_subscription_to_profile_trigger ON public.subscriptions;
CREATE TRIGGER sync_subscription_to_profile_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_profile();