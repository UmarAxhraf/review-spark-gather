-- Add new columns to reviews table for enhanced management
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS flagged_as_spam BOOLEAN DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id);
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS sentiment_score FLOAT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS response_template_id UUID;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_response TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES public.profiles(id);

-- Create review templates table
CREATE TABLE IF NOT EXISTS public.review_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('positive', 'negative', 'neutral', 'general', 'complaint', 'compliment')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create review assignments table for routing
CREATE TABLE IF NOT EXISTS public.review_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed')),
  notes TEXT
);

-- Create review analytics table
CREATE TABLE IF NOT EXISTS public.review_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE NOT NULL,
  sentiment_score FLOAT,
  sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral')),
  keywords TEXT[],
  topics TEXT[],
  confidence_score FLOAT,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add QR code management columns
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qr_scan_limit INTEGER;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qr_is_active BOOLEAN DEFAULT true;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS custom_landing_page TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS qr_redirect_url TEXT;

-- Create QR code analytics table
CREATE TABLE IF NOT EXISTS public.qr_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id TEXT REFERENCES public.employees(qr_code_id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  scan_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  location_country TEXT,
  location_city TEXT,
  referrer TEXT,
  scan_duration INTEGER -- in seconds
);

-- Enable RLS on new tables
ALTER TABLE public.review_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for review templates
CREATE POLICY "Users can view their company review templates" 
  ON public.review_templates 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert review templates for their company" 
  ON public.review_templates 
  FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their company review templates" 
  ON public.review_templates 
  FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their company review templates" 
  ON public.review_templates 
  FOR DELETE 
  USING (auth.uid() = company_id);

-- RLS policies for review assignments
CREATE POLICY "Users can view review assignments for their company" 
  ON public.review_assignments 
  FOR SELECT 
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

CREATE POLICY "Users can create review assignments" 
  ON public.review_assignments 
  FOR INSERT 
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can update their review assignments" 
  ON public.review_assignments 
  FOR UPDATE 
  USING (auth.uid() = assigned_to OR auth.uid() = assigned_by);

-- RLS policies for review analytics
CREATE POLICY "Users can view analytics for their company reviews" 
  ON public.review_analytics 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r 
      WHERE r.id = review_analytics.review_id 
      AND r.company_id = auth.uid()
    )
  );

-- RLS policies for QR analytics
CREATE POLICY "Users can view their company QR analytics" 
  ON public.qr_analytics 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Anyone can insert QR analytics" 
  ON public.qr_analytics 
  FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_moderation_status ON public.reviews(moderation_status);
