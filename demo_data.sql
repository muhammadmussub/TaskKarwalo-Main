-- Demo Data for TaskKarwalo Provider Dashboard
-- This script creates sample data to demonstrate the provider dashboard functionality

-- First, let's create demo users in auth.users (these would normally be created through Supabase Auth)
-- For demo purposes, we'll insert directly into profiles and provider_profiles

-- Demo Provider User
INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'demo.provider@example.com',
  'Ahmed Electrician',
  '+92-300-1234567',
  'provider',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '1 day'
);

-- Demo Customer User
INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'demo.customer@example.com',
  'Sarah Ahmed',
  '+92-321-9876543',
  'customer',
  'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 hours'
);

-- Demo Admin User
INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'admin@taskkarwalo.com',
  'Admin User',
  '+92-300-0000000',
  'admin',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  NOW() - INTERVAL '60 days',
  NOW()
);

-- Demo Provider Profile with Business Information (Approved Provider)
INSERT INTO public.provider_profiles (
  user_id,
  business_name,
  business_type,
  business_address,
  phone,
  cnic,
  description,
  experience_years,
  verified,
  rating,
  total_jobs,
  total_earnings,
  total_commission,
  documents_uploaded,
  admin_approved,
  application_status,
  submitted_at,
  shop_photos,
  business_certificate,
  cnic_front_image,
  cnic_back_image,
  license_certificate,
  profile_photo,
  proof_of_address,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Ahmed Electric Solutions',
  'Electrical Services',
  'Gulshan-e-Iqbal, Karachi, Pakistan',
  '+92-300-1234567',
  '42201-1234567-1',
  'Professional electrical services with 8+ years of experience. Specializing in residential and commercial electrical work, repairs, installations, and maintenance.',
  8,
  true,
  4.7,
  15,
  125000.00,
  12500.00,
  true,
  true,
  'approved',
  NOW() - INTERVAL '30 days',
  ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '1 day'
);

-- Demo Provider with Pending KYC Verification
INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  'pending.provider@example.com',
  'Hassan Plumbing Services',
  '+92-321-9876543',
  'provider',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
);

INSERT INTO public.provider_profiles (
  user_id,
  business_name,
  business_type,
  business_address,
  phone,
  cnic,
  description,
  experience_years,
  documents_uploaded,
  admin_approved,
  application_status,
  submitted_at,
  shop_photos,
  business_certificate,
  cnic_front_image,
  cnic_back_image,
  license_certificate,
  profile_photo,
  proof_of_address,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  'Hassan Plumbing Solutions',
  'Plumbing Services',
  'North Nazimabad, Karachi, Pakistan',
  '+92-321-9876543',
  '42201-9876543-2',
  'Expert plumbing services with 12+ years of experience. Specializing in residential and commercial plumbing, leak repairs, pipe installations, and bathroom renovations.',
  12,
  true,
  false,
  'submitted',
  NOW() - INTERVAL '5 days',
  ARRAY['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '1 day'
);

-- Demo Provider with Rejected KYC Verification
INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440005'::uuid,
  'rejected.provider@example.com',
  'Fatima Cleaning Services',
  '+92-333-5556666',
  'provider',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 days'
);

INSERT INTO public.provider_profiles (
  user_id,
  business_name,
  business_type,
  business_address,
  phone,
  cnic,
  description,
  experience_years,
  documents_uploaded,
  admin_approved,
  application_status,
  submitted_at,
  rejection_reason,
  shop_photos,
  business_certificate,
  cnic_front_image,
  cnic_back_image,
  license_certificate,
  profile_photo,
  proof_of_address,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440005'::uuid,
  'Fatima Home Cleaning',
  'Cleaning Services',
  'Clifton, Karachi, Pakistan',
  '+92-333-5556666',
  '42201-5556666-3',
  'Professional home and office cleaning services with 6+ years of experience. Eco-friendly cleaning solutions and thorough sanitization.',
  6,
  true,
  false,
  'rejected',
  NOW() - INTERVAL '12 days',
  'Documents are unclear and blurry. Please upload higher quality images of your CNIC and proof of address.',
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'],
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '2 days'
);

