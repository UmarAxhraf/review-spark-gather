-- Fix notification trigger to handle both employee and company reviews
CREATE OR REPLACE FUNCTION public.create_review_notification()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
  company_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Create notification title
  notification_title := 'New ' || NEW.rating || '-Star Review';
  
  -- Handle different review types
  IF NEW.review_target_type = 'employee' AND NEW.employee_id IS NOT NULL THEN
    -- Get employee name for employee reviews
    SELECT name INTO employee_name FROM public.employees WHERE id = NEW.employee_id;
    notification_message := NEW.customer_name || ' left a ' || NEW.rating || '-star review for ' || COALESCE(employee_name, 'an employee');
  ELSE
    -- Handle company reviews
    SELECT company_name INTO company_name FROM public.profiles WHERE id = NEW.company_id;
    notification_message := NEW.customer_name || ' left a ' || NEW.rating || '-star review for your company' || CASE WHEN company_name IS NOT NULL THEN ' (' || company_name || ')' ELSE '' END;
  END IF;
  
  -- Insert notification
  INSERT INTO public.notifications (
    company_id,
    employee_id,
    review_id,
    type,
    title,
    message,
    priority,
    action_url
  ) VALUES (
    NEW.company_id,
    NEW.employee_id, -- This will be NULL for company reviews, which is fine
    NEW.id,
    'review',
    notification_title,
    notification_message,
    CASE 
      WHEN NEW.rating >= 4 THEN 'high'
      WHEN NEW.rating >= 3 THEN 'medium'
      ELSE 'low'
    END,
    '/reviews'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;