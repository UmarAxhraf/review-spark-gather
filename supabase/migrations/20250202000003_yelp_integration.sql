-- Create Yelp connections table
CREATE TABLE IF NOT EXISTS yelp_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, business_id)
);

-- Create Yelp reviews table
CREATE TABLE IF NOT EXISTS yelp_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL,
    yelp_review_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_image_url TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT,
    created_time TIMESTAMP WITH TIME ZONE NOT NULL,
    review_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, yelp_review_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_yelp_connections_user_id ON yelp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_user_id ON yelp_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_business_id ON yelp_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_rating ON yelp_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_yelp_reviews_created_time ON yelp_reviews(created_time);

-- Enable Row Level Security
ALTER TABLE yelp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE yelp_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for yelp_connections
CREATE POLICY "Users can view their own Yelp connections" ON yelp_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Yelp connections" ON yelp_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Yelp connections" ON yelp_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Yelp connections" ON yelp_connections
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for yelp_reviews
CREATE POLICY "Users can view their own Yelp reviews" ON yelp_reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Yelp reviews" ON yelp_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Yelp reviews" ON yelp_reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Yelp reviews" ON yelp_reviews
    FOR DELETE USING (auth.uid() = user_id);