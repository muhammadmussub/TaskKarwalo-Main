-- First fix foreign key constraints properly
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_service_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_provider_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_booking_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_booking_id_fkey;
ALTER TABLE provider_profiles DROP CONSTRAINT IF EXISTS provider_profiles_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_customer_id_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_provider_id_fkey;
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_provider_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE bookings ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE bookings ADD CONSTRAINT bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE provider_profiles ADD CONSTRAINT provider_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES profiles(user_id) ON DELETE CASCADE;
ALTER TABLE services ADD CONSTRAINT services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

-- Create storage buckets for business documents and photos
INSERT INTO storage.buckets (id, name, public) VALUES ('business-documents', 'business-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('business-photos', 'business-photos', true);

-- Storage policies for business documents (private)
CREATE POLICY "Providers can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all business documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-documents' AND EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND user_type = 'admin'
));

-- Storage policies for business photos (public for viewing)
CREATE POLICY "Anyone can view business photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-photos');

CREATE POLICY "Providers can upload their own photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Providers can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add new columns to provider_profiles for business setup
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS cnic TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS shop_photos TEXT[];
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS business_certificate TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'draft' CHECK (application_status IN ('draft', 'submitted', 'approved', 'rejected'));
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(user_id);

-- Enable realtime for all tables
ALTER TABLE bookings REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE provider_profiles REPLICA IDENTITY FULL;
ALTER TABLE reviews REPLICA IDENTITY FULL;
ALTER TABLE services REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE services;