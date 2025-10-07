-- Create review_requests table
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('sent', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sent_date TIMESTAMP WITH TIME ZONE,
  created_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own review requests" ON review_requests
  FOR SELECT USING (auth.uid() = company_id);

CREATE POLICY "Users can insert their own review requests" ON review_requests
  FOR INSERT WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update their own review requests" ON review_requests
  FOR UPDATE USING (auth.uid() = company_id);

CREATE POLICY "Users can delete their own review requests" ON review_requests
  FOR DELETE USING (auth.uid() = company_id);

-- Create indexes for better performance
CREATE INDEX idx_review_requests_company_id ON review_requests(company_id);
CREATE INDEX idx_review_requests_email ON review_requests(email);
CREATE INDEX idx_review_requests_created_at ON review_requests(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();