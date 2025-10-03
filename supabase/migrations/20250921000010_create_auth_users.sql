-- Create Auth Users for TaskKarwalo Demo
-- This creates the demo users in Supabase Auth system

-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert admin user into auth.users table
-- Note: In production, passwords should be hashed client-side before sending to Supabase
-- For demo purposes, we'll use Supabase's built-in password hashing

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '550e8400-e29b-41d4-a716-446655440003',
    'authenticated',
    'authenticated',
    'admin@taskkarwalo.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Admin User", "user_type": "admin"}',
    FALSE,
    NOW() - INTERVAL '60 days',
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL
  );

-- Now update the profiles table to remove the foreign key constraint temporarily
-- and insert the admin profile that references the auth user
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

INSERT INTO public.profiles (user_id, email, full_name, phone, user_type, avatar_url, created_at, updated_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440003', 'admin@taskkarwalo.com', 'Admin User', '+92-300-0000000', 'admin', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', NOW() - INTERVAL '60 days', NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Re-enable the foreign key constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: No demo provider profiles will be inserted - clean database for real data
-- Provider profiles will be created when real providers register

-- Note: No demo services will be inserted - clean database for real data
-- Services will be created when real providers register

-- Note: No demo bookings will be inserted - clean database for real data
-- Bookings will be created when real customers book real services

-- Note: No demo data will be inserted - clean database for real data
-- All demo reviews, notifications, commission payments, and chat messages have been removed
-- Real data will be generated as users interact with the system
