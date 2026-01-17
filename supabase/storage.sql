-- =============================================
-- STORAGE BUCKET SETUP
-- Run in SQL Editor after creating buckets manually
-- =============================================

-- Note: Buckets must be created via Dashboard first:
-- 1. Go to Storage -> New Bucket
-- 2. Create "avatars" (Public)
-- 3. Create "photos" (Public)

-- Storage policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars');

-- Storage policies for photos bucket
CREATE POLICY "Post images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Anyone can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can update photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'photos');

CREATE POLICY "Anyone can delete photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'photos');
