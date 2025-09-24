-- Fix company scoping for all organizational tables
-- This migration ensures proper company isolation for categories, tags, departments, and positions

-- First, let's ensure departments table exists with proper structure
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, name)
);

-- Add company_id to positions table if it doesn't exist
ALTER TABLE public.positions 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update existing positions to have company_id based on their department's company
UPDATE public.positions 
SET company_id = d.company_id 
FROM public.departments d 
WHERE positions.department_id = d.id 
AND positions.company_id IS NULL;

-- Make company_id NOT NULL for positions after updating existing records
ALTER TABLE public.positions 
ALTER COLUMN company_id SET NOT NULL;

-- Add unique constraint for positions within company
ALTER TABLE public.positions 
ADD CONSTRAINT unique_position_per_company UNIQUE(company_id, title, department_id);

-- Enable RLS on departments and positions if not already enabled
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their company departments" ON public.departments;
DROP POLICY IF EXISTS "All users can view departments" ON public.departments;
DROP POLICY IF EXISTS "All authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Users can insert departments for their company" ON public.departments;
DROP POLICY IF EXISTS "Users can update their company departments" ON public.departments;
DROP POLICY IF EXISTS "Users can delete their company departments" ON public.departments;

-- Create proper RLS policies for departments
CREATE POLICY "Users can view their company departments" ON public.departments
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY "Users can insert departments for their company" ON public.departments
  FOR INSERT WITH CHECK (company_id = auth.uid());

CREATE POLICY "Users can update their company departments" ON public.departments
  FOR UPDATE USING (company_id = auth.uid());

CREATE POLICY "Users can delete their company departments" ON public.departments
  FOR DELETE USING (company_id = auth.uid());

-- Create RLS policies for positions
CREATE POLICY "Users can view their company positions" ON public.positions
  FOR SELECT USING (company_id = auth.uid());

CREATE POLICY "Users can insert positions for their company" ON public.positions
  FOR INSERT WITH CHECK (company_id = auth.uid());

CREATE POLICY "Users can update their company positions" ON public.positions
  FOR UPDATE USING (company_id = auth.uid());

