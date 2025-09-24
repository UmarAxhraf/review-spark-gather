-- Enhanced trigger function that respects trial data
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

-- Recreate trigger
DROP TRIGGER IF EXISTS sync_subscription_to_profile_trigger ON public.subscriptions;
CREATE TRIGGER sync_subscription_to_profile_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION sync_subscription_to_profile();