-- Add role column to profiles table with default value 'user'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Set existing users to 'user' role if role is NULL
UPDATE public.profiles 
SET role = 'user' 
WHERE role IS NULL;

-- Set the first three users as admins (app owners/developers)
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 3
);