-- Add support for additional platform types: TripAdvisor, Trustpilot, and Booking.com
-- This migration extends the existing platform_profiles table

-- Drop the existing check constraint
ALTER TABLE public.platform_profiles DROP CONSTRAINT IF EXISTS platform_profiles_platform_type_check;

-- Add the new check constraint with additional platform types
ALTER TABLE public.platform_profiles ADD CONSTRAINT platform_profiles_platform_type_check 
  CHECK (platform_type IN (
    'google_my_business', 
    'facebook', 
    'yelp', 
    'tripadvisor', 
    'trustpilot', 
    'booking_com'
  ));

-- Update the comment to reflect the new platform types
COMMENT ON COLUMN public.platform_profiles.platform_type IS 'Type of platform: google_my_business, facebook, yelp, tripadvisor, trustpilot, or booking_com';