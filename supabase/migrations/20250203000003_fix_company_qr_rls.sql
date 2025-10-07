-- Fix RLS policies to allow public access to company data via QR codes

-- Add public policy for company QR code access
CREATE POLICY "Public can view company data via QR code" 
  ON public.profiles 
  FOR SELECT 
  USING (
    company_qr_code_id IS NOT NULL
  );

-- Ensure the policy allows reading necessary company fields for reviews
COMMENT ON POLICY "Public can view company data via QR code" ON public.profiles IS 
'Allows anonymous users to read company profile data when accessing via QR code for review submission';