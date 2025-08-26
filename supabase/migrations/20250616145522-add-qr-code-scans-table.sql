-- Create qr_code_scans table
CREATE TABLE public.qr_code_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id TEXT REFERENCES public.employees(qr_code_id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on qr_code_scans table
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- RLS policies for qr_code_scans
CREATE POLICY "Users can view their company qr_code_scans" 
  ON public.qr_code_scans 
  FOR SELECT 
  USING (auth.uid() = company_id);

-- Public policy for recording QR code scans
CREATE POLICY "Anyone can record QR code scans" 
  ON public.qr_code_scans 
  FOR INSERT 
  WITH CHECK (true);