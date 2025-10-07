-- Fix handle_new_user function to include company QR code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  qr_code_id TEXT;
BEGIN
  -- Generate unique QR code ID
  qr_code_id := gen_random_uuid()::text;
  
  -- Create profile first
  INSERT INTO public.profiles (
    id, 
    email, 
    company_name,
    company_qr_code_id,
    company_qr_url,
    trial_start,
    trial_end,
    trial_used,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    qr_code_id,
    NULL,  -- URL will be generated dynamically in the application
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE,
    'trial'
  );

  -- Insert comprehensive departments for the new user
  INSERT INTO public.departments (name, company_id, created_at)
  VALUES 
    -- Core Business Departments
    ('Executive Leadership', NEW.id, NOW()),
    ('Human Resources', NEW.id, NOW()),
    ('Finance & Accounting', NEW.id, NOW()),
    ('Legal & Compliance', NEW.id, NOW()),
    ('Operations', NEW.id, NOW()),
    
    -- Technology Departments
    ('Engineering & Development', NEW.id, NOW()),
    ('Information Technology', NEW.id, NOW()),
    ('Data & Analytics', NEW.id, NOW()),
    ('Quality Assurance', NEW.id, NOW()),
    ('DevOps & Infrastructure', NEW.id, NOW()),
    
    -- Business Development
    ('Sales', NEW.id, NOW()),
    ('Marketing', NEW.id, NOW()),
    ('Business Development', NEW.id, NOW()),
    ('Customer Success', NEW.id, NOW()),
    ('Customer Service', NEW.id, NOW()),
    
    -- Product & Design
    ('Product Management', NEW.id, NOW()),
    ('Design & UX', NEW.id, NOW()),
    ('Research & Development', NEW.id, NOW()),
    
    -- Support Functions
    ('Administration', NEW.id, NOW()),
    ('Facilities Management', NEW.id, NOW()),
    ('Procurement & Supply Chain', NEW.id, NOW()),
    ('Training & Development', NEW.id, NOW()),
    ('Public Relations', NEW.id, NOW()),
    ('Security', NEW.id, NOW()),
    
    -- Industry-Specific Departments
    ('Manufacturing', NEW.id, NOW()),
    ('Logistics & Distribution', NEW.id, NOW()),
    ('Retail Operations', NEW.id, NOW()),
    ('Healthcare Services', NEW.id, NOW()),
    ('Education & Training', NEW.id, NOW()),
    ('Consulting Services', NEW.id, NOW());

  -- Insert comprehensive positions for each department
  INSERT INTO public.positions (title, department_id, company_id, created_at)
  SELECT 
    pos_data.position_name,
    d.id,
    NEW.id,
    NOW()
  FROM public.departments d
  CROSS JOIN (
    VALUES 
      -- Executive Leadership
      ('Executive Leadership', 'Chief Executive Officer (CEO)'),
      ('Executive Leadership', 'Chief Operating Officer (COO)'),
      ('Executive Leadership', 'Chief Financial Officer (CFO)'),
      ('Executive Leadership', 'Chief Technology Officer (CTO)'),
      ('Executive Leadership', 'Chief Marketing Officer (CMO)'),
      ('Executive Leadership', 'Chief Human Resources Officer (CHRO)'),
      ('Executive Leadership', 'Vice President'),
      ('Executive Leadership', 'Director'),
      ('Executive Leadership', 'General Manager'),
      
      -- Human Resources
      ('Human Resources', 'HR Director'),
      ('Human Resources', 'HR Manager'),
      ('Human Resources', 'HR Business Partner'),
      ('Human Resources', 'HR Specialist'),
      ('Human Resources', 'Recruiter'),
      ('Human Resources', 'Talent Acquisition Manager'),
      ('Human Resources', 'Compensation & Benefits Analyst'),
      ('Human Resources', 'Employee Relations Specialist'),
      ('Human Resources', 'Training Coordinator'),
      ('Human Resources', 'HR Assistant'),
      
      -- Finance & Accounting
      ('Finance & Accounting', 'Finance Director'),
      ('Finance & Accounting', 'Finance Manager'),
      ('Finance & Accounting', 'Financial Analyst'),
      ('Finance & Accounting', 'Senior Financial Analyst'),
      ('Finance & Accounting', 'Accounting Manager'),
      ('Finance & Accounting', 'Senior Accountant'),
      ('Finance & Accounting', 'Staff Accountant'),
      ('Finance & Accounting', 'Accounts Payable Specialist'),
      ('Finance & Accounting', 'Accounts Receivable Specialist'),
      ('Finance & Accounting', 'Payroll Specialist'),
      ('Finance & Accounting', 'Budget Analyst'),
      ('Finance & Accounting', 'Tax Specialist'),
      ('Finance & Accounting', 'Auditor'),
      
      -- Legal & Compliance
      ('Legal & Compliance', 'General Counsel'),
      ('Legal & Compliance', 'Legal Director'),
      ('Legal & Compliance', 'Corporate Lawyer'),
      ('Legal & Compliance', 'Compliance Manager'),
      ('Legal & Compliance', 'Compliance Officer'),
      ('Legal & Compliance', 'Legal Assistant'),
      ('Legal & Compliance', 'Paralegal'),
      
      -- Operations
      ('Operations', 'Operations Director'),
      ('Operations', 'Operations Manager'),
      ('Operations', 'Operations Analyst'),
      ('Operations', 'Process Improvement Manager'),
      ('Operations', 'Operations Coordinator'),
      ('Operations', 'Operations Specialist'),
      
      -- Engineering & Development
      ('Engineering & Development', 'Engineering Director'),
      ('Engineering & Development', 'Engineering Manager'),
      ('Engineering & Development', 'Principal Engineer'),
      ('Engineering & Development', 'Senior Software Engineer'),
      ('Engineering & Development', 'Software Engineer'),
      ('Engineering & Development', 'Junior Software Engineer'),
      ('Engineering & Development', 'Frontend Developer'),
      ('Engineering & Development', 'Backend Developer'),
      ('Engineering & Development', 'Full Stack Developer'),
      ('Engineering & Development', 'Mobile Developer'),
      ('Engineering & Development', 'DevOps Engineer'),
      ('Engineering & Development', 'Site Reliability Engineer'),
      ('Engineering & Development', 'Software Architect'),
      ('Engineering & Development', 'Technical Lead'),
      
      -- Information Technology
      ('Information Technology', 'IT Director'),
      ('Information Technology', 'IT Manager'),
      ('Information Technology', 'Systems Administrator'),
      ('Information Technology', 'Network Administrator'),
      ('Information Technology', 'Database Administrator'),
      ('Information Technology', 'IT Support Specialist'),
      ('Information Technology', 'Help Desk Technician'),
      ('Information Technology', 'Cybersecurity Analyst'),
      ('Information Technology', 'IT Project Manager'),
      
      -- Data & Analytics
      ('Data & Analytics', 'Data Science Director'),
      ('Data & Analytics', 'Data Science Manager'),
      ('Data & Analytics', 'Senior Data Scientist'),
      ('Data & Analytics', 'Data Scientist'),
      ('Data & Analytics', 'Data Analyst'),
      ('Data & Analytics', 'Business Intelligence Analyst'),
      ('Data & Analytics', 'Data Engineer'),
      ('Data & Analytics', 'Machine Learning Engineer'),
      
      -- Quality Assurance
      ('Quality Assurance', 'QA Director'),
      ('Quality Assurance', 'QA Manager'),
      ('Quality Assurance', 'Senior QA Engineer'),
      ('Quality Assurance', 'QA Engineer'),
      ('Quality Assurance', 'Test Automation Engineer'),
      ('Quality Assurance', 'Manual Tester'),
      ('Quality Assurance', 'Performance Tester'),
      
      -- DevOps & Infrastructure
      ('DevOps & Infrastructure', 'DevOps Director'),
      ('DevOps & Infrastructure', 'DevOps Manager'),
      ('DevOps & Infrastructure', 'Senior DevOps Engineer'),
      ('DevOps & Infrastructure', 'DevOps Engineer'),
      ('DevOps & Infrastructure', 'Cloud Engineer'),
      ('DevOps & Infrastructure', 'Infrastructure Engineer'),
      
      -- Sales
      ('Sales', 'Sales Director'),
      ('Sales', 'Sales Manager'),
      ('Sales', 'Senior Sales Representative'),
      ('Sales', 'Sales Representative'),
      ('Sales', 'Inside Sales Representative'),
      ('Sales', 'Account Executive'),
      ('Sales', 'Account Manager'),
      ('Sales', 'Sales Development Representative'),
      ('Sales', 'Sales Engineer'),
      ('Sales', 'Sales Operations Manager'),
      ('Sales', 'Sales Coordinator'),
      
      -- Marketing
      ('Marketing', 'Marketing Director'),
      ('Marketing', 'Marketing Manager'),
      ('Marketing', 'Digital Marketing Manager'),
      ('Marketing', 'Content Marketing Manager'),
      ('Marketing', 'Social Media Manager'),
      ('Marketing', 'SEO Specialist'),
      ('Marketing', 'PPC Specialist'),
      ('Marketing', 'Email Marketing Specialist'),
      ('Marketing', 'Marketing Analyst'),
      ('Marketing', 'Brand Manager'),
      ('Marketing', 'Product Marketing Manager'),
      ('Marketing', 'Marketing Coordinator'),
      ('Marketing', 'Graphic Designer'),
      
      -- Business Development
      ('Business Development', 'Business Development Director'),
      ('Business Development', 'Business Development Manager'),
      ('Business Development', 'Business Development Representative'),
      ('Business Development', 'Partnership Manager'),
      ('Business Development', 'Strategic Partnerships Manager'),
      
      -- Customer Success
      ('Customer Success', 'Customer Success Director'),
      ('Customer Success', 'Customer Success Manager'),
      ('Customer Success', 'Customer Success Representative'),
      ('Customer Success', 'Customer Onboarding Specialist'),
      ('Customer Success', 'Customer Retention Specialist'),
      
      -- Customer Service
      ('Customer Service', 'Customer Service Director'),
      ('Customer Service', 'Customer Service Manager'),
      ('Customer Service', 'Senior Customer Service Representative'),
      ('Customer Service', 'Customer Service Representative'),
      ('Customer Service', 'Customer Support Specialist'),
      ('Customer Service', 'Technical Support Specialist'),
      ('Customer Service', 'Call Center Agent'),
      
      -- Product Management
      ('Product Management', 'Chief Product Officer'),
      ('Product Management', 'Product Director'),
      ('Product Management', 'Senior Product Manager'),
      ('Product Management', 'Product Manager'),
      ('Product Management', 'Associate Product Manager'),
      ('Product Management', 'Product Owner'),
      ('Product Management', 'Product Analyst'),
      
      -- Design & UX
      ('Design & UX', 'Design Director'),
      ('Design & UX', 'Senior UX Designer'),
      ('Design & UX', 'UX Designer'),
      ('Design & UX', 'UI Designer'),
      ('Design & UX', 'Visual Designer'),
      ('Design & UX', 'UX Researcher'),
      ('Design & UX', 'Interaction Designer'),
      ('Design & UX', 'Design Systems Designer'),
      
      -- Research & Development
      ('Research & Development', 'R&D Director'),
      ('Research & Development', 'Research Manager'),
      ('Research & Development', 'Senior Research Scientist'),
      ('Research & Development', 'Research Scientist'),
      ('Research & Development', 'Research Analyst'),
      ('Research & Development', 'Innovation Manager'),
      
      -- Administration
      ('Administration', 'Administrative Director'),
      ('Administration', 'Administrative Manager'),
      ('Administration', 'Executive Assistant'),
      ('Administration', 'Administrative Assistant'),
      ('Administration', 'Office Manager'),
      ('Administration', 'Receptionist'),
      ('Administration', 'Data Entry Clerk'),
      
      -- Facilities Management
      ('Facilities Management', 'Facilities Director'),
      ('Facilities Management', 'Facilities Manager'),
      ('Facilities Management', 'Facilities Coordinator'),
      ('Facilities Management', 'Maintenance Supervisor'),
      ('Facilities Management', 'Maintenance Technician'),
      ('Facilities Management', 'Custodial Staff'),
      
      -- Procurement & Supply Chain
      ('Procurement & Supply Chain', 'Supply Chain Director'),
      ('Procurement & Supply Chain', 'Procurement Manager'),
      ('Procurement & Supply Chain', 'Purchasing Manager'),
      ('Procurement & Supply Chain', 'Buyer'),
      ('Procurement & Supply Chain', 'Supply Chain Analyst'),
      ('Procurement & Supply Chain', 'Vendor Manager'),
      
      -- Training & Development
      ('Training & Development', 'Learning & Development Director'),
      ('Training & Development', 'Training Manager'),
      ('Training & Development', 'Training Specialist'),
      ('Training & Development', 'Instructional Designer'),
      ('Training & Development', 'Corporate Trainer'),
      
      -- Public Relations
      ('Public Relations', 'PR Director'),
      ('Public Relations', 'PR Manager'),
      ('Public Relations', 'Communications Manager'),
      ('Public Relations', 'PR Specialist'),
      ('Public Relations', 'Communications Specialist'),
      
      -- Security
      ('Security', 'Security Director'),
      ('Security', 'Security Manager'),
      ('Security', 'Security Officer'),
      ('Security', 'Security Guard'),
      ('Security', 'Cybersecurity Specialist'),
      
      -- Manufacturing
      ('Manufacturing', 'Manufacturing Director'),
      ('Manufacturing', 'Plant Manager'),
      ('Manufacturing', 'Production Manager'),
      ('Manufacturing', 'Production Supervisor'),
      ('Manufacturing', 'Manufacturing Engineer'),
      ('Manufacturing', 'Production Worker'),
      ('Manufacturing', 'Quality Control Inspector'),
      
      -- Logistics & Distribution
      ('Logistics & Distribution', 'Logistics Director'),
      ('Logistics & Distribution', 'Logistics Manager'),
      ('Logistics & Distribution', 'Distribution Manager'),
      ('Logistics & Distribution', 'Warehouse Manager'),
      ('Logistics & Distribution', 'Shipping Coordinator'),
      ('Logistics & Distribution', 'Warehouse Worker'),
      
      -- Retail Operations
      ('Retail Operations', 'Retail Director'),
      ('Retail Operations', 'Store Manager'),
      ('Retail Operations', 'Assistant Store Manager'),
      ('Retail Operations', 'Shift Supervisor'),
      ('Retail Operations', 'Sales Associate'),
      ('Retail Operations', 'Cashier'),
      ('Retail Operations', 'Visual Merchandiser'),
      
      -- Healthcare Services
      ('Healthcare Services', 'Medical Director'),
      ('Healthcare Services', 'Physician'),
      ('Healthcare Services', 'Nurse Practitioner'),
      ('Healthcare Services', 'Registered Nurse'),
      ('Healthcare Services', 'Medical Assistant'),
      ('Healthcare Services', 'Healthcare Administrator'),
      
      -- Education & Training
      ('Education & Training', 'Education Director'),
      ('Education & Training', 'Principal'),
      ('Education & Training', 'Teacher'),
      ('Education & Training', 'Instructor'),
      ('Education & Training', 'Curriculum Developer'),
      ('Education & Training', 'Academic Advisor'),
      
      -- Consulting Services
      ('Consulting Services', 'Consulting Director'),
      ('Consulting Services', 'Senior Consultant'),
      ('Consulting Services', 'Consultant'),
      ('Consulting Services', 'Junior Consultant'),
      ('Consulting Services', 'Business Analyst'),
      ('Consulting Services', 'Project Manager')
  ) AS pos_data(dept_name, position_name)
  WHERE d.name = pos_data.dept_name AND d.company_id = NEW.id;

  -- Insert categories for the new user
  INSERT INTO public.categories (name, company_id, created_at, updated_at)
  VALUES 
    ('Employee', NEW.id, NOW(), NOW()),
    ('Campaign', NEW.id, NOW(), NOW()),
    ('Branch', NEW.id, NOW(), NOW()),
    ('Event', NEW.id, NOW(), NOW()),
    ('Product', NEW.id, NOW(), NOW()),
    ('Service', NEW.id, NOW(), NOW()),
    ('Location', NEW.id, NOW(), NOW()),
    ('Team', NEW.id, NOW(), NOW());

  -- Insert tags for the new user
  INSERT INTO public.tags (name, company_id, created_at, updated_at)
  VALUES 
    ('New Hire', NEW.id, NOW(), NOW()),
    ('Manager', NEW.id, NOW(), NOW()),
    ('Senior', NEW.id, NOW(), NOW()),
    ('Junior', NEW.id, NOW(), NOW()),
    ('Remote', NEW.id, NOW(), NOW()),
    ('On-site', NEW.id, NOW(), NOW()),
    ('Hybrid', NEW.id, NOW(), NOW()),
    ('Team Lead', NEW.id, NOW(), NOW()),
    ('Full-time', NEW.id, NOW(), NOW()),
    ('Part-time', NEW.id, NOW(), NOW()),
    ('Contract', NEW.id, NOW(), NOW()),
    ('Intern', NEW.id, NOW(), NOW()),
    ('Temporary', NEW.id, NOW(), NOW()),
    ('High Performer', NEW.id, NOW(), NOW()),
    ('Training Required', NEW.id, NOW(), NOW());

  -- Insert default email templates for the new user
  INSERT INTO public.review_templates (company_id, name, subject, content, category, is_active, created_at, updated_at)
  VALUES 
    (NEW.id, 'Positive Response', 'Thank you for your wonderful review!', 'Thank you so much for taking the time to leave us such a positive review! We''re thrilled to hear about your great experience with our team. Your feedback means the world to us and motivates us to continue providing excellent service.', 'positive', true, NOW(), NOW()),
    (NEW.id, 'Negative Response', 'Thank you for your feedback - We''re here to help', 'Thank you for bringing this to our attention. We sincerely apologize for not meeting your expectations. Your feedback is valuable to us, and we would love the opportunity to discuss this further and make things right. Please contact us directly so we can address your concerns.', 'negative', true, NOW(), NOW()),
    (NEW.id, 'General Thank You', 'Thank you for your review!', 'Thank you for taking the time to leave us a review. Your feedback is invaluable to us as we strive to provide the best possible service to all our customers.', 'general', true, NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing companies that have NULL company_qr_code_id
UPDATE public.profiles 
SET company_qr_code_id = gen_random_uuid()::text 
WHERE company_qr_code_id IS NULL;

-- Ensure the column has the DEFAULT constraint for new records
ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET DEFAULT gen_random_uuid()::text;

-- Ensure the column is NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN company_qr_code_id SET NOT NULL;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();