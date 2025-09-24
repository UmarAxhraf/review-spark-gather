-- Add default tags for all admin companies
INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'New Hire' as name,
  'Recently joined employees' as description,
  '#3B82F6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Team Lead' as name,
  'Team leadership roles' as description,
  '#8B5CF6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Remote' as name,
  'Remote workers' as description,
  '#10B981' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Full-time' as name,
  'Full-time employees' as description,
  '#F59E0B' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Part-time' as name,
  'Part-time employees' as description,
  '#EF4444' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Trainee' as name,
  'Employees in training' as description,
  '#6366F1' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

-- Add default tags for all admin companies
INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'New Hire' as name,
  'Recently joined employees' as description,
  '#3B82F6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Team Lead' as name,
  'Team leadership roles' as description,
  '#8B5CF6' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Remote' as name,
  'Remote workers' as description,
  '#10B981' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Full-time' as name,
  'Full-time employees' as description,
  '#F59E0B' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Part-time' as name,
  'Part-time employees' as description,
  '#EF4444' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;

INSERT INTO public.tags (company_id, name, description, color) 
SELECT 
  id as company_id,
  'Trainee' as name,
  'Employees in training' as description,
  '#6366F1' as color
FROM public.profiles 
WHERE role = 'admin'
ON CONFLICT (company_id, name) DO NOTHING;