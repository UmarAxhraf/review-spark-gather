-- Add unique constraint to prevent multiple active subscriptions per user
-- First, clean up any existing duplicates (keep the most recent one)
WITH ranked_subscriptions AS (
  SELECT id, user_id, status, created_at,
         ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at DESC) as rn
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing')
)
DELETE FROM public.subscriptions
WHERE id IN (
  SELECT id FROM ranked_subscriptions WHERE rn > 1
);

-- Add unique constraint for active subscriptions
-- This uses a partial unique index to allow only one active/trialing subscription per user
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_active_unique
ON public.subscriptions (user_id)
WHERE status IN ('active', 'trialing');

-- Add a function to check for existing active subscriptions
CREATE OR REPLACE FUNCTION check_existing_active_subscription(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_existing_active_subscription(UUID) TO authenticated;