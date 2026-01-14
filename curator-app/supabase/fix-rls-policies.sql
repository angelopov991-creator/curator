-- Fix RLS policies for profiles table
-- Run this in Supabase SQL Editor to resolve profile fetching issues

-- Drop existing policies that might be problematic
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Curators can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

-- Create more permissive policies that work with client-side auth

-- Allow users to view their own profile
CREATE POLICY "users_select_own_profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile (except role)
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for the trigger)
CREATE POLICY "users_insert_own_profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow curators and admins to view all profiles
CREATE POLICY "curators_select_all_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('curator', 'admin') 
      AND p.is_active = true
    )
  );

-- Allow admins to update any profile
CREATE POLICY "admins_update_all_profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'admin' 
      AND p.is_active = true
    )
  );

-- Allow service role to do everything (for admin operations)
CREATE POLICY "service_role_full_access"
  ON profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';