CREATE POLICY "Users can delete their company positions" ON public.positions
  FOR DELETE USING (company_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON public.departments (company_id);
CREATE INDEX IF NOT EXISTS idx_positions_company_id ON public.positions (company_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON public.positions (department_id);

-- Insert default departments for existing companies that don't have any
INSERT INTO public.departments (name, description, company_id)
SELECT 
  dept_name,
  dept_description,
  p.id
FROM (
  VALUES 
    ('Sales & Marketing', 'Customer acquisition, sales strategies, and marketing campaigns'),
    ('Customer Service', 'Customer support, complaints resolution, and customer satisfaction'),
    ('Operations & Management', 'Daily operations, process optimization, and strategic planning'),
    ('Human Resources', 'Employee relations, recruitment, training, and development'),
    ('Finance & Accounting', 'Financial planning, budgeting, accounting, and reporting'),
    ('Product Development', 'Product strategy, design, and new feature development'),
    ('Engineering & Development', 'Application development, maintenance, and code quality'),
    ('Quality Assurance', 'Ensures product quality via testing and QA processes'),
    ('IT & Infrastructure', 'Internal IT systems, security, and infrastructure'),
    ('Research & Innovation', 'R&D for new technologies and improvements'),
    ('Legal & Compliance', 'Contracts, policies, risk management, and compliance'),
    ('Procurement & Supply Chain', 'Vendor management, purchasing, and supply chain operations'),
    ('Administration', 'Office management, administration, and facilities'),
    ('Training & Development', 'Employee training, certifications, and knowledge growth'),
    ('Support & Helpdesk', 'Technical support and internal helpdesk'),
    ('Design & Creative', 'UI/UX design, branding, and creative assets'),
    ('Executive Leadership', 'CEO, COO, CTO, and other C-level leadership')
) AS dept_data(dept_name, dept_description)
CROSS JOIN public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments d 
  WHERE d.company_id = p.id AND d.name = dept_data.dept_name
);

-- Insert default positions for each department and company
INSERT INTO public.positions (title, level, description, department_id, company_id)
SELECT 
  pos_title,
  pos_level,
  pos_description,
  d.id,
  d.company_id
FROM (
  VALUES 
    -- Sales & Marketing
    ('Sales Representative', 'entry', 'Handles direct customer sales and relationship building'),
    ('Sales Manager', 'manager', 'Leads sales team and develops strategies'),
    ('Marketing Specialist', 'mid', 'Executes marketing campaigns'),
    ('Marketing Director', 'director', 'Leads marketing strategy and campaigns'),
    ('Chief Marketing Officer', 'executive', 'Oversees global marketing strategy'),

    -- Customer Service
    ('Customer Service Rep', 'entry', 'Front-line customer support'),
    ('Customer Success Manager', 'mid', 'Ensures customer satisfaction and retention'),
    ('Customer Support Lead', 'manager', 'Leads customer support team'),

    -- Operations
    ('Operations Coordinator', 'mid', 'Coordinates daily activities'),
    ('Operations Manager', 'manager', 'Manages operations'),
    ('Chief Operating Officer', 'executive', 'Oversees overall operations'),

    -- Human Resources
    ('HR Specialist', 'mid', 'Handles recruitment and employee relations'),
    ('HR Manager', 'manager', 'Manages HR processes'),
    ('HR Director', 'director', 'Leads HR strategy'),
    ('Chief People Officer', 'executive', 'Oversees all HR and people functions'),

    -- Finance & Accounting
    ('Accountant', 'mid', 'Manages financial records and transactions'),
    ('Finance Manager', 'manager', 'Oversees financial planning and analysis'),
    ('Chief Financial Officer', 'executive', 'Manages financial strategy'),

    -- Product Development
    ('Product Designer', 'mid', 'Designs product experiences'),
    ('Product Manager', 'manager', 'Oversees product lifecycle'),
    ('Head of Product', 'director', 'Leads product development'),

    -- Engineering & Development
    ('Frontend Developer', 'mid', 'Develops user interfaces'),
    ('Backend Developer', 'mid', 'Builds server-side apps and APIs'),
    ('Full Stack Developer', 'senior', 'Works across frontend and backend'),
    ('Software Engineer', 'senior', 'Develops scalable systems'),
    ('Tech Lead', 'manager', 'Oversees technical architecture'),
    ('Engineering Manager', 'manager', 'Leads engineering teams'),
    ('Chief Technology Officer', 'executive', 'Heads technology'),

    -- Quality Assurance
    ('QA Engineer', 'mid', 'Ensures software quality'),
    ('QA Lead', 'manager', 'Leads QA strategy'),

    -- IT & Infrastructure
    ('IT Support Specialist', 'entry', 'Provides IT support'),
    ('System Administrator', 'mid', 'Manages IT systems'),
    ('IT Manager', 'manager', 'Leads IT team'),

    -- Research & Innovation
    ('Research Analyst', 'mid', 'Conducts research and analysis'),
    ('Innovation Manager', 'manager', 'Leads innovation initiatives'),

    -- Legal & Compliance
    ('Legal Associate', 'mid', 'Drafts and reviews contracts'),
    ('Compliance Officer', 'manager', 'Ensures compliance with regulations'),
    ('General Counsel', 'executive', 'Heads legal strategy'),

    -- Procurement & Supply Chain
    ('Procurement Specialist', 'mid', 'Manages purchasing'),
    ('Supply Chain Manager', 'manager', 'Oversees supply chain operations'),

    -- Administration
    ('Office Administrator', 'entry', 'Manages office tasks'),
    ('Admin Manager', 'manager', 'Leads admin and facilities'),

    -- Training & Development
    ('Training Specialist', 'mid', 'Delivers training sessions'),
    ('L&D Manager', 'manager', 'Oversees learning & development'),

    -- Support & Helpdesk
    ('Support Agent', 'entry', 'Provides customer/technical support'),
    ('Support Lead', 'manager', 'Leads support team'),

    -- Design & Creative
    ('UI Designer', 'mid', 'Designs interfaces'),
    ('UX Designer', 'mid', 'Focuses on user experience'),
    ('Creative Director', 'director', 'Oversees design and creative work'),

    -- Executive Leadership
    ('Chief Executive Officer', 'executive', 'Overall company leadership'),
    ('Chief Operating Officer', 'executive', 'Oversees operations'),
    ('Chief Technology Officer', 'executive', 'Leads technology vision'),
    ('Chief Financial Officer', 'executive', 'Manages financial strategy'),
    ('Chief Marketing Officer', 'executive', 'Leads marketing strategy')
) AS pos_data(pos_title, pos_level, pos_description)
CROSS JOIN public.departments d
WHERE NOT EXISTS (
  SELECT 1 FROM public.positions p 
  WHERE p.department_id = d.id AND p.title = pos_data.pos_title AND p.company_id = d.company_id
)
ON CONFLICT (company_id, title, department_id) DO NOTHING;
;

-- Add missing columns to employees table for proper foreign key relationships
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees (department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees (position_id);