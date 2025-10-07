-- More restrictive: Allow public read access to active platform profiles
-- This allows the public review submission page to show company profiles
CREATE POLICY "Public can view active platform profiles for reviews" 
  ON public.platform_profiles 
  FOR SELECT 
  USING (
    is_active = true AND 
    -- Only allow if accessing for a valid company
    company_id IN (
      SELECT id FROM public.profiles 
      WHERE id IS NOT NULL
    )
  );