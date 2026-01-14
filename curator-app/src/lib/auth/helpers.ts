import { createClient } from '@/lib/supabase/server'
import { Profile, UserRole } from '@/types'
import { redirect } from 'next/navigation'

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return profile as Profile
}

/**
 * Get the current user's role
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser()
  return user?.role ?? null
}

/**
 * Check if current user has a specific role or higher
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user || !user.is_active) {
    return false
  }

  // Admin can do everything
  if (user.role === 'admin') {
    return true
  }

  // Curator can do curator and user things
  if (user.role === 'curator' && (requiredRole === 'curator' || requiredRole === 'user')) {
    return true
  }

  // User can only do user things
  if (user.role === 'user' && requiredRole === 'user') {
    return true
  }

  return false
}

/**
 * Check if current user is a curator or admin
 */
export async function isCuratorOrAdmin(): Promise<boolean> {
  return hasRole('curator')
}

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'admin' && user?.is_active === true
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<Profile> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.is_active) {
    redirect('/login?error=inactive')
  }

  return user
}

/**
 * Require curator role - redirects if not curator/admin
 */
export async function requireCurator(): Promise<Profile> {
  const user = await requireAuth()

  if (user.role !== 'curator' && user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return user
}

/**
 * Require admin role - redirects if not admin
 */
export async function requireAdmin(): Promise<Profile> {
  const user = await requireAuth()

  if (user.role !== 'admin') {
    redirect('/unauthorized')
  }

  return user
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

/**
 * Update user's profile
 */
export async function updateProfile(
  userId: string,
  updates: { full_name?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Update user's role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()

  // Only admins can change roles
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Only admins can change user roles' }
  }

  // Can't change your own role
  if (currentUser.id === userId) {
    return { success: false, error: 'Cannot change your own role' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Activate/deactivate user (admin only)
 */
export async function setUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()

  // Only admins can change active status
  if (currentUser?.role !== 'admin') {
    return { success: false, error: 'Only admins can change user status' }
  }

  // Can't deactivate yourself
  if (currentUser.id === userId && !isActive) {
    return { success: false, error: 'Cannot deactivate your own account' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * Get all users (admin/curator can view)
 */
export async function getAllUsers(): Promise<Profile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data as Profile[]
}