-- Demo Services (Approved by Admin)
INSERT INTO public.services (
  provider_id,
  title,
  description,
  category,
  base_price,
  price_negotiable,
  duration_hours,
  service_area,
  images,
  is_active,
  admin_approved,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Complete Home Wiring',
  'Full electrical wiring for new homes including switches, outlets, circuit breakers, and safety compliance. All work follows local electrical codes and standards.',
  'Electrical',
  25000.00,
  true,
  8,
  ARRAY['Karachi', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar'],
  ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop'],
  true,
  true,
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '5 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Electrical Repair Service',
  'Quick and reliable electrical repairs including faulty switches, outlets, circuit breakers, and minor wiring issues. Emergency repairs available.',
  'Electrical',
  1500.00,
  true,
  2,
  ARRAY['Karachi', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'North Nazimabad'],
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
  true,
  true,
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '3 days'
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Generator Installation',
  'Professional generator installation services including electrical connections, automatic transfer switches, and load calculations for residential properties.',
  'Electrical',
  8500.00,
  false,
  6,
  ARRAY['Karachi', 'Gulshan-e-Iqbal'],
  ARRAY['https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&h=300&fit=crop'],
  true,
  true,
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '1 day'
);

-- Demo Services for Pending Provider (Not yet approved)
INSERT INTO public.services (
  provider_id,
  title,
  description,
  category,
  base_price,
  price_negotiable,
  duration_hours,
  service_area,
  images,
  is_active,
  admin_approved,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  'Pipe Leak Repair',
  'Expert repair of water pipe leaks, burst pipes, and plumbing emergencies. Fast response and quality workmanship guaranteed.',
  'Plumbing',
  2500.00,
  true,
  3,
  ARRAY['Karachi', 'North Nazimabad', 'Gulshan-e-Iqbal'],
  ARRAY['https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=400&h=300&fit=crop'],
  false,
  false,
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '1 day'
),
(
  '550e8400-e29b-41d4-a716-446655440004'::uuid,
  'Bathroom Installation',
  'Complete bathroom installation and renovation services including tiles, fixtures, plumbing, and electrical work.',
  'Plumbing',
  15000.00,
  true,
  12,
  ARRAY['Karachi', 'North Nazimabad'],
  ARRAY['https://images.unsplash.com/photo-1620626011761-996317b8d101?w=400&h=300&fit=crop'],
  false,
  false,
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '1 day'
);

-- Demo Services for Rejected Provider (Not approved)
INSERT INTO public.services (
  provider_id,
  title,
  description,
  category,
  base_price,
  price_negotiable,
  duration_hours,
  service_area,
  images,
  is_active,
  admin_approved,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440005'::uuid,
  'Deep Home Cleaning',
  'Thorough deep cleaning service for homes and apartments. Includes kitchen, bathrooms, floors, and all surfaces.',
  'Cleaning',
  8000.00,
  true,
  6,
  ARRAY['Karachi', 'Clifton', 'Defence'],
  ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'],
  false,
  false,
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days'
),
(
  '550e8400-e29b-41d4-a716-446655440005'::uuid,
  'Office Cleaning',
  'Professional office cleaning services including desks, floors, windows, and common areas. Flexible scheduling available.',
  'Cleaning',
  12000.00,
  false,
  8,
  ARRAY['Karachi', 'Clifton'],
  ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop'],
  false,
  false,
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '2 days'
);

-- Demo Bookings with various statuses
INSERT INTO public.bookings (
  customer_id,
  provider_id,
  service_id,
  title,
  description,
  location,
  proposed_price,
  final_price,
  commission_amount,
  status,
  scheduled_date,
  completed_at,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (SELECT id FROM public.services WHERE title = 'Complete Home Wiring' LIMIT 1),
  'New Home Electrical Wiring',
  'Need complete electrical wiring for my new 3-bedroom apartment. Please include all safety features and proper grounding.',
  'Block 15, Gulistan-e-Johar, Karachi',
  25000.00,
  24000.00,
  2400.00,
  'completed',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '12 days',
  NOW() - INTERVAL '8 days'
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (SELECT id FROM public.services WHERE title = 'Electrical Repair Service' LIMIT 1),
  'Kitchen Outlet Not Working',
  'The electrical outlet in my kitchen has stopped working. Need someone to check the wiring and fix it.',
  'Block 10, Gulshan-e-Iqbal, Karachi',
  1500.00,
  1500.00,
  150.00,
  'completed',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '4 days'
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (SELECT id FROM public.services WHERE title = 'Generator Installation' LIMIT 1),
  'Generator Installation Request',
  'Need to install a 5kVA generator at my home. Please provide quote and installation timeline.',
  'Block 5, Clifton, Karachi',
  8500.00,
  NULL,
  NULL,
  'confirmed',
  NOW() + INTERVAL '3 days',
  NULL,
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  (SELECT id FROM public.services WHERE title = 'Electrical Repair Service' LIMIT 1),
  'Bathroom Light Fixture Installation',
  'Need to install new LED light fixtures in bathroom. Currently have old fluorescent lights that need replacement.',
  'Block 12, North Nazimabad, Karachi',
  2000.00,
  NULL,
  NULL,
  'pending',
  NOW() + INTERVAL '1 day',
  NULL,
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
);

-- Demo Commission Payments
INSERT INTO public.commission_payments (
  provider_id,
  amount,
  payment_method,
  screenshot_url,
  booking_count,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  2550.00,
  'Bank Transfer',
  'https://example.com/screenshots/payment1.jpg',
  2,
  'approved',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '14 days',
  '550e8400-e29b-41d4-a716-446655440003'::uuid
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  4200.00,
  'Easypaisa',
  'https://example.com/screenshots/payment2.jpg',
  3,
  'pending',
  NOW() - INTERVAL '3 days',
  NULL,
  NULL
);

-- Demo Reviews
INSERT INTO public.reviews (
  booking_id,
  customer_id,
  provider_id,
  rating,
  comment,
  created_at
) VALUES
(
  (SELECT id FROM public.bookings WHERE title = 'New Home Electrical Wiring' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  5,
  'Excellent work! Ahmed completed the wiring on time and everything is working perfectly. Very professional service.',
  NOW() - INTERVAL '7 days'
),
(
  (SELECT id FROM public.bookings WHERE title = 'Kitchen Outlet Not Working' LIMIT 1),
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  4,
  'Good service, fixed the issue quickly. Price was reasonable and work was clean.',
  NOW() - INTERVAL '3 days'
);

-- Demo Notifications
INSERT INTO public.notifications (
  user_id,
  type,
  title,
  content,
  booking_id,
  read_at,
  created_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'booking_request',
  'New Booking Request',
  'Sarah Ahmed has requested your Electrical Repair Service for bathroom light fixture installation.',
  (SELECT id FROM public.bookings WHERE title = 'Bathroom Light Fixture Installation' LIMIT 1),
  NULL,
  NOW() - INTERVAL '6 hours'
),
(
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'payment',
  'Commission Payment Approved',
  'Your commission payment of PKR 2,550 has been approved and processed.',
  NULL,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '14 days'
),
(
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'booking_update',
  'Booking Confirmed',
  'Your booking for Generator Installation has been confirmed by Ahmed Electric Solutions.',
  (SELECT id FROM public.bookings WHERE title = 'Generator Installation Request' LIMIT 1),
  NULL,
  NOW() - INTERVAL '1 day'
);

-- Update provider profile with commission reminder (since they have completed jobs)
UPDATE public.provider_profiles
SET
  completed_jobs_since_commission = 2,
  commission_reminder_active = true
WHERE user_id = '550e8400-e29b-41d4-a716-446655440001'::uuid;

-- Refresh realtime stats to include our demo data
SELECT refresh_realtime_stats();