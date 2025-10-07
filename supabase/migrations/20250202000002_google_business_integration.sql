-- Google My Business Integration Tables
-- This migration creates all necessary tables for multi-tenant Google Business Profile integration

-- Google Business Profile connections (multi-tenant)
CREATE TABLE google_business_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  google_account_id TEXT NOT NULL,
  google_account_name TEXT,
  google_account_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/business.manage',
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, google_account_id),
  UNIQUE(company_id, google_account_id)
);

-- Google Business accounts (can have multiple accounts per connection)
CREATE TABLE google_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES google_business_connections(id) ON DELETE CASCADE,
  google_account_name TEXT NOT NULL, -- e.g., "accounts/123456789"
  account_display_name TEXT,
  account_type TEXT, -- PERSONAL, ORGANIZATION, etc.
  verification_state TEXT,
  location_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(connection_id, google_account_name)
);

-- Google Business locations
CREATE TABLE google_business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES google_business_accounts(id) ON DELETE CASCADE,
  google_location_name TEXT NOT NULL, -- e.g., "accounts/123/locations/456"
  location_display_name TEXT NOT NULL,
  store_code TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone_number TEXT,
  website_url TEXT,
  primary_category TEXT,
  additional_categories TEXT[], -- JSON array of categories
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  place_id TEXT, -- Google Places ID
  verification_state TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, google_location_name)
);

-- Google reviews (extends your existing review system)
CREATE TABLE google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES google_business_locations(id) ON DELETE CASCADE,
  google_review_name TEXT NOT NULL, -- e.g., "accounts/123/locations/456/reviews/789"
  reviewer_display_name TEXT,
  reviewer_profile_photo_url TEXT,
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5),
  comment TEXT,
  review_reply_comment TEXT,
  review_reply_update_time TIMESTAMPTZ,
  create_time TIMESTAMPTZ NOT NULL,
  update_time TIMESTAMPTZ NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  -- Processing flags
  is_processed BOOLEAN DEFAULT false,
  sentiment_score DECIMAL(3, 2), -- -1.0 to 1.0
  sentiment_label TEXT, -- POSITIVE, NEGATIVE, NEUTRAL
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, google_review_name)
);

-- Sync logs for monitoring and debugging
CREATE TABLE google_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID REFERENCES google_business_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'initial', 'incremental', 'manual', 'scheduled'
  sync_scope TEXT NOT NULL, -- 'accounts', 'locations', 'reviews', 'all'
  status TEXT NOT NULL, -- 'running', 'success', 'error', 'partial'
  accounts_synced INTEGER DEFAULT 0,
  locations_synced INTEGER DEFAULT 0,
  reviews_synced INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

-- Indexes for performance
CREATE INDEX idx_google_connections_user_id ON google_business_connections(user_id);
CREATE INDEX idx_google_connections_company_id ON google_business_connections(company_id);
CREATE INDEX idx_google_connections_active ON google_business_connections(is_active) WHERE is_active = true;

CREATE INDEX idx_google_accounts_connection_id ON google_business_accounts(connection_id);
CREATE INDEX idx_google_accounts_active ON google_business_accounts(is_active) WHERE is_active = true;

CREATE INDEX idx_google_locations_account_id ON google_business_locations(account_id);
CREATE INDEX idx_google_locations_active ON google_business_locations(is_active) WHERE is_active = true;
CREATE INDEX idx_google_locations_place_id ON google_business_locations(place_id) WHERE place_id IS NOT NULL;

CREATE INDEX idx_google_reviews_location_id ON google_reviews(location_id);
CREATE INDEX idx_google_reviews_create_time ON google_reviews(create_time DESC);
CREATE INDEX idx_google_reviews_star_rating ON google_reviews(star_rating);
CREATE INDEX idx_google_reviews_processed ON google_reviews(is_processed) WHERE is_processed = false;

