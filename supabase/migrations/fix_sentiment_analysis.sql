-- Enhanced sentiment analysis with more comprehensive word lists
CREATE OR REPLACE FUNCTION public.analyze_sentiment(content TEXT)
RETURNS TABLE(sentiment_score FLOAT, sentiment_label TEXT) AS $$
DECLARE
  positive_words TEXT[] := ARRAY[
    'excellent', 'amazing', 'great', 'wonderful', 'fantastic', 'love', 'perfect', 'outstanding', 'brilliant', 'awesome',
    'good', 'nice', 'happy', 'satisfied', 'pleased', 'impressed', 'recommend', 'helpful', 'friendly', 'professional',
    'quality', 'fast', 'efficient', 'clean', 'comfortable', 'beautiful', 'smooth', 'easy', 'convenient', 'reliable'
  ];
  negative_words TEXT[] := ARRAY[
    'terrible', 'awful', 'horrible', 'bad', 'worst', 'hate', 'disgusting', 'disappointing', 'poor', 'useless',
    'slow', 'rude', 'unprofessional', 'dirty', 'uncomfortable', 'difficult', 'broken', 'expensive', 'overpriced', 'waste',
    'annoying', 'frustrating', 'confusing', 'complicated', 'unreliable', 'unacceptable', 'inadequate', 'inferior', 'subpar', 'mediocre'
  ];
  positive_count INTEGER := 0;
  negative_count INTEGER := 0;
  total_words INTEGER;
  score FLOAT;
  label TEXT;
  word TEXT;
  content_lower TEXT;
BEGIN
  content_lower := LOWER(content);
  
  -- Count positive words (case-insensitive)
  FOREACH word IN ARRAY positive_words LOOP
    positive_count := positive_count + (LENGTH(content_lower) - LENGTH(REPLACE(content_lower, word, ''))) / LENGTH(word);
  END LOOP;
  
  -- Count negative words (case-insensitive)
  FOREACH word IN ARRAY negative_words LOOP
    negative_count := negative_count + (LENGTH(content_lower) - LENGTH(REPLACE(content_lower, word, ''))) / LENGTH(word);
  END LOOP;
  
  total_words := array_length(string_to_array(trim(content), ' '), 1);
  
  -- Calculate sentiment score with better normalization
  IF total_words > 0 THEN
    -- Normalize by total words and apply scaling for better range utilization
    score := GREATEST(-1.0, LEAST(1.0, (positive_count - negative_count)::FLOAT / GREATEST(total_words::FLOAT * 0.1, 1.0)));
  ELSE
    score := 0;
  END IF;
  
  -- Determine label with adjusted thresholds
  IF score > 0.05 THEN
    label := 'positive';
  ELSIF score < -0.05 THEN
    label := 'negative';
  ELSE
    label := 'neutral';
  END IF;
  
  RETURN QUERY SELECT score, label;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;