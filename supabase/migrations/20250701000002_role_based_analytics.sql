-- Function to get current subscription metrics with role filtering
CREATE OR REPLACE FUNCTION get_subscription_metrics(p_role TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE s.status IN ('active', 'trialing') AND (p_role IS NULL OR p.role = p_role)) AS total_subscribers,
      COUNT(*) FILTER (WHERE s.status = 'active' AND (p_role IS NULL OR p.role = p_role)) AS active_subscribers,
      COUNT(*) FILTER (WHERE s.status = 'trialing' AND (p_role IS NULL OR p.role = p_role)) AS trial_users,
      
      -- Calculate churn rate (canceled in last 30 days / active at start of period)
      NULLIF((COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.updated_at > NOW() - INTERVAL '30 days' AND (p_role IS NULL OR p.role = p_role)))::FLOAT / 
             NULLIF(COUNT(*) FILTER (WHERE s.status IN ('active', 'trialing', 'canceled') AND s.updated_at <= NOW() - INTERVAL '30 days' AND (p_role IS NULL OR p.role = p_role)), 0), 0) AS churn_rate,
      
      -- Calculate trial conversion rate
      NULLIF((COUNT(*) FILTER (WHERE s.status = 'active' AND s.trial_end IS NOT NULL AND (p_role IS NULL OR p.role = p_role)))::FLOAT / 
             NULLIF(COUNT(*) FILTER (WHERE s.trial_end IS NOT NULL AND (p_role IS NULL OR p.role = p_role)), 0), 0) AS conversion_rate,
      
      -- Calculate MRR (Monthly Recurring Revenue)
      SUM(s.subscription_price) FILTER (WHERE s.status = 'active' AND (p_role IS NULL OR p.role = p_role)) AS mrr,
      
      -- Calculate average revenue per user
      CASE 
        WHEN COUNT(*) FILTER (WHERE s.status = 'active' AND (p_role IS NULL OR p.role = p_role)) > 0 
        THEN SUM(s.subscription_price) FILTER (WHERE s.status = 'active' AND (p_role IS NULL OR p.role = p_role)) / 
             COUNT(*) FILTER (WHERE s.status = 'active' AND (p_role IS NULL OR p.role = p_role))
        ELSE 0
      END AS average_revenue
    FROM
      public.subscriptions s
    JOIN
      public.profiles p ON s.user_id = p.id
  )
  SELECT row_to_json(metrics) INTO result FROM metrics;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get subscription trends over time with role filtering
CREATE OR REPLACE FUNCTION get_subscription_trends(p_period TEXT DEFAULT 'month', p_role TEXT DEFAULT NULL)
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
      date_trunc(interval_value, e.created_at)::DATE AS date,
      COUNT(*) FILTER (WHERE e.event_type = 'new' AND (p_role IS NULL OR p.role = p_role)) AS new_subscribers,
      COUNT(*) FILTER (WHERE e.event_type = 'canceled' AND (p_role IS NULL OR p.role = p_role)) AS canceled_subscribers,
      SUM(e.amount) FILTER (WHERE e.event_type IN ('new', 'renewed') AND (p_role IS NULL OR p.role = p_role)) AS revenue
    FROM
      public.subscription_events e
    JOIN
      public.profiles p ON e.user_id = p.id
    WHERE
      e.created_at >= 
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