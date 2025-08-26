
-- Create employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  position TEXT,
  qr_code_id TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  review_type TEXT DEFAULT 'text' CHECK (review_type IN ('text', 'video')),
  video_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees
CREATE POLICY "Users can view their company employees" 
  ON public.employees 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert employees for their company" 
  ON public.employees 
  FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their company employees" 
  ON public.employees 
  FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their company employees" 
  ON public.employees 
  FOR DELETE 
  USING (auth.uid() = company_id);

-- RLS policies for reviews
CREATE POLICY "Users can view their company reviews" 
  ON public.reviews 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can update their company reviews" 
  ON public.reviews 
  FOR UPDATE 
  USING (auth.uid() = company_id);

-- Public policy for review submission (customers need to submit reviews)
CREATE POLICY "Anyone can submit reviews" 
  ON public.reviews 
  FOR INSERT 
  WITH CHECK (true);

-- Allow public access to read employee info for QR code functionality
CREATE POLICY "Public can view active employees for reviews" 
  ON public.employees 
  FOR SELECT 
  USING (is_active = true);
