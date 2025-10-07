-- Fix the handle_new_user function to properly generate company QR codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  qr_code_id TEXT;
BEGIN
  -- Generate unique QR code ID
  qr_code_id := gen_random_uuid()::text;
  
  INSERT INTO public.profiles (
    id, 
    email, 
    company_name, 
    company_qr_code_id, 
    company_qr_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    qr_code_id,
    NULL  -- URL will be generated dynamically in the application
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing companies that have NULL company_qr_code_id
UPDATE public.profiles 
SET company_qr_code_id = gen_random_uuid()::text 
WHERE company_qr_code_id IS NULL;

-- Ensure the column has the DEFAULT constraint for new records
ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET DEFAULT gen_random_uuid()::text;