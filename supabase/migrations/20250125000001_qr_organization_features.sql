-- Add tags and category columns to employees table
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;

-- Create index for better performance on tags and category filtering
CREATE INDEX IF NOT EXISTS idx_employees_tags ON public.employees USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_employees_category ON public.employees (category);
CREATE INDEX IF NOT EXISTS idx_employees_scan_count ON public.employees (scan_count);

-- Create a function to update scan count from qr_analytics
CREATE OR REPLACE FUNCTION update_employee_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.employees 
  SET scan_count = (
    SELECT COUNT(*) 
    FROM public.qr_analytics 
    WHERE employee_id = NEW.employee_id
  )
  WHERE id = NEW.employee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update scan count
DROP TRIGGER IF EXISTS trigger_update_scan_count ON public.qr_analytics;
CREATE TRIGGER trigger_update_scan_count
  AFTER INSERT ON public.qr_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_scan_count();