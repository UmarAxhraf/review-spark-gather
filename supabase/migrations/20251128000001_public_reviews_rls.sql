-- Ensure RLS is enabled on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow public (anon) to read only approved company reviews
DROP POLICY IF EXISTS "Public can read approved company reviews" ON public.reviews;
CREATE POLICY "Public can read approved company reviews" ON public.reviews
  FOR SELECT TO anon
  USING (
    review_target_type = 'company'
    AND moderation_status = 'approved'
    AND (flagged_as_spam IS NOT TRUE)
  );

-- Explicit grant for anon role to SELECT (RLS will still apply)
GRANT SELECT ON public.reviews TO anon;