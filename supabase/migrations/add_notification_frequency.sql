-- Add notification frequency and weekly download alert fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS review_notification_frequency TEXT DEFAULT 'daily' CHECK (review_notification_frequency IN ('immediate', 'daily'));

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weekly_report_download_alert BOOLEAN DEFAULT true;

-- Update existing profiles to use daily frequency
UPDATE public.profiles 
SET review_notification_frequency = 'daily' 
WHERE review_notification_frequency IS NULL;