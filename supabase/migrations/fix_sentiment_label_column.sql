-- Fix missing sentiment_label column and correct trigger function

-- Step 1: Add the missing sentiment_label column to reviews table
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS sentiment_label TEXT CHECK (sentiment_label IN ('positive', 'negative', 'neutral'));

-- Step 2: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_review_insert_processing ON public.reviews;
DROP FUNCTION IF EXISTS public.process_review_on_insert();

-- Step 3: Recreate the corrected trigger function
CREATE OR REPLACE FUNCTION public.process_review_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  sentiment_result RECORD;
  spam_detected BOOLEAN := false;
BEGIN
  -- Only check for spam if comment exists (no minimum length requirement)
  IF NEW.comment IS NOT NULL AND LENGTH(TRIM(NEW.comment)) > 0 THEN
    spam_detected := public.detect_spam_content(NEW.comment);
    
    -- Analyze sentiment
    SELECT * INTO sentiment_result FROM public.analyze_sentiment(NEW.comment);
    NEW.sentiment_score := sentiment_result.sentiment_score;
    NEW.sentiment_label := sentiment_result.sentiment_label;
  ELSE
    NEW.sentiment_score := 0.0;
    NEW.sentiment_label := 'neutral';
  END IF;
  
  NEW.flagged_as_spam := spam_detected;
  
  -- Set moderation status - auto-approve non-spam reviews
  IF spam_detected THEN
    NEW.moderation_status := 'flagged';
  ELSE
    NEW.moderation_status := 'approved';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate the trigger
CREATE TRIGGER on_review_insert_processing
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.process_review_on_insert();

-- Step 5: Update existing reviews to have sentiment_label values
UPDATE public.reviews 
SET sentiment_label = CASE 
  WHEN sentiment_score > 0.1 THEN 'positive'
  WHEN sentiment_score < -0.1 THEN 'negative'
  ELSE 'neutral'
END
WHERE sentiment_label IS NULL;