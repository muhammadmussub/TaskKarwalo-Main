-- Demo Data for Tables Without Auth Dependencies
-- This inserts demo data into the simplified tables

-- Insert demo profiles
INSERT INTO public.demo_profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES
  ('demo-provider-001', 'demo.provider@example.com', 'Ahmed Electrician', '+92-300-1234567', 'provider', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day'),
  ('demo-customer-001', 'demo.customer@example.com', 'Sarah Ahmed', '+92-321-9876543', 'customer', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 hours'),
  ('demo-admin-001', 'admin@taskkarwalo.com', 'Admin User', '+92-300-0000000', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', NOW() - INTERVAL '60 days', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo provider profiles with full KYC data
INSERT INTO public.demo_provider_profiles (
  user_id, business_name, business_type, business_address, phone, cnic, description, experience_years,
  verified, rating, total_jobs, total_earnings, total_commission, documents_uploaded, admin_approved,
  application_status, submitted_at, rejection_reason, shop_photos, business_certificate,
  cnic_front_image, cnic_back_image, license_certificate, profile_photo, proof_of_address,
  latitude, longitude, created_at, updated_at
) VALUES
  -- Approved Provider
  ('demo-provider-001', 'Ahmed Electric Solutions', 'Electrical Services',
   'Gulshan-e-Iqbal, Karachi, Pakistan', '+92-300-1234567', '42201-1234567-1',
   'Professional electrical services with 8+ years of experience. Specializing in residential and commercial electrical work, repairs, installations, and maintenance.',
   8, true, 4.7, 15, 125000.00, 12500.00, true, true, 'approved', NOW() - INTERVAL '30 days', null,
   ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop'],
   'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
   'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
   'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
   'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
   'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=400&h=300&fit=crop',
   24.8717, 67.0822, NOW() - INTERVAL '30 days', NOW() - INTERVAL '1 day')
ON CONFLICT (user_id) DO NOTHING;

-- Insert demo services
INSERT INTO public.demo_services (
  provider_id, title, description, category, base_price, price_negotiable, duration_hours,
  service_area, images, is_active, admin_approved, created_at, updated_at
) VALUES
  ('demo-provider-001', 'Complete Home Wiring', 'Full electrical wiring for new homes including switches, outlets, circuit breakers, and safety compliance. All work follows local electrical codes and standards.', 'Electrical', 25000.00, true, 8, ARRAY['Karachi', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar'], ARRAY['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop'], true, true, NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),

  ('demo-provider-001', 'Electrical Repair Service', 'Quick and reliable electrical repairs including faulty switches, outlets, circuit breakers, and minor wiring issues. Emergency repairs available.', 'Electrical', 1500.00, true, 2, ARRAY['Karachi', 'Gulshan-e-Iqbal', 'Gulistan-e-Johar', 'North Nazimabad'], ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop'], true, true, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days'),

  ('demo-provider-001', 'Generator Installation', 'Professional generator installation services including electrical connections, automatic transfer switches, and load calculations for residential properties.', 'Electrical', 8500.00, false, 6, ARRAY['Karachi', 'Gulshan-e-Iqbal'], ARRAY['https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=400&h=300&fit=crop'], true, true, NOW() - INTERVAL '15 days', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert demo bookings
INSERT INTO public.demo_bookings (
  customer_id, provider_id, service_id, title, description, location, proposed_price, final_price,
  commission_amount, status, scheduled_date, completed_at, created_at, updated_at
) VALUES
  ('demo-customer-001', 'demo-provider-001',
   (SELECT id FROM public.demo_services WHERE title = 'Complete Home Wiring' LIMIT 1),
   'New Home Electrical Wiring', 'Need complete electrical wiring for my new 3-bedroom apartment. Please include all safety features and proper grounding.',
   'Block 15, Gulistan-e-Johar, Karachi', 25000.00, 24000.00, 2400.00, 'completed',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'),

  ('demo-customer-001', 'demo-provider-001',
   (SELECT id FROM public.demo_services WHERE title = 'Electrical Repair Service' LIMIT 1),
   'Kitchen Outlet Not Working', 'The electrical outlet in my kitchen has stopped working. Need someone to check the wiring and fix it.',
   'Block 10, Gulshan-e-Iqbal, Karachi', 1500.00, 1500.00, 150.00, 'completed',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days'),

  ('demo-customer-001', 'demo-provider-001',
   (SELECT id FROM public.demo_services WHERE title = 'Generator Installation' LIMIT 1),
   'Generator Installation Request', 'Need to install a 5kVA generator at my home. Please provide quote and installation timeline.',
   'Block 5, Clifton, Karachi', 8500.00, NULL, NULL, 'accepted',
   NOW() + INTERVAL '3 days', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert demo reviews
INSERT INTO public.demo_reviews (booking_id, customer_id, provider_id, rating, comment, created_at)
VALUES
  ((SELECT id FROM public.demo_bookings WHERE title = 'New Home Electrical Wiring' LIMIT 1),
   'demo-customer-001', 'demo-provider-001', 5,
   'Excellent work! Ahmed completed the wiring on time and everything is working perfectly. Very professional service.',
   NOW() - INTERVAL '7 days'),

  ((SELECT id FROM public.demo_bookings WHERE title = 'Kitchen Outlet Not Working' LIMIT 1),
   'demo-customer-001', 'demo-provider-001', 4,
   'Good service, fixed the issue quickly. Price was reasonable and work was clean.',
   NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- Insert demo notifications
INSERT INTO public.demo_notifications (user_id, type, title, content, booking_id, read_at, created_at)
VALUES
  ('demo-provider-001', 'booking_request', 'New Booking Request',
   'Sarah Ahmed has requested your Electrical Repair Service for bathroom light fixture installation.',
   (SELECT id FROM public.demo_bookings WHERE title = 'Generator Installation Request' LIMIT 1), NULL, NOW() - INTERVAL '6 hours'),

  ('demo-provider-001', 'payment', 'Commission Payment Approved',
   'Your commission payment of PKR 2,550 has been approved and processed.', NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '14 days'),

  ('demo-customer-001', 'booking_update', 'Booking Confirmed',
   'Your booking for Generator Installation has been confirmed by Ahmed Electric Solutions.',
   (SELECT id FROM public.demo_bookings WHERE title = 'Generator Installation Request' LIMIT 1), NULL, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert demo commission payments
INSERT INTO public.demo_commission_payments (
  provider_id, amount, payment_method, screenshot_url, booking_count, status, submitted_at, reviewed_at, reviewed_by
) VALUES
  ('demo-provider-001', 2550.00, 'Bank Transfer',
   'https://example.com/screenshots/payment1.jpg', 2, 'approved', NOW() - INTERVAL '15 days',
   NOW() - INTERVAL '14 days', 'demo-admin-001'),

  ('demo-provider-001', 4200.00, 'Easypaisa',
   'https://example.com/screenshots/payment2.jpg', 3, 'pending', NOW() - INTERVAL '3 days', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Insert demo chat messages
INSERT INTO public.demo_chat_messages (booking_id, sender_id, message_type, content, created_at)
VALUES
  ((SELECT id FROM public.demo_bookings WHERE title = 'Generator Installation Request' LIMIT 1),
   'demo-customer-001', 'text',
   'Hi Ahmed, I need the generator installation done this weekend. Is that possible?',
   NOW() - INTERVAL '5 hours'),

  ((SELECT id FROM public.demo_bookings WHERE title = 'Generator Installation Request' LIMIT 1),
   'demo-provider-001', 'text',
   'Hello Sarah! Yes, I can do it on Saturday morning around 10 AM. I''ll bring all the necessary equipment.',
   NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

-- Insert initial realtime stats
INSERT INTO public.realtime_stats (stat_type, stat_name, stat_value, time_period)
VALUES
  ('users', 'total_users', (SELECT COUNT(*) FROM public.demo_profiles), 'current'),
  ('providers', 'total_providers', (SELECT COUNT(*) FROM public.demo_provider_profiles), 'current'),
  ('bookings', 'total_bookings', (SELECT COUNT(*) FROM public.demo_bookings), 'current'),
  ('revenue', 'total_revenue', (SELECT COALESCE(SUM(final_price), 0) FROM public.demo_bookings WHERE status = 'completed'), 'current')
ON CONFLICT (stat_type, stat_name, time_period)
DO UPDATE SET
  stat_value = EXCLUDED.stat_value,
  updated_at = now();