CREATE INDEX idx_google_sync_logs_connection_id ON google_sync_logs(connection_id);
CREATE INDEX idx_google_sync_logs_started_at ON google_sync_logs(started_at DESC);
CREATE INDEX idx_google_sync_logs_status ON google_sync_logs(status);

-- Row Level Security (RLS) Policies
ALTER TABLE google_business_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policies for google_business_connections
CREATE POLICY "Users can view their own Google connections" ON google_business_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google connections" ON google_business_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google connections" ON google_business_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google connections" ON google_business_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for google_business_accounts
CREATE POLICY "Users can view Google accounts from their connections" ON google_business_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Google accounts for their connections" ON google_business_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Google accounts from their connections" ON google_business_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Google accounts from their connections" ON google_business_accounts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

-- Policies for google_business_locations
CREATE POLICY "Users can view Google locations from their accounts" ON google_business_locations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM google_business_accounts gba
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gba.id = account_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Google locations for their accounts" ON google_business_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_business_accounts gba
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gba.id = account_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Google locations from their accounts" ON google_business_locations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM google_business_accounts gba
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gba.id = account_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Google locations from their accounts" ON google_business_locations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM google_business_accounts gba
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gba.id = account_id AND gbc.user_id = auth.uid()
    )
  );

-- Policies for google_reviews
CREATE POLICY "Users can view Google reviews from their locations" ON google_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM google_business_locations gbl
      JOIN google_business_accounts gba ON gba.id = gbl.account_id
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gbl.id = location_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Google reviews for their locations" ON google_reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_business_locations gbl
      JOIN google_business_accounts gba ON gba.id = gbl.account_id
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gbl.id = location_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Google reviews from their locations" ON google_reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM google_business_locations gbl
      JOIN google_business_accounts gba ON gba.id = gbl.account_id
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gbl.id = location_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Google reviews from their locations" ON google_reviews
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM google_business_locations gbl
      JOIN google_business_accounts gba ON gba.id = gbl.account_id
      JOIN google_business_connections gbc ON gbc.id = gba.connection_id
      WHERE gbl.id = location_id AND gbc.user_id = auth.uid()
    )
  );

-- Policies for google_sync_logs
CREATE POLICY "Users can view sync logs for their connections" ON google_sync_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sync logs for their connections" ON google_sync_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM google_business_connections gbc 
      WHERE gbc.id = connection_id AND gbc.user_id = auth.uid()
    )
  );

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_google_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_google_business_connections_updated_at BEFORE UPDATE ON google_business_connections FOR EACH ROW EXECUTE PROCEDURE update_google_updated_at_column();
CREATE TRIGGER update_google_business_accounts_updated_at BEFORE UPDATE ON google_business_accounts FOR EACH ROW EXECUTE PROCEDURE update_google_updated_at_column();
CREATE TRIGGER update_google_business_locations_updated_at BEFORE UPDATE ON google_business_locations FOR EACH ROW EXECUTE PROCEDURE update_google_updated_at_column();
CREATE TRIGGER update_google_reviews_updated_at BEFORE UPDATE ON google_reviews FOR EACH ROW EXECUTE PROCEDURE update_google_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON google_business_connections TO authenticated;
GRANT ALL ON google_business_accounts TO authenticated;
GRANT ALL ON google_business_locations TO authenticated;
GRANT ALL ON google_reviews TO authenticated;
GRANT ALL ON google_sync_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE google_business_connections IS 'Stores OAuth connections to Google Business Profile accounts for each user/company';
COMMENT ON TABLE google_business_accounts IS 'Stores Google Business accounts accessible through each connection';
COMMENT ON TABLE google_business_locations IS 'Stores individual business locations from Google Business Profile';
COMMENT ON TABLE google_reviews IS 'Stores reviews imported from Google Business Profile locations';
COMMENT ON TABLE google_sync_logs IS 'Logs all synchronization operations for monitoring and debugging';