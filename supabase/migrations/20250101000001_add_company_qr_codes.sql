-- Add company QR code fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_code_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_qr_url TEXT;

-- Update reviews table to support company-level reviews
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS review_target_type TEXT DEFAULT 'employee';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS target_company_id UUID;

-- Add check constraint for review_target_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_review_target_type_check' 
        AND table_schema = 'public'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_review_target_type_check 
        CHECK (review_target_type IN ('employee', 'company'));
    END IF;
END $$;

-- Add foreign key constraint for target_company_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_target_company_id_fkey' 
        AND table_schema = 'public'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews ADD CONSTRAINT reviews_target_company_id_fkey 
        FOREIGN KEY (target_company_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make employee_id nullable for company reviews
ALTER TABLE public.reviews ALTER COLUMN employee_id DROP NOT NULL;

-- Drop existing constraint if it exists and recreate with proper logic
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'reviews_target_check' 
        AND table_schema = 'public'
        AND table_name = 'reviews'
    ) THEN
        ALTER TABLE public.reviews DROP CONSTRAINT reviews_target_check;
    END IF;
END $$;

-- Add constraint to ensure either employee_id or target_company_id is set
ALTER TABLE public.reviews ADD CONSTRAINT reviews_target_check 
  CHECK (
    (review_target_type = 'employee' AND employee_id IS NOT NULL AND target_company_id IS NULL) OR
    (review_target_type = 'company' AND employee_id IS NULL AND target_company_id IS NOT NULL)
  );

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can submit company reviews" ON public.reviews;

-- Update RLS policies for company reviews
CREATE POLICY "Anyone can submit company reviews" 
  ON public.reviews 
  FOR INSERT 
  WITH CHECK (
    review_target_type = 'company' OR 
    (review_target_type = 'employee' AND employee_id IS NOT NULL)
  );

-- Update the handle_new_user function to generate company QR codes
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_qr_code_id ON public.profiles(company_qr_code_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target_type ON public.reviews(review_target_type);
CREATE INDEX IF NOT EXISTS idx_reviews_target_company_id ON public.reviews(target_company_id);