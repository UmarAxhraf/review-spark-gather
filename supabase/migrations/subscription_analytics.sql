-- Create subscription_events table for tracking subscription lifecycle events
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('new', 'canceled', 'converted', 'renewed')),
  plan_type TEXT,
  amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create webhook_errors table for tracking webhook processing errors
CREATE TABLE IF NOT EXISTS public.webhook_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT,
  event_id TEXT,
  error_message TEXT,
  error_stack TEXT,
  error_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to get current subscription metrics
CREATE OR REPLACE FUNCTION get_subscription_metrics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE subscription_status IN ('active', 'trialing')) AS total_subscribers,
      COUNT(*) FILTER (WHERE subscription_status = 'active') AS active_subscribers,
      COUNT(*) FILTER (WHERE subscription_status = 'trialing') AS trial_users,
      
      -- Calculate churn rate (canceled in last 30 days / active at start of period)
      NULLIF((
        COUNT(*) FILTER (WHERE subscription_status = 'canceled' AND updated_at > NOW() - INTERVAL '30 days')
      )::FLOAT / NULLIF(
        COUNT(*) FILTER (WHERE subscription_status IN ('active', 'trialing', 'canceled') AND updated_at <= NOW() - INTERVAL '30 days')
      , 0), 0) AS churn_rate,
      
      -- Calculate trial conversion rate
      NULLIF((
        COUNT(*) FILTER (WHERE subscription_status = 'active' AND trial_end IS NOT NULL)
      )::FLOAT / NULLIF(
        COUNT(*) FILTER (WHERE trial_end IS NOT NULL)
      , 0), 0) AS conversion_rate,
      
      -- Calculate MRR (Monthly Recurring Revenue)
      SUM(subscription_price) FILTER (WHERE subscription_status = 'active') AS mrr,
      
      -- Calculate average revenue per user
      CASE 
        WHEN COUNT(*) FILTER (WHERE subscription_status = 'active') > 0 
        THEN SUM(subscription_price) FILTER (WHERE subscription_status = 'active') / COUNT(*) FILTER (WHERE subscription_status = 'active')
        ELSE 0
      END AS average_revenue
    FROM
      public.subscriptions
  )
  SELECT row_to_json(metrics) INTO result FROM metrics;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription trends over time
CREATE OR REPLACE FUNCTION get_subscription_trends(p_period TEXT DEFAULT 'month')
RETURNS JSON AS $$
DECLARE
  result JSON;
  interval_value TEXT;
BEGIN
  -- Set the appropriate date truncation based on period
  IF p_period = 'week' THEN
    interval_value := 'day';
  ELSIF p_period = 'month' THEN
    interval_value := 'day';
  ELSIF p_period = 'year' THEN
    interval_value := 'month';
  ELSE
    interval_value := 'day';
  END IF;
  
  WITH trends AS (
    SELECT
      date_trunc(interval_value, created_at)::DATE AS date,
      COUNT(*) FILTER (WHERE event_type = 'new') AS new_subscribers,
      COUNT(*) FILTER (WHERE event_type = 'canceled') AS canceled_subscribers,
      SUM(amount) FILTER (WHERE event_type IN ('new', 'renewed')) AS revenue
    FROM
      public.subscription_events
    WHERE
      created_at >= 
        CASE 
          WHEN p_period = 'week' THEN NOW() - INTERVAL '7 days'
          WHEN p_period = 'month' THEN NOW() - INTERVAL '30 days'
          WHEN p_period = 'year' THEN NOW() - INTERVAL '365 days'
          ELSE NOW() - INTERVAL '30 days'
        END
    GROUP BY
      date
    ORDER BY
      date
  )
  SELECT json_agg(trends) INTO result FROM trends;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_errors ENABLE ROW LEVEL SECURITY;

-- Only allow admins to view subscription events
CREATE POLICY "Allow admins to view subscription events"
  ON public.subscription_events
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

-- Only allow admins to view webhook errors
CREATE POLICY "Allow admins to view webhook errors"
  ON public.webhook_errors
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));