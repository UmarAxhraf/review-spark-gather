-- FINAL FIX: Comprehensive spam detection and sentiment analysis (CORRECTED VERSION)
-- This migration ensures proper, non-aggressive spam detection with correct dependency handling

-- Step 1: Drop the trigger first (this removes the dependency)
DROP TRIGGER IF EXISTS on_review_insert_processing ON public.reviews;

-- Step 2: Now we can safely drop the functions
DROP FUNCTION IF EXISTS public.process_review_on_insert();
DROP FUNCTION IF EXISTS public.detect_spam_content(TEXT);
DROP FUNCTION IF EXISTS public.analyze_sentiment(TEXT);

-- Step 3: Recreate spam detection function with proper logic
CREATE OR REPLACE FUNCTION public.detect_spam_content(content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  -- Only include very specific spam phrases that are unlikely to appear in legitimate reviews
  spam_keywords TEXT[] := ARRAY[
    'click here now', 'free money', 'urgent action required', 'limited time offer',
    'congratulations you won', 'claim your prize', 'act now', 'call immediately',
    'guaranteed income', 'work from home', 'make money fast', 'no experience needed',
    'viagra', 'cialis', 'pharmacy online', 'casino bonus', 'lottery winner',
    'nigerian prince', 'inheritance money', 'tax refund', 'credit repair'
  ];
  keyword TEXT;
  word_count INTEGER;
  repeated_chars_count INTEGER;
  content_lower TEXT;
BEGIN
  -- Return false for empty content (don't flag as spam)
  IF content IS NULL OR LENGTH(TRIM(content)) = 0 THEN
    RETURN false;
  END IF;
  
  content_lower := LOWER(TRIM(content));
  
  -- Only check for very specific spam phrases (not single words like 'bad')
  FOREACH keyword IN ARRAY spam_keywords LOOP
    IF content_lower LIKE '%' || keyword || '%' THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- Check for excessive repeated characters (15+ of the same character)
  SELECT COUNT(*) INTO repeated_chars_count
  FROM (
    SELECT char, COUNT(*) as char_count
    FROM regexp_split_to_table(content_lower, '') AS char
    WHERE char ~ '[a-z!@#$%^&*()]'
    GROUP BY char
    HAVING COUNT(*) > 15
  ) excessive_chars;
  
  IF repeated_chars_count > 0 THEN
    RETURN true;
  END IF;
  
  -- Only flag extremely long content (2000+ words, not 500)
  word_count := array_length(string_to_array(TRIM(content), ' '), 1);
  IF word_count > 2000 THEN
    RETURN true;
  END IF;
  
  -- Check for content that's mostly numbers or special characters (90% threshold)
  IF LENGTH(regexp_replace(content_lower, '[a-z\\s]', '', 'g')) > LENGTH(content_lower) * 0.9 THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate sentiment analysis function with proper scoring
CREATE OR REPLACE FUNCTION public.analyze_sentiment(content TEXT)
RETURNS TABLE(sentiment_score FLOAT, sentiment_label TEXT) AS $$
DECLARE
  positive_words TEXT[] := ARRAY[
    'excellent', 'amazing', 'great', 'wonderful', 'fantastic', 'outstanding', 'perfect', 'love', 'best', 'awesome',
    'brilliant', 'superb', 'exceptional', 'marvelous', 'incredible', 'satisfied', 'happy', 'pleased', 'delighted',
    'impressed', 'recommend', 'professional', 'helpful', 'friendly', 'courteous', 'efficient', 'reliable',
    'trustworthy', 'quality', 'valuable', 'good', 'nice', 'clean', 'fast', 'smooth', 'easy', 'comfortable',
    'polite', 'kind', 'caring', 'attentive', 'responsive', 'thorough', 'skilled', 'knowledgeable'
  ];
  negative_words TEXT[] := ARRAY[
    'terrible', 'awful', 'horrible', 'worst', 'hate', 'disappointing', 'poor', 'useless', 'waste',
    'rude', 'unprofessional', 'slow', 'expensive', 'overpriced', 'broken', 'defective', 'unreliable',
    'frustrating', 'annoying', 'unacceptable', 'inadequate', 'subpar', 'mediocre', 'unsatisfied', 'unhappy',
    'regret', 'avoid', 'never again', 'disgusting', 'dirty', 'uncomfortable', 'difficult', 'complicated'
  ];
  
  positive_count INTEGER := 0;
  negative_count INTEGER := 0;
  total_words INTEGER;
  sentiment_score_val FLOAT;
  sentiment_label_val TEXT;
  word TEXT;
  content_lower TEXT;
  words_array TEXT[];
BEGIN
  -- Handle empty or null content
  IF content IS NULL OR LENGTH(TRIM(content)) = 0 THEN
    RETURN QUERY SELECT 0.0::FLOAT, 'neutral'::TEXT;
    RETURN;
  END IF;
  
  content_lower := LOWER(TRIM(content));
  words_array := string_to_array(content_lower, ' ');
  total_words := array_length(words_array, 1);
  
  -- Count positive words
  FOREACH word IN ARRAY positive_words LOOP
    positive_count := positive_count + (
      SELECT COUNT(*)
      FROM unnest(words_array) AS content_word
      WHERE content_word = word
    );
  END LOOP;
  
  -- Count negative words
  FOREACH word IN ARRAY negative_words LOOP
    negative_count := negative_count + (
      SELECT COUNT(*)
      FROM unnest(words_array) AS content_word
      WHERE content_word = word
    );
  END LOOP;
  
  -- Calculate sentiment score with proper normalization
  IF total_words > 0 THEN
    sentiment_score_val := (positive_count - negative_count)::FLOAT / total_words;
    -- Cap the score between -1 and 1
    sentiment_score_val := GREATEST(-1.0, LEAST(1.0, sentiment_score_val));
  ELSE
    sentiment_score_val := 0.0;
  END IF;
  
  -- Determine sentiment label with reasonable thresholds
  IF sentiment_score_val > 0.1 THEN
    sentiment_label_val := 'positive';
  ELSIF sentiment_score_val < -0.1 THEN
    sentiment_label_val := 'negative';
  ELSE
    sentiment_label_val := 'neutral';
  END IF;
  
  RETURN QUERY SELECT sentiment_score_val, sentiment_label_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Recreate the trigger function with non-aggressive logic
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

-- Step 6: Recreate the trigger
CREATE TRIGGER on_review_insert_processing
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.process_review_on_insert();

-- Step 7: Update any existing reviews that were incorrectly flagged as spam
-- This will unflag reviews that don't match the new, stricter spam criteria
UPDATE public.reviews 
SET 
  flagged_as_spam = public.detect_spam_content(comment),
  moderation_status = CASE 
    WHEN public.detect_spam_content(comment) THEN 'flagged'
    ELSE 'approved'
  END
WHERE flagged_as_spam = true;