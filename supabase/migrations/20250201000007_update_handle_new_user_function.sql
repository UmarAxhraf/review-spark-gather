-- Update handle_new_user function to use the new data structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile first
  INSERT INTO public.profiles (
    id, 
    email, 
    company_name,
    trial_start,
    trial_end,
    trial_used,
    subscription_status
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'company_name',
    NOW(),
    NOW() + INTERVAL '7 days',
    FALSE,
    'trial'
  );

  -- Insert departments for the new user
  INSERT INTO public.departments (name, company_id, created_at)
  VALUES 
    ('HR', NEW.id, NOW()),
    ('Engineering', NEW.id, NOW()),
    ('Sales', NEW.id, NOW()),
    ('Marketing', NEW.id, NOW()),
    ('Finance', NEW.id, NOW()),
    ('Operations', NEW.id, NOW()),
    ('Customer Service', NEW.id, NOW()),
    ('Legal', NEW.id, NOW()),
    ('IT', NEW.id, NOW()),
    ('Research and Development', NEW.id, NOW()),
    ('Quality Assurance', NEW.id, NOW()),
    ('Business Development', NEW.id, NOW()),
    ('Product Management', NEW.id, NOW()),
    ('Design', NEW.id, NOW()),
    ('Administration', NEW.id, NOW()),
    ('Procurement', NEW.id, NOW()),
    ('Training and Development', NEW.id, NOW()),
    ('Public Relations', NEW.id, NOW()),
    ('Security', NEW.id, NOW()),
    ('Facilities Management', NEW.id, NOW());

  -- Insert key positions for each department (FIXED: changed 'name' to 'title')
  INSERT INTO public.positions (title, department_id, company_id, created_at)
  SELECT 
    pos_data.position_name,
    d.id,
    NEW.id,
    NOW()
  FROM public.departments d
  CROSS JOIN (
    VALUES 
      ('HR', 'HR Manager'),
      ('HR', 'HR Specialist'),
      ('Engineering', 'Software Engineer'),
      ('Engineering', 'Senior Software Engineer'),
      ('Sales', 'Sales Representative'),
      ('Sales', 'Sales Manager'),
      ('Marketing', 'Marketing Manager'),
      ('Marketing', 'Digital Marketing Specialist'),
      ('Finance', 'Financial Analyst'),
      ('Finance', 'Accountant'),
      ('Operations', 'Operations Manager'),
      ('Customer Service', 'Customer Service Representative')
  ) AS pos_data(dept_name, position_name)
  WHERE d.name = pos_data.dept_name AND d.company_id = NEW.id;

  -- Insert categories for the new user
  INSERT INTO public.categories (name, company_id, created_at, updated_at)
  VALUES 
    ('Employee', NEW.id, NOW(), NOW()),
    ('Campaign', NEW.id, NOW(), NOW()),
    ('Branch', NEW.id, NOW(), NOW()),
    ('Event', NEW.id, NOW(), NOW()),
    ('Product', NEW.id, NOW(), NOW());

  -- Insert tags for the new user
  INSERT INTO public.tags (name, company_id, created_at, updated_at)
  VALUES 
    ('New', NEW.id, NOW(), NOW()),
    ('Manager', NEW.id, NOW(), NOW()),
    ('Remote', NEW.id, NOW(), NOW()),
    ('Team-lead', NEW.id, NOW(), NOW()),
    ('Full-time', NEW.id, NOW(), NOW()),
    ('Part-time', NEW.id, NOW(), NOW());

  -- Insert default email templates for the new user
  INSERT INTO public.review_templates (company_id, name, subject, content, category, is_active, created_at, updated_at)
  VALUES 
    (NEW.id, 'Positive Response', 'Thank you for your wonderful review!', '\nThank you so much for taking the time to leave us such a positive review! We''re thrilled to hear about your great experience with our team. Your feedback means the world to us and motivates us to continue providing excellent service.', 'positive', true, NOW(), NOW()),
    (NEW.id, 'Negative Response', 'Thank you for your feedback - We''re here to help', '\nThank you for bringing this to our attention. We sincerely apologize for not meeting your expectations. Your feedback is valuable to us, and we would love the opportunity to discuss this further and make things right. Please contact us directly so we can address your concerns.', 'negative', true, NOW(), NOW()),
    (NEW.id, 'General Thank You', 'Thank you for your review!', '\nThank you for taking the time to leave us a review. Your feedback is invaluable to us as we strive to provide the best possible service to all our customers.', 'general', true, NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();