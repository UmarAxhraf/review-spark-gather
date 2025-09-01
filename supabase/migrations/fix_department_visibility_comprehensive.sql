-- Comprehensive fix for department visibility issue
-- This migration ensures departments are visible to all authenticated users

-- First, drop ALL existing department policies to ensure clean state
DROP POLICY IF EXISTS "Users can view their company departments" ON public.departments;
DROP POLICY IF EXISTS "All users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can insert departments for their company" ON public.departments;
DROP POLICY IF EXISTS "Users can update their company departments" ON public.departments;
DROP POLICY IF EXISTS "Users can delete their company departments" ON public.departments;

-- Create the correct policies
-- Allow all authenticated users to view ALL departments (this fixes the dropdown issue)
CREATE POLICY "All authenticated users can view departments" 
  ON public.departments 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Still restrict management operations to company owners
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

-- Verify the policies are working
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'departments'
ORDER BY policyname;