CREATE INDEX IF NOT EXISTS idx_reviews_assigned_to ON public.reviews(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reviews_flagged_spam ON public.reviews(flagged_as_spam);
CREATE INDEX IF NOT EXISTS idx_review_templates_company ON public.review_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_assigned_to ON public.review_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_scan_date ON public.qr_analytics(scan_date);
CREATE INDEX IF NOT EXISTS idx_qr_analytics_employee ON public.qr_analytics(employee_id);

-- Function for spam detection
CREATE OR REPLACE FUNCTION public.detect_spam_content(content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  spam_keywords TEXT[] := ARRAY['spam', 'fake', 'bot', 'scam', 'click here', 'free money', 'urgent', 'limited time'];
  keyword TEXT;
  word_count INTEGER;
  repeated_chars INTEGER;
BEGIN
  -- Check for spam keywords
  FOREACH keyword IN ARRAY spam_keywords LOOP
    IF LOWER(content) LIKE '%' || keyword || '%' THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- Check for excessive repeated characters
  SELECT COUNT(*) INTO repeated_chars
  FROM regexp_split_to_table(content, '') AS char
  GROUP BY char
  HAVING COUNT(*) > 10;
  
  IF repeated_chars > 0 THEN
    RETURN true;
  END IF;
  
  -- Check for very short or very long content
  word_count := array_length(string_to_array(trim(content), ' '), 1);
  IF word_count < 2 OR word_count > 500 THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for basic sentiment analysis
CREATE OR REPLACE FUNCTION public.analyze_sentiment(content TEXT)
RETURNS TABLE(sentiment_score FLOAT, sentiment_label TEXT) AS $$
DECLARE
  positive_words TEXT[] := ARRAY['excellent', 'amazing', 'great', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'brilliant', 'awesome'];
  negative_words TEXT[] := ARRAY['terrible', 'awful', 'horrible', 'bad', 'worst', 'hate', 'disgusting', 'disappointing', 'poor', 'useless'];
  positive_count INTEGER := 0;
  negative_count INTEGER := 0;
  total_words INTEGER;
  score FLOAT;
  label TEXT;
  word TEXT;
BEGIN
  -- Count positive words
  FOREACH word IN ARRAY positive_words LOOP
    positive_count := positive_count + (LENGTH(LOWER(content)) - LENGTH(REPLACE(LOWER(content), word, ''))) / LENGTH(word);
  END LOOP;
  
  -- Count negative words
  FOREACH word IN ARRAY negative_words LOOP
    negative_count := negative_count + (LENGTH(LOWER(content)) - LENGTH(REPLACE(LOWER(content), word, ''))) / LENGTH(word);
  END LOOP;
  
  total_words := array_length(string_to_array(trim(content), ' '), 1);
  
  -- Calculate sentiment score (-1 to 1)
  IF total_words > 0 THEN
    score := (positive_count - negative_count)::FLOAT / total_words;
  ELSE
    score := 0;
  END IF;
  
  -- Determine label
  IF score > 0.1 THEN
    label := 'positive';
  ELSIF score < -0.1 THEN
    label := 'negative';
  ELSE
    label := 'neutral';
  END IF;
  
  RETURN QUERY SELECT score, label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for automatic review processing
CREATE OR REPLACE FUNCTION public.process_review_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  spam_detected BOOLEAN;
  sentiment_result RECORD;
BEGIN
  -- Check for spam
  IF NEW.comment IS NOT NULL THEN
    spam_detected := public.detect_spam_content(NEW.comment);
    NEW.flagged_as_spam := spam_detected;
    
    -- Analyze sentiment
    SELECT * INTO sentiment_result FROM public.analyze_sentiment(NEW.comment);
    NEW.sentiment_score := sentiment_result.sentiment_score;
    
    -- Set moderation status
    IF spam_detected THEN
      NEW.moderation_status := 'flagged';
    ELSE
      NEW.moderation_status := 'pending';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic review processing
DROP TRIGGER IF EXISTS on_review_insert_processing ON public.reviews;
CREATE TRIGGER on_review_insert_processing
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.process_review_on_insert();

-- Insert default review templates
INSERT INTO public.review_templates (company_id, name, subject, content, category) 
SELECT 
  p.id,
  'Positive Response',
  'Thank you for your wonderful review!',
  'Thank you so much for taking the time to leave us such a positive review! We''re thrilled to hear about your great experience with our team. Your feedback means the world to us and motivates us to continue providing excellent service.',
  'positive'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'Positive Response'
);

INSERT INTO public.review_templates (company_id, name, subject, content, category) 
SELECT 
  p.id,
  'Negative Response',
  'We apologize and want to make this right',
  'Thank you for bringing this to our attention. We sincerely apologize for not meeting your expectations. Your feedback is valuable to us, and we would love the opportunity to discuss this further and make things right. Please contact us directly so we can address your concerns.',
  'negative'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'Negative Response'
);

INSERT INTO public.review_templates (company_id, name, subject, content, category) 
SELECT 
  p.id,
  'General Thank You',
  'Thank you for your feedback',
  'Thank you for taking the time to share your feedback with us. We appreciate all reviews as they help us improve our service and better serve our customers.',
  'general'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.review_templates rt 
  WHERE rt.company_id = p.id AND rt.name = 'General Thank You'
);