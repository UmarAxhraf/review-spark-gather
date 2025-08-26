-- Create companies table first
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  -- Add other basic company details
  thank_you_message TEXT,
  incentive_enabled BOOLEAN DEFAULT false,
  incentive_type VARCHAR(20) DEFAULT 'none' CHECK (incentive_type IN ('discount', 'points', 'gift', 'none')),
  incentive_value VARCHAR(100),
  follow_up_enabled BOOLEAN DEFAULT false,
  follow_up_delay_days INTEGER DEFAULT 7,
  primary_color VARCHAR(7), -- Hex color code
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create follow-ups table for automated follow-up mechanisms
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  customer_email VARCHAR(255) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  type VARCHAR(50) DEFAULT 'satisfaction_survey' CHECK (type IN ('satisfaction_survey', 'service_feedback', 'loyalty_program')),
  response_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company customization settings
ALTER TABLE companies ADD COLUMN IF NOT EXISTS thank_you_message TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incentive_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incentive_type VARCHAR(20) DEFAULT 'none' CHECK (incentive_type IN ('discount', 'points', 'gift', 'none'));
ALTER TABLE companies ADD COLUMN IF NOT EXISTS incentive_value VARCHAR(100);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN DEFAULT false;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS follow_up_delay_days INTEGER DEFAULT 7;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7); -- Hex color code
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add additional fields to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS allow_follow_up BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS share_permission BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_email ON reviews(customer_email);

-- Create RLS policies
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's follow-ups" ON follow_ups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reviews r 
      WHERE r.id = follow_ups.review_id 
      AND r.company_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company's follow-ups" ON follow_ups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reviews r 
      WHERE r.id = follow_ups.review_id 
      AND r.company_id = auth.uid()
    )
  );