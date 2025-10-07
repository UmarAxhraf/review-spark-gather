-- Improve Yelp Integration: Add new fields for better business matching
-- This migration adds fields needed for the improved Yelp integration workflow

ALTER TABLE yelp_connections 
ADD COLUMN IF NOT EXISTS yelp_profile_url TEXT,
ADD COLUMN IF NOT EXISTS yelp_business_location TEXT,
ADD COLUMN IF NOT EXISTS yelp_business_id TEXT;

-- Update the unique constraint to use yelp_business_id instead of business_id
-- First drop the old constraint
ALTER TABLE yelp_connections DROP CONSTRAINT IF EXISTS yelp_connections_user_id_business_id_key;

-- Add new constraint using yelp_business_id
ALTER TABLE yelp_connections ADD CONSTRAINT yelp_connections_user_id_yelp_business_id_key 
UNIQUE(user_id, yelp_business_id);

-- Add index for better performance on new fields
CREATE INDEX IF NOT EXISTS idx_yelp_connections_yelp_business_id ON yelp_connections(yelp_business_id);
CREATE INDEX IF NOT EXISTS idx_yelp_connections_profile_url ON yelp_connections(yelp_profile_url);

-- Add comments for documentation
COMMENT ON COLUMN yelp_connections.yelp_profile_url IS 'Original Yelp profile URL provided by user';
COMMENT ON COLUMN yelp_connections.yelp_business_location IS 'Business location (city or zip) for search matching';
COMMENT ON COLUMN yelp_connections.yelp_business_id IS 'Verified Yelp business ID from search API results';