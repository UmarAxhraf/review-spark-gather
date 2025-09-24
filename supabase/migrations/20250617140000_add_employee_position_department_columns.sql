-- Add missing foreign key columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees (position_id);

-- Update existing employees to link their text position to position_id if possible
UPDATE public.employees 
SET position_id = p.id
FROM public.positions p
WHERE public.employees.position = p.title
AND public.employees.position_id IS NULL;