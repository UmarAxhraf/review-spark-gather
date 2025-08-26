-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('review', 'team', 'qr', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their company notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert notifications for their company" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their company notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their company notifications" 
  ON public.notifications 
  FOR DELETE 
  USING (auth.uid() = company_id);

-- Create indexes for better performance
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Function to automatically create notification when review is submitted
CREATE OR REPLACE FUNCTION public.create_review_notification()
RETURNS TRIGGER AS $$
DECLARE
  employee_name TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get employee name
  SELECT name INTO employee_name FROM public.employees WHERE id = NEW.employee_id;
  
  -- Create notification title and message
  notification_title := 'New ' || NEW.rating || '-Star Review';
  notification_message := NEW.customer_name || ' left a ' || NEW.rating || '-star review for ' || employee_name;
  
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
    NEW.employee_id,
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

-- Trigger to automatically create notification when review is submitted
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.create_review_notification();