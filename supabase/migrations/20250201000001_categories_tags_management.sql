-- Create categories table for persistent category management
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Create tags table for persistent tag management
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#10B981',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Create employee_tags junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.employee_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES public.profiles(id),
  UNIQUE(employee_id, tag_id)
);

-- Add category_id foreign key to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_company_id ON public.categories (company_id);
CREATE INDEX IF NOT EXISTS idx_tags_company_id ON public.tags (company_id);
CREATE INDEX IF NOT EXISTS idx_employee_tags_employee_id ON public.employee_tags (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_tags_tag_id ON public.employee_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_employees_category_id ON public.employees (category_id);

-- Enable RLS policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_tags ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can view their company categories" ON public.categories
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY "Users can insert their company categories" ON public.categories
  FOR INSERT WITH CHECK (company_id = auth.uid());

CREATE POLICY "Users can update their company categories" ON public.categories
  FOR UPDATE USING (company_id = auth.uid());

CREATE POLICY "Users can delete their company categories" ON public.categories
  FOR DELETE USING (company_id = auth.uid());

-- Tags policies
CREATE POLICY "Users can view their company tags" ON public.tags
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY "Users can insert their company tags" ON public.tags
  FOR INSERT WITH CHECK (company_id = auth.uid());

CREATE POLICY "Users can update their company tags" ON public.tags
  FOR UPDATE USING (company_id = auth.uid());

CREATE POLICY "Users can delete their company tags" ON public.tags
  FOR DELETE USING (company_id = auth.uid());

-- Employee tags policies
CREATE POLICY "Users can view employee tags for their company" ON public.employee_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = employee_id AND e.company_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert employee tags for their company" ON public.employee_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = employee_id AND e.company_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete employee tags for their company" ON public.employee_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.employees e 
      WHERE e.id = employee_id AND e.company_id = auth.uid()
    )
  );

-- Insert some default categories
INSERT INTO public.categories (company_id, name, description, color) 
SELECT 
  id as company_id,
  'General' as name,
  'General employees' as description,
  '#3B82F6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.categories (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Management' as name,
  'Management level employees' as description,
  '#8B5CF6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.categories (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Customer Service' as name,
  'Customer facing employees' as description,
  '#10B981' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;