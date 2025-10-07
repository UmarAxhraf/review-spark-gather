-- Facebook Integration Tables
-- This migration creates all necessary tables for multi-tenant Facebook Pages integration

-- Facebook connections (multi-tenant)
CREATE TABLE facebook_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  facebook_user_id TEXT NOT NULL,
  facebook_user_name TEXT,
  access_token TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  -- Update the default permissions array
  permissions TEXT[] NOT NULL DEFAULT '{pages_read_engagement,pages_manage_posts}',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, page_id),
  UNIQUE(company_id, page_id)
);

-- Facebook reviews/ratings
CREATE TABLE facebook_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES facebook_connections(id) ON DELETE CASCADE,
  facebook_review_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  recommendation_type TEXT CHECK (recommendation_type IN ('positive', 'negative', 'no_recommendation')),
  created_time TIMESTAMPTZ NOT NULL,
  -- Processing flags
  is_processed BOOLEAN DEFAULT false,
  sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
  sentiment_label TEXT, -- POSITIVE, NEGATIVE, NEUTRAL
  -- Raw data for future processing
  raw_data JSONB,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facebook_review_id)
);

-- Sync logs for monitoring and debugging
CREATE TABLE facebook_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES facebook_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'initial', 'incremental', 'manual', 'scheduled'
  status TEXT NOT NULL, -- 'running', 'success', 'error', 'partial'
  reviews_synced INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Indexes for performance
CREATE INDEX idx_facebook_connections_user_id ON facebook_connections(user_id);
CREATE INDEX idx_facebook_connections_company_id ON facebook_connections(company_id);
CREATE INDEX idx_facebook_connections_active ON facebook_connections(is_active) WHERE is_active = true;
CREATE INDEX idx_facebook_connections_page_id ON facebook_connections(page_id);

CREATE INDEX idx_facebook_reviews_connection_id ON facebook_reviews(connection_id);
CREATE INDEX idx_facebook_reviews_created_time ON facebook_reviews(created_time DESC);
CREATE INDEX idx_facebook_reviews_rating ON facebook_reviews(rating);
CREATE INDEX idx_facebook_reviews_processed ON facebook_reviews(is_processed) WHERE is_processed = false;
CREATE INDEX idx_facebook_reviews_page_id ON facebook_reviews(page_id);

CREATE INDEX idx_facebook_sync_logs_connection_id ON facebook_sync_logs(connection_id);
CREATE INDEX idx_facebook_sync_logs_started_at ON facebook_sync_logs(started_at DESC);
CREATE INDEX idx_facebook_sync_logs_status ON facebook_sync_logs(status);

-- Row Level Security (RLS) Policies
ALTER TABLE facebook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for facebook_connections
CREATE POLICY "Users can view their own Facebook connections" ON facebook_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Facebook connections" ON facebook_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Facebook connections" ON facebook_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Facebook connections" ON facebook_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for facebook_reviews
CREATE POLICY "Users can view Facebook reviews from their connections" ON facebook_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Facebook reviews for their connections" ON facebook_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Facebook reviews from their connections" ON facebook_reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Facebook reviews from their connections" ON facebook_reviews
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

-- Policies for facebook_sync_logs
CREATE POLICY "Users can view sync logs for their connections" ON facebook_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync logs for their connections" ON facebook_sync_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM facebook_connections fc 
      WHERE fc.id = connection_id AND fc.user_id = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_facebook_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_facebook_connections_updated_at BEFORE UPDATE ON facebook_connections FOR EACH ROW EXECUTE PROCEDURE update_facebook_updated_at_column();
CREATE TRIGGER update_facebook_reviews_updated_at BEFORE UPDATE ON facebook_reviews FOR EACH ROW EXECUTE PROCEDURE update_facebook_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON facebook_connections TO authenticated;
GRANT ALL ON facebook_reviews TO authenticated;
GRANT ALL ON facebook_sync_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE facebook_connections IS 'Stores OAuth connections to Facebook Pages for each user/company';
COMMENT ON TABLE facebook_reviews IS 'Stores reviews/ratings imported from Facebook Pages';
COMMENT ON TABLE facebook_sync_logs IS 'Logs all synchronization operations for monitoring and debugging';