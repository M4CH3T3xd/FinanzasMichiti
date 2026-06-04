import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { queryClient } from '../lib/queryClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchRole(userId) {
    const cached = sessionStorage.getItem(`role_${userId}`)
    if (cached) setRole(cached)

    const { data } = await supabase
      .from('user_profiles')
      .select('role, nombre, apodo, avatar_url')
      .eq('id', userId)
      .single()

    const r = data?.role ?? 'usuario'
    sessionStorage.setItem(`role_${userId}`, r)
    setRole(r)
    setProfile({
      nombre:     data?.nombre     ?? null,
      apodo:      data?.apodo      ?? null,
      avatar_url: data?.avatar_url ?? null,
    })
  }

  const refreshProfile = useCallback(async (userId) => {
    const uid = userId ?? user?.id
    if (!uid) return
    sessionStorage.removeItem(`role_${uid}`)
    await fetchRole(uid)
    queryClient.invalidateQueries({ queryKey: ['profile', uid] })
  }, [user])

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      try {
        setUser(session?.user ?? null)
        if (session?.user) await fetchRole(session.user.id)
      } catch (_) {}
      finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Valida el token en background — solo cierra sesión si el token está realmente expirado,
    // no por errores de red (frecuente al reabrir una PWA sin conexión inmediata)
    supabase.auth.getUser().then(({ data: { user: u }, error }) => {
      const isAuthError = error?.status === 401 || error?.message?.includes('JWT')
      if (isAuthError) {
        setUser(null)
        setRole(null)
        sessionStorage.clear()
        supabase.auth.signOut()
      }
    }).catch(() => {}) // error de red — ignorar, la sesión de caché sigue válida

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchRole(session.user.id).catch(() => {})
      } else {
        sessionStorage.clear()
        setRole(null)
        queryClient.clear()
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    queryClient.clear()
    sessionStorage.clear()
    localStorage.removeItem('rememberMe')
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: role === 'admin', profile, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
