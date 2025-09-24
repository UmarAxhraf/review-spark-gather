-- Ensure all positions have proper department relationships
-- First, let's check if there are positions without department_id
UPDATE public.positions 
SET department_id = (
  SELECT d.id 
  FROM public.departments d 
  WHERE d.company_id = positions.company_id 
  AND (
    -- Map positions to appropriate departments
    (positions.title ILIKE '%sales%' OR positions.title ILIKE '%marketing%') AND d.name = 'Sales & Marketing'
    OR (positions.title ILIKE '%customer%' OR positions.title ILIKE '%support%') AND d.name = 'Customer Service'
    OR (positions.title ILIKE '%developer%' OR positions.title ILIKE '%engineer%' OR positions.title ILIKE '%frontend%' OR positions.title ILIKE '%backend%') AND d.name = 'Engineering & Development'
    OR (positions.title ILIKE '%qa%' OR positions.title ILIKE '%quality%' OR positions.title ILIKE '%test%') AND d.name = 'Quality Assurance'
    OR (positions.title ILIKE '%hr%' OR positions.title ILIKE '%human%') AND d.name = 'Human Resources'
    OR (positions.title ILIKE '%finance%' OR positions.title ILIKE '%accounting%') AND d.name = 'Finance & Accounting'
    OR (positions.title ILIKE '%product%') AND d.name = 'Product Development'
    OR (positions.title ILIKE '%it%' OR positions.title ILIKE '%system%' OR positions.title ILIKE '%devops%') AND d.name = 'IT & Infrastructure'
    OR (positions.title ILIKE '%manager%' OR positions.title ILIKE '%director%' OR positions.title ILIKE '%ceo%' OR positions.title ILIKE '%cto%') AND d.name = 'Operations & Management'
  )
  LIMIT 1
)
WHERE department_id IS NULL;

-- For any remaining positions without department_id, assign them to 'Operations & Management'
UPDATE public.positions 
SET department_id = (
  SELECT d.id 
  FROM public.departments d 
  WHERE d.company_id = positions.company_id 
  AND d.name = 'Operations & Management'
  LIMIT 1
)
WHERE department_id IS NULL;

-- Add constraint to ensure all positions have a department
ALTER TABLE public.positions 
ALTER COLUMN department_id SET NOT NULL;