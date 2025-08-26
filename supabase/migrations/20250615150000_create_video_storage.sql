
-- Create video storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('review-videos', 'review-videos', true);

-- Create storage policies for review videos
CREATE POLICY "Allow public uploads to review-videos bucket" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'review-videos');

CREATE POLICY "Allow public access to review-videos bucket" ON storage.objects
FOR SELECT USING (bucket_id = 'review-videos');

CREATE POLICY "Allow users to update their company's review videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'review-videos');

CREATE POLICY "Allow users to delete their company's review videos" ON storage.objects
FOR DELETE USING (bucket_id = 'review-videos');
