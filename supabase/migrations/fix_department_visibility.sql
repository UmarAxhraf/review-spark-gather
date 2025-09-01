-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their company departments" ON public.departments;

-- Create a new policy that allows all authenticated users to view departments
CREATE POLICY "All users can view departments" ON public.departments FOR SELECT USING (auth.uid() IS NOT NULL);