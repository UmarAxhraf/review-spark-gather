-- Drop ALL existing department policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their company departments" ON public.departments;
DROP POLICY IF EXISTS "All users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view departments" ON public.departments;

-- Create the correct policy that allows all authenticated users to view departments
CREATE POLICY "All users can view departments" 
  ON public.departments 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Ensure departments can still be managed by their owners
CREATE POLICY "Users can insert departments for their company" 
  ON public.departments 
  FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their company departments" 
  ON public.departments 
  FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their company departments" 
  ON public.departments 
  FOR DELETE 
  USING (auth.uid() = company_id);