-- =============================================
-- Ojo STORAGE BUCKET POLICIES
-- File: 03-storage.sql
-- Run AFTER creating buckets in Supabase Dashboard
-- =============================================

-- =============================================
-- IMPORTANT: CREATE BUCKETS FIRST!
-- =============================================
-- Before running this script:
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New Bucket"
-- 3. Create bucket named "avatars" (Public: ON)
-- 4. Create bucket named "photos" (Public: ON)
-- =============================================

-- =============================================
-- avatars BUCKET POLICIES
-- For user profile pictures
-- =============================================

-- Allow public read access to avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload avatars
CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Allow users to update their avatars
CREATE POLICY "Anyone can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

-- Allow users to delete their avatars
CREATE POLICY "Anyone can delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');

-- =============================================
-- photos BUCKET POLICIES
-- For post images
-- =============================================

-- Allow public read access to photos
CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

-- Allow authenticated users to upload photos
CREATE POLICY "Anyone can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos');

-- Allow users to update their photos
CREATE POLICY "Anyone can update photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos');

-- Allow users to delete their photos
CREATE POLICY "Anyone can delete photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos');

-- =============================================
-- STORAGE SETUP COMPLETE
-- =============================================
--
-- To verify setup:
-- 1. Go to Storage → avatars → Policies (should show 4 policies)
-- 2. Go to Storage → photos → Policies (should show 4 policies)
-- 3. Try uploading a test image
--
-- =============================================
