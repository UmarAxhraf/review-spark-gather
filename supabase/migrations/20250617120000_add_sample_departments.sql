-- Create sample departments for companies (including development-related)
INSERT INTO departments (id, name, description, company_id, created_at) 
SELECT 
  gen_random_uuid(),
  dept_name,
  dept_description,
  companies.id,
  NOW()
FROM (
  VALUES 
    ('Sales & Marketing', 'Responsible for customer acquisition, sales strategies, and marketing campaigns'),
    ('Customer Service', 'Handles customer support, complaints resolution, and customer satisfaction'),
    ('Operations & Management', 'Oversees daily operations, process optimization, and strategic planning'),
    ('Human Resources', 'Manages employee relations, recruitment, training, and organizational development'),
    ('Finance & Accounting', 'Handles financial planning, budgeting, accounting, and financial reporting'),
    ('Product Development', 'Responsible for product strategy, design, and new feature development'),
    ('Engineering & Development', 'Handles application development, maintenance, and code quality'),
    ('Quality Assurance', 'Ensures product quality through rigorous testing and QA processes'),
    ('IT & Infrastructure', 'Manages internal IT systems, security, and infrastructure support'),
    ('Research & Innovation', 'Focuses on R&D for new technologies and business improvements')
) AS dept_data(dept_name, dept_description)
CROSS JOIN (
  SELECT id FROM auth.users WHERE email IS NOT NULL LIMIT 10
) AS companies;

-- Create sample positions/roles table (already exists in your query)
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  level VARCHAR(50), -- 'entry', 'mid', 'senior', 'manager', 'director'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add sample positions including development roles
INSERT INTO positions (title, level, description)
VALUES 
  -- Sales & Marketing
  ('Sales Representative', 'entry', 'Responsible for direct customer sales and relationship building'),
  ('Sales Manager', 'manager', 'Leads sales team and develops sales strategies'),
  ('Marketing Specialist', 'mid', 'Creates and executes marketing campaigns'),

  -- Customer Service
  ('Customer Service Representative', 'entry', 'Provides front-line customer support'),
  ('Customer Success Manager', 'senior', 'Ensures customer satisfaction and retention'),

  -- Operations & Management
  ('Operations Coordinator', 'mid', 'Coordinates daily operational activities'),
  ('General Manager', 'director', 'Oversees overall business operations'),

  -- Human Resources
  ('HR Specialist', 'mid', 'Handles recruitment and employee relations'),
  ('HR Director', 'director', 'Leads human resources strategy and policies'),

  -- Finance & Accounting
  ('Accountant', 'mid', 'Manages financial records and transactions'),
  ('Finance Manager', 'manager', 'Oversees financial planning and analysis'),

  -- ✅ Development & Engineering Roles
  ('Frontend Developer', 'mid', 'Develops user interfaces using modern frameworks like React or Next.js'),
  ('Backend Developer', 'mid', 'Builds and maintains server-side applications and APIs'),
  ('Full Stack Developer', 'senior', 'Works on both frontend and backend of web applications'),
  ('Mobile App Developer', 'mid', 'Builds and optimizes mobile applications for iOS and Android'),
  ('Software Engineer', 'senior', 'Designs and develops scalable software systems'),
  ('Technical Lead', 'manager', 'Leads engineering teams and oversees technical architecture'),

  -- ✅ QA & Testing
  ('QA Engineer', 'mid', 'Responsible for testing and ensuring software quality'),
  ('Automation Test Engineer', 'senior', 'Builds automated test frameworks and scripts'),

  -- ✅ IT & Infrastructure
  ('DevOps Engineer', 'mid', 'Manages CI/CD pipelines, deployments, and infrastructure'),
  ('System Administrator', 'mid', 'Maintains servers and IT infrastructure'),
  ('Cloud Engineer', 'senior', 'Designs and manages cloud-based infrastructure'),

  -- ✅ Product & Design
  ('Product Manager', 'manager', 'Oversees product lifecycle and feature prioritization'),
  ('UI/UX Designer', 'mid', 'Designs user interfaces and optimizes user experience'),

  -- ✅ R&D
  ('Research Engineer', 'mid', 'Works on innovative solutions and emerging technologies');
