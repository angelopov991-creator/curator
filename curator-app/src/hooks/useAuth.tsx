'use client'

import { useState, useEffect, createContext, useContext, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/types'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  isRole: (role: UserRole) => boolean
  isCurator: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('Fetching profile for user ID:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('Profile query result:', { data, error })

      if (error) {
        console.error('Error fetching profile:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Error details:', error.details)
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116' || error.message.includes('No rows found')) {
          console.log('Profile not found, attempting to create...')
          
          // Get user details from auth
          const { data: { user } } = await supabase.auth.getUser()
          console.log('Current auth user:', user)
          
          if (user && user.id === userId) {
            const profileData = {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              role: 'user' as const,
              is_active: true
            }
            
            console.log('Creating profile with data:', profileData)
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert(profileData)
              .select()
              .single()
            
            console.log('Profile creation result:', { newProfile, createError })
            
            if (createError) {
              console.error('Error creating profile:', createError)
              return null
            }
            
            return newProfile as Profile
          } else {
            console.log('No auth user found or user ID mismatch')
          }
        }
        
        return null
      }

      console.log('Profile fetched successfully:', data)
      return data as Profile
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      console.error('Error stack:', err instanceof Error ? err.stack : 'No stack trace')
      return null
    }
  }, [supabase])

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }, [user, fetchProfile])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setError('Failed to initialize authentication')
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          setProfile(profile)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  // Sign in
  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        if (!profile?.is_active) {
          await supabase.auth.signOut()
          return { success: false, error: 'Account is inactive. Please contact an administrator.' }
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign up
  const signUp = async (email: string, password: string, fullName?: string) => {
    setError(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      })

      if (error) {
        setError(error.message)
        return { success: false, error: error.message }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return { success: true, error: 'Please check your email to confirm your account.' }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed'
      setError(message)
      return { success: false, error: message }
    }
  }

  // Sign out
  const signOut = async () => {
    setError(null)
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  // Check role
  const isRole = useCallback((role: UserRole): boolean => {
    if (!profile?.is_active) return false

    if (profile.role === 'admin') return true
    if (profile.role === 'curator' && (role === 'curator' || role === 'user')) return true
    if (profile.role === 'user' && role === 'user') return true

    return false
  }, [profile])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isRole,
    isCurator: isRole('curator'),
    isAdmin: profile?.role === 'admin' && profile?.is_active === true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
