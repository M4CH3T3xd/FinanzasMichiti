import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ── Query keys ────────────────────────────────────────────────────────────────
export const keys = {
  profile:       (uid)          => ['profile', uid],
  transacciones: (uid, filters) => ['transacciones', uid, filters ?? {}],
  presupuestos:  (uid)          => ['presupuestos', uid],
  deudas:        (uid)          => ['deudas', uid],
  servicios:     (uid)          => ['servicios', uid],
  metas:         (uid)          => ['metas', uid],
}

// ── Profile ───────────────────────────────────────────────────────────────────
export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.profile(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateProfile() {
  const { user, refreshProfile } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.profile(user.id) })
      refreshProfile(user.id)
    },
  })
}

// ── Transacciones ─────────────────────────────────────────────────────────────
export function useTransacciones(filters = {}) {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.transacciones(user?.id, filters),
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from('transacciones')
        .select('*')
        .eq('user_id', user.id)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.tipo)      q = q.eq('tipo', filters.tipo)
      if (filters.from)      q = q.gte('fecha', filters.from)
      if (filters.to)        q = q.lte('fecha', filters.to)
      if (filters.categoria) q = q.eq('categoria', filters.categoria)
      if (filters.limit)     q = q.limit(filters.limit)

      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useAddTransaccion() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (tx) => {
      const { data, error } = await supabase
        .from('transacciones')
        .insert({ ...tx, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transacciones', user.id] }),
  })
}

export function useUpdateTransaccion() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('transacciones')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transacciones', user.id] }),
  })
}

export function useDeleteTransaccion() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('transacciones').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transacciones', user.id] }),
  })
}

// ── Presupuestos ──────────────────────────────────────────────────────────────
export function usePresupuestos() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.presupuestos(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('user_id', user.id)
      if (error) throw error
      return data
    },
  })
}

export function useUpsertPresupuesto() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (presupuesto) => {
      const { data, error } = await supabase
        .from('presupuestos')
        .upsert({ ...presupuesto, user_id: user.id }, { onConflict: 'user_id,categoria' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.presupuestos(user.id) }),
  })
}

export function useDeletePresupuesto() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('presupuestos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.presupuestos(user.id) }),
  })
}

// ── Deudas ────────────────────────────────────────────────────────────────────
export function useDeudas() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.deudas(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deudas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAddDeuda() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (deuda) => {
      const { data, error } = await supabase
        .from('deudas')
        .insert({ ...deuda, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.deudas(user.id) }),
  })
}

export function useUpdateDeuda() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('deudas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.deudas(user.id) }),
  })
}

export function useDeleteDeuda() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('deudas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.deudas(user.id) }),
  })
}

// ── Servicios ─────────────────────────────────────────────────────────────────
export function useServicios() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.servicios(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre')
      if (error) throw error
      return data
    },
  })
}

export function useAddServicio() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (servicio) => {
      const { data, error } = await supabase
        .from('servicios')
        .insert({ ...servicio, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.servicios(user.id) }),
  })
}

export function useUpdateServicio() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('servicios')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.servicios(user.id) }),
  })
}

export function useDeleteServicio() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('servicios').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.servicios(user.id) }),
  })
}

// ── Metas ─────────────────────────────────────────────────────────────────────
export function useMetas() {
  const { user } = useAuth()
  return useQuery({
    queryKey: keys.metas(user?.id),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('metas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAddMeta() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meta) => {
      const { data, error } = await supabase
        .from('metas')
        .insert({ ...meta, user_id: user.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.metas(user.id) }),
  })
}

export function useUpdateMeta() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data, error } = await supabase
        .from('metas')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.metas(user.id) }),
  })
}

export function useDeleteMeta() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('metas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.metas(user.id) }),
  })
}
