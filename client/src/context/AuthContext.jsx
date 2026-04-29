import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  const loadAdminAccess = useCallback(async (nextUser = null) => {
    if (!nextUser) {
      setIsAdmin(false)
      setAdminLoading(false)
      return
    }

    setAdminLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setIsAdmin(false)
        return
      }

      const response = await fetch(`${API_URL}/api/admin/access`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        setIsAdmin(false)
        return
      }
      const data = await response.json()
      setIsAdmin(Boolean(data?.isAdmin))
    } catch {
      setIsAdmin(false)
    } finally {
      setAdminLoading(false)
    }
  }, [])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      loadAdminAccess(nextUser)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      loadAdminAccess(nextUser)
    })

    return () => subscription.unsubscribe()
  }, [loadAdminAccess])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    // If signUp did not return a session, try password sign-in
    // so users can continue immediately when email confirmation is disabled.
    if (!data?.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError
      return signInData
    }

    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const updateProfile = async ({ fullName, password }) => {
    const payload = {}
    if (typeof fullName === 'string') payload.data = { full_name: fullName.trim() }
    if (typeof password === 'string' && password.trim()) payload.password = password.trim()

    if (!Object.keys(payload).length) return null

    const { data, error } = await supabase.auth.updateUser(payload)
    if (error) throw error
    return data
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, adminLoading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
