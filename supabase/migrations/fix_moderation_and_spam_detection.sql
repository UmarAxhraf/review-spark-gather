-- COMPREHENSIVE FIX: Proper moderation system and enhanced spam detection

-- Step 1: Drop existing trigger and functions
DROP TRIGGER IF EXISTS on_review_insert_processing ON public.reviews;
DROP FUNCTION IF EXISTS public.process_review_on_insert();
DROP FUNCTION IF EXISTS public.detect_spam_content(TEXT);
DROP FUNCTION IF EXISTS public.analyze_sentiment(TEXT);

-- Step 2: Create enhanced spam detection with comprehensive keywords
CREATE OR REPLACE FUNCTION public.detect_spam_content(content TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  -- Comprehensive spam keywords including money-related and hate terms
  spam_keywords TEXT[] := ARRAY[
    -- Money/financial scams
    'free money', 'easy money', 'make money fast', 'get rich quick', 'guaranteed income',
    'work from home', 'no experience needed', 'earn $', 'cash now', 'instant cash',
    'lottery winner', 'you won', 'claim your prize', 'inheritance money', 'tax refund',
    'nigerian prince', 'wire transfer', 'bank transfer', 'urgent payment', 'processing fee',
    'advance fee', 'transaction fee', 'legal fee', 'clearance fee', 'delivery fee',
    
    -- Promotional spam
    'click here now', 'act now', 'limited time offer', 'urgent action required',
    'call immediately', 'don''t miss out', 'exclusive offer', 'special promotion',
    'congratulations you', 'you have been selected', 'winner announcement',
    
    -- Pharmaceutical/adult content
    'viagra', 'cialis', 'pharmacy online', 'prescription drugs', 'buy pills',
    'adult content', 'xxx', 'porn', 'sex chat', 'dating site',
    
    -- Hate speech and offensive terms
    'kill yourself', 'go die', 'hate you', 'stupid idiot', 'moron',
    'retard', 'loser', 'pathetic', 'worthless', 'disgusting person',
    
    -- Gambling/casino
    'casino bonus', 'gambling', 'poker online', 'bet now', 'slots',
    
    -- Generic spam indicators
    'click here', 'visit our website', 'check this out', 'amazing deal',
    'unsubscribe', 'opt out', 'remove me', 'stop emails'
  ];
  keyword TEXT;
  word_count INTEGER;
  repeated_chars_count INTEGER;
  content_lower TEXT;
  suspicious_patterns INTEGER := 0;
BEGIN
  -- Return false for empty content
  IF content IS NULL OR LENGTH(TRIM(content)) = 0 THEN
    RETURN false;
  END IF;
  
  content_lower := LOWER(TRIM(content));
  
  -- Check for spam keywords
  FOREACH keyword IN ARRAY spam_keywords LOOP
    IF content_lower LIKE '%' || keyword || '%' THEN
      RETURN true;
    END IF;
  END LOOP;
  
  -- Check for excessive repeated characters (10+ of the same character)
  SELECT COUNT(*) INTO repeated_chars_count
  FROM (
    SELECT char, COUNT(*) as char_count
    FROM regexp_split_to_table(content_lower, '') AS char
    WHERE char ~ '[a-z!@#$%^&*()0-9]'
    GROUP BY char
    HAVING COUNT(*) > 10
  ) excessive_chars;
  
  IF repeated_chars_count > 0 THEN
    RETURN true;
  END IF;
  
  -- Check for suspicious patterns
  -- Multiple exclamation marks
  IF content_lower ~ '!!!+' THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- Multiple question marks
  IF content_lower ~ '\?\?\?+' THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- All caps words (more than 3 consecutive uppercase words)
  IF content ~ '([A-Z]{3,}\s+){3,}' THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- Excessive use of dollar signs or numbers
  IF LENGTH(regexp_replace(content, '[^$0-9]', '', 'g')) > LENGTH(content) * 0.3 THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- Flag if multiple suspicious patterns detected
  IF suspicious_patterns >= 2 THEN
    RETURN true;
  END IF;
  
  -- Only flag extremely long content (1500+ words)
  word_count := array_length(string_to_array(TRIM(content), ' '), 1);
  IF word_count > 1500 THEN
    RETURN true;
  END IF;
  
  -- Check for content that's mostly numbers or special characters (85% threshold)
  IF LENGTH(regexp_replace(content_lower, '[a-z\s]', '', 'g')) > LENGTH(content_lower) * 0.85 THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate sentiment analysis function
CREATE OR REPLACE FUNCTION public.analyze_sentiment(content TEXT)
RETURNS TABLE(sentiment_score FLOAT, sentiment_label TEXT) AS $$
DECLARE
  positive_words TEXT[] := ARRAY[
    'excellent', 'amazing', 'great', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'brilliant', 'awesome',
    'good', 'nice', 'happy', 'satisfied', 'pleased', 'impressed', 'recommend', 'helpful', 'friendly', 'professional',
    'quality', 'fast', 'efficient', 'clean', 'comfortable', 'beautiful', 'smooth', 'easy', 'convenient', 'reliable',
    'superb', 'exceptional', 'marvelous', 'incredible', 'delighted', 'courteous', 'trustworthy', 'valuable',
    'polite', 'kind', 'caring', 'attentive', 'responsive', 'thorough', 'skilled', 'knowledgeable'
  ];
  negative_words TEXT[] := ARRAY[
    'terrible', 'awful', 'horrible', 'bad', 'worst', 'hate', 'disgusting', 'disappointing', 'poor', 'useless',
    'slow', 'rude', 'unprofessional', 'dirty', 'uncomfortable', 'difficult', 'broken', 'expensive', 'overpriced', 'waste',
    'annoying', 'frustrating', 'confusing', 'complicated', 'unreliable', 'unacceptable', 'inadequate', 'inferior', 'subpar', 'mediocre',
    'unsatisfied', 'unhappy', 'regret', 'avoid', 'never again', 'defective', 'faulty'
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

-- Step 4: Create proper moderation trigger function
CREATE OR REPLACE FUNCTION public.process_review_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  sentiment_result RECORD;
  spam_detected BOOLEAN := false;
BEGIN
  -- Check for spam if comment exists
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
  
  -- CRITICAL FIX: Set proper moderation status
  IF spam_detected THEN
    NEW.moderation_status := 'flagged';  -- Spam goes to flagged
  ELSE
    NEW.moderation_status := 'pending';  -- Non-spam goes to pending for manual review
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Recreate the trigger
CREATE TRIGGER on_review_insert_processing
  BEFORE INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.process_review_on_insert();

-- Step 6: Fix existing reviews that were auto-approved
-- Reset all auto-approved reviews back to pending (except those manually approved)
UPDATE public.reviews 
SET 
  flagged_as_spam = public.detect_spam_content(comment),
  moderation_status = CASE 
    WHEN public.detect_spam_content(comment) THEN 'flagged'
    WHEN moderation_status = 'approved' AND admin_response IS NULL THEN 'pending'
    ELSE moderation_status  -- Keep manually approved/rejected reviews as-is
  END
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';  -- Only update recent reviews