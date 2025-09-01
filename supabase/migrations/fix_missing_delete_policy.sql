-- Add missing DELETE policy for reviews table
-- This policy was missing from the original migration file

CREATE POLICY "Users can delete their company reviews" 
  ON public.reviews 
  FOR DELETE 
  USING (auth.uid() = company_id);