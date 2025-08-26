
-- Create the video-reviews storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-reviews', 'video-reviews', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for video-reviews bucket
CREATE POLICY "Allow public uploads to video-reviews bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'video-reviews');

CREATE POLICY "Allow public access to video-reviews bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'video-reviews');

CREATE POLICY "Allow users to update their video-reviews" ON storage.objects
FOR UPDATE USING (bucket_id = 'video-reviews');

CREATE POLICY "Allow users to delete their video-reviews" ON storage.objects
FOR DELETE USING (bucket_id = 'video-reviews');
