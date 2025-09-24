-- Clean insert migration: Remove existing data and insert new departments, positions, categories, and tags
-- Based on provided image data

BEGIN;

-- 1. CLEAN EXISTING DATA
-- Remove existing data in correct order (respecting foreign key constraints)

-- First, update employees to remove department and position references
UPDATE public.employees SET department_id = NULL WHERE department_id IS NOT NULL;
UPDATE public.employees SET position_id = NULL WHERE position_id IS NOT NULL;

-- Now safely delete in correct order
DELETE FROM public.employee_tags;
DELETE FROM public.positions;
DELETE FROM public.tags;
DELETE FROM public.categories;
DELETE FROM public.departments;

-- 2. INSERT DEPARTMENTS
-- Insert departments for all existing companies (only using existing columns)
INSERT INTO public.departments (name, company_id, created_at)
SELECT dept_name, p.id, NOW()
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('HR'),
    ('Engineering'),
    ('Sales'),
    ('Marketing'),
    ('Finance'),
    ('Operations'),
    ('Customer Service'),
    ('Legal'),
    ('IT'),
    ('Research and Development'),
    ('Quality Assurance'),
    ('Business Development'),
    ('Product Management'),
    ('Design'),
    ('Administration'),
    ('Procurement'),
    ('Training and Development'),
    ('Public Relations'),
    ('Security'),
    ('Facilities Management')
) AS dept_data(dept_name);

-- 3. INSERT POSITIONS
-- Insert positions mapped to their respective departments (including company_id)
INSERT INTO public.positions (title, department_id, company_id, created_at)
SELECT 
  pos_data.position_name,
  d.id,
  d.company_id,
  NOW()
FROM public.departments d
CROSS JOIN (
  VALUES 
    -- HR positions
    ('HR', 'HR Manager'),
    ('HR', 'HR Specialist'),
    ('HR', 'Recruiter'),
    ('HR', 'HR Coordinator'),
    ('HR', 'Payroll Specialist'),
    ('HR', 'Benefits Administrator'),
    ('HR', 'Training Coordinator'),
    ('HR', 'Employee Relations Specialist'),
    
    -- Engineering positions
    ('Engineering', 'Software Engineer'),
    ('Engineering', 'Senior Software Engineer'),
    ('Engineering', 'Lead Engineer'),
    ('Engineering', 'Engineering Manager'),
    ('Engineering', 'DevOps Engineer'),
    ('Engineering', 'Frontend Developer'),
    ('Engineering', 'Backend Developer'),
    ('Engineering', 'Full Stack Developer'),
    ('Engineering', 'System Architect'),
    ('Engineering', 'Technical Lead'),
    
    -- Sales positions
    ('Sales', 'Sales Representative'),
    ('Sales', 'Senior Sales Representative'),
    ('Sales', 'Sales Manager'),
    ('Sales', 'Account Manager'),
    ('Sales', 'Business Development Representative'),
    ('Sales', 'Sales Director'),
    ('Sales', 'Regional Sales Manager'),
    ('Sales', 'Inside Sales Representative'),
    
    -- Marketing positions
    ('Marketing', 'Marketing Manager'),
    ('Marketing', 'Digital Marketing Specialist'),
    ('Marketing', 'Content Marketing Manager'),
    ('Marketing', 'Social Media Manager'),
    ('Marketing', 'Marketing Coordinator'),
    ('Marketing', 'Brand Manager'),
    ('Marketing', 'SEO Specialist'),
    ('Marketing', 'Marketing Analyst'),
    
    -- Finance positions
    ('Finance', 'Financial Analyst'),
    ('Finance', 'Accountant'),
    ('Finance', 'Finance Manager'),
    ('Finance', 'Controller'),
    ('Finance', 'CFO'),
    ('Finance', 'Accounts Payable Specialist'),
    ('Finance', 'Accounts Receivable Specialist'),
    ('Finance', 'Budget Analyst'),
    
    -- Operations positions
    ('Operations', 'Operations Manager'),
    ('Operations', 'Operations Coordinator'),
    ('Operations', 'Process Improvement Specialist'),
    ('Operations', 'Supply Chain Manager'),
    ('Operations', 'Logistics Coordinator'),
    ('Operations', 'Operations Analyst'),
    
    -- Customer Service positions
    ('Customer Service', 'Customer Service Representative'),
    ('Customer Service', 'Customer Service Manager'),
    ('Customer Service', 'Customer Success Manager'),
    ('Customer Service', 'Technical Support Specialist'),
    ('Customer Service', 'Customer Service Coordinator'),
    
    -- Other departments with generic positions
    ('Legal', 'Legal Counsel'),
    ('Legal', 'Paralegal'),
    ('Legal', 'Compliance Officer'),
    
    ('IT', 'IT Manager'),
    ('IT', 'System Administrator'),
    ('IT', 'Network Administrator'),
    ('IT', 'IT Support Specialist'),
    
    ('Research and Development', 'Research Scientist'),
    ('Research and Development', 'R&D Manager'),
    ('Research and Development', 'Product Developer'),
    
    ('Quality Assurance', 'QA Engineer'),
    ('Quality Assurance', 'QA Manager'),
    ('Quality Assurance', 'Test Analyst'),
    
    ('Business Development', 'Business Development Manager'),
    ('Business Development', 'Partnership Manager'),
    
    ('Product Management', 'Product Manager'),
    ('Product Management', 'Senior Product Manager'),
    ('Product Management', 'Product Owner'),
    
    ('Design', 'UI/UX Designer'),
    ('Design', 'Graphic Designer'),
    ('Design', 'Design Manager'),
    
    ('Administration', 'Administrative Assistant'),
    ('Administration', 'Office Manager'),
    ('Administration', 'Executive Assistant'),
    
    ('Procurement', 'Procurement Manager'),
    ('Procurement', 'Purchasing Agent'),
    
    ('Training and Development', 'Training Manager'),
    ('Training and Development', 'Learning and Development Specialist'),
    
    ('Public Relations', 'PR Manager'),
    ('Public Relations', 'Communications Specialist'),
    
    ('Security', 'Security Manager'),
    ('Security', 'Security Officer'),
    
    ('Facilities Management', 'Facilities Manager'),
    ('Facilities Management', 'Maintenance Coordinator')
) AS pos_data(dept_name, position_name)
WHERE d.name = pos_data.dept_name;

-- 4. INSERT CATEGORIES
-- Based on the categories shown in the image
INSERT INTO public.categories (name, company_id, created_at, updated_at)
SELECT cat_name, p.id, NOW(), NOW()
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('Employee'),
    ('Campaign'),
    ('Branch'),
    ('Event'),
    ('Product')
) AS cat_data(cat_name);

-- 5. INSERT TAGS
-- Based on the tags shown in the image
INSERT INTO public.tags (name, company_id, created_at, updated_at)
SELECT tag_name, p.id, NOW(), NOW()
FROM public.profiles p
CROSS JOIN (
  VALUES 
    ('New'),
    ('Manager'),
    ('Remote'),
    ('Team-lead'),
    ('Full-time'),
    ('Part-time')
) AS tag_data(tag_name);

COMMIT;