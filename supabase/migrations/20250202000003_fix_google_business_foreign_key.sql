-- Fix foreign key constraint for google_business_connections to reference profiles instead of companies

-- Drop the existing foreign key constraint
ALTER TABLE google_business_connections 
DROP CONSTRAINT IF EXISTS google_business_connections_company_id_fkey;

-- Add the correct foreign key constraint referencing profiles
ALTER TABLE google_business_connections 
ADD CONSTRAINT google_business_connections_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also fix facebook_connections table which has the same issue
ALTER TABLE facebook_connections 
DROP CONSTRAINT IF EXISTS facebook_connections_company_id_fkey;

ALTER TABLE facebook_connections 
ADD CONSTRAINT facebook_connections_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES profiles(id) ON DELETE CASCADE;