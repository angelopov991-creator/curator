-- Complete Profile Fix - Run this in Supabase SQL Editor
-- This will diagnose and fix all profile-related issues

-- Step 1: Check current state
SELECT 'Current auth.users count' as check_type, COUNT(*) as count FROM auth.users;
SELECT 'Current profiles count' as check_type, COUNT(*) as count FROM profiles;

-- Show any existing profiles
SELECT 'Existing profiles:' as info, id, email, role, is_active, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;

-- Step 2: Temporarily disable RLS to test if that's the issue
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Step 3: Create missing profiles for existing users
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '') as full_name,
    'user' as role,
    true as is_active
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Step 4: Re-enable RLS with simplified policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "curators_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "service_role_full_access" ON profiles;

-- Create simplified, working policies
CREATE POLICY "allow_authenticated_read_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "allow_authenticated_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_authenticated_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow service role full access
CREATE POLICY "allow_service_role_all" ON profiles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Step 5: Verify the fix
SELECT 'After fix - profiles count' as check_type, COUNT(*) as count FROM profiles;
SELECT 'Profile details:' as info, id, email, role, is_active FROM profiles ORDER BY created_at DESC LIMIT 5;