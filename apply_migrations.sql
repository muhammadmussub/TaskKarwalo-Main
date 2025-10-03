-- TaskKarwalo Database Setup Instructions
-- Run these migrations in order in your Supabase SQL Editor

-- Migration 1: Full Setup with Auth Integration (Fixed)
-- This creates all tables, policies, and functions with proper auth integration
-- File: supabase/migrations/20250921000004_full_setup_with_auth.sql

-- Migration 2: Storage Buckets (Fixed)
-- This creates storage buckets for file uploads with proper policies
-- File: supabase/migrations/20250921000006_create_storage_buckets.sql

-- Migration 3: Create Admin User Only (CLEAN DATABASE)
-- This creates only the admin user in Supabase Auth - no demo data
-- Perfect for starting with a clean database for real data!
-- File: supabase/migrations/20250921000010_create_auth_users.sql

-- ALTERNATIVE APPROACHES:
-- If you want to use the simplified demo tables (no auth required):
-- Migration 4: Demo Tables Without Auth Dependencies
-- File: supabase/migrations/20250921000008_demo_tables_no_auth.sql
-- Migration 5: Demo Data for Non-Auth Tables
-- File: supabase/migrations/20250921000009_demo_data_no_auth.sql

-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard > SQL Editor
-- 2. Copy and paste each migration file content in order
-- 3. Run each migration separately
-- 4. Wait for each to complete before running the next

-- RECOMMENDED APPROACH (Full Auth System):
-- Use Migration 1 + Migration 2 + Migration 3
-- This creates real auth users and works with your existing login system!

-- AFTER RUNNING MIGRATIONS:
-- 1. Your .env file should already be configured
-- 2. Test login with the demo accounts immediately!

-- LOGIN CREDENTIALS (Created by Migration 3):
-- Admin: admin@taskkarwalo.com / password123

-- TROUBLESHOOTING:
-- If you get auth-related errors, make sure:
-- 1. All migrations ran successfully
-- 2. RLS policies are properly configured
-- 3. User IDs match between auth.users and profiles tables

-- STORAGE BUCKETS CREATED:
-- - verification-docs (private) - for KYC documents
-- - shop-photos (public) - for business photos
-- - provider-documents (private) - for provider documents
-- - profile-photos (public) - for user avatars

-- CLEAN DATABASE SETUP:
-- - 1 admin user with proper authentication
-- - All database tables, triggers, and policies
-- - No demo data - ready for real users and data
-- - Real-time statistics ready for real data

-- FIXED ISSUES:
-- ✅ Publication errors resolved (conditional table additions)
-- ✅ UUID syntax errors fixed (proper UUID values)
-- ✅ Storage policy errors resolved (conditional policy creation)
-- ✅ Auth users created directly in database with proper hashing
-- ✅ All demo data inserted with correct foreign key relationships
-- ✅ Storage buckets with proper policies
-- ✅ Real-time statistics working
-- ✅ All relationships properly established

-- WHAT MIGRATION 3 DOES:
-- ✅ Creates admin user in auth.users table with hashed password
-- ✅ Inserts admin profile
-- ✅ Handles foreign key constraints properly
-- ✅ Sets up clean database structure with no demo data
-- ✅ Ready for real users to register and use the system