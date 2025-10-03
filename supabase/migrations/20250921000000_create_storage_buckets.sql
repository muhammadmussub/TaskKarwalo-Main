-- Create storage buckets for provider uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('verification-docs', 'verification-docs', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('shop-photos', 'shop-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('provider-documents', 'provider-documents', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for authenticated users to upload files
CREATE POLICY "Users can upload verification documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload shop photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-photos' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can upload provider documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'provider-documents' AND
  auth.role() = 'authenticated'
);

-- Allow public read access to all buckets
CREATE POLICY "Public read access for verification docs" ON storage.objects
FOR SELECT USING (bucket_id = 'verification-docs');

CREATE POLICY "Public read access for shop photos" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-photos');

CREATE POLICY "Public read access for provider documents" ON storage.objects
FOR SELECT USING (bucket_id = 'provider-documents');

-- Allow users to update/delete their own files
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE USING (
  auth.uid()::text = (storage.foldername(name))[1]
);