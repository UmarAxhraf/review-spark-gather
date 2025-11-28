-- Update anon read policy to support legacy is_approved flag
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved company reviews" ON public.reviews;
CREATE POLICY "Public can read approved company reviews" ON public.reviews
  FOR SELECT TO anon
  USING (
    review_target_type = 'company'
    AND (
      moderation_status = 'approved'
      OR is_approved IS TRUE
    )
    AND (flagged_as_spam IS NOT TRUE)
  );

GRANT SELECT ON public.reviews TO anon;