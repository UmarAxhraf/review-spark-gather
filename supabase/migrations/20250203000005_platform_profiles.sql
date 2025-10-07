-- Create platform_profiles table for storing simple profile links
-- This table stores profile URLs for Google My Business, Facebook, and Yelp

CREATE TABLE IF NOT EXISTS public.platform_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform_type TEXT NOT NULL CHECK (platform_type IN ('google_my_business', 'facebook', 'yelp')),
  profile_url TEXT NOT NULL,
  profile_name TEXT, -- Optional display name for the profile
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, platform_type)
);

-- Enable Row Level Security
ALTER TABLE public.platform_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for platform_profiles table
CREATE POLICY "Users can view own platform profiles" 
  ON public.platform_profiles 
  FOR SELECT 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can insert own platform profiles" 
  ON public.platform_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Users can update own platform profiles" 
  ON public.platform_profiles 
  FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Users can delete own platform profiles" 
  ON public.platform_profiles 
  FOR DELETE 
  USING (auth.uid() = company_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_platform_profiles_company_id ON public.platform_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_platform_type ON public.platform_profiles(platform_type);
CREATE INDEX IF NOT EXISTS idx_platform_profiles_active ON public.platform_profiles(is_active) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE public.platform_profiles IS 'Stores simple profile URLs for external platforms without API integration';
COMMENT ON COLUMN public.platform_profiles.platform_type IS 'Type of platform: google_my_business, facebook, or yelp';
COMMENT ON COLUMN public.platform_profiles.profile_url IS 'Direct URL to the business profile on the platform';
COMMENT ON COLUMN public.platform_profiles.profile_name IS 'Optional display name for the profile';