import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, ShieldCheck, User, Shield, X } from 'lucide-react'
import { useAllProfiles, useUpdateUserRole } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CURRENCIES } from '../context/CurrencyContext'

export default function Admin() {
  const { user: me } = useAuth()
  const { toast }    = useToast()
  const [search,      setSearch]      = useState('')
  const [confirmRole, setConfirmRole] = useState(null) // { profile, newRole }

  const { data: profiles = [], isLoading } = useAllProfiles()
  const roleMut = useUpdateUserRole()

  // Stats
  const totalUsuarios = profiles.filter(p => p.role === 'usuario').length
  const totalAdmins   = profiles.filter(p => p.role === 'admin').length
  const monedaTop = useMemo(() => {
    const counts = {}
    profiles.forEach(p => { counts[p.currency] = (counts[p.currency] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [profiles])

  // Búsqueda
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(p =>
      p.email?.toLowerCase().includes(q) ||
      p.nombre?.toLowerCase().includes(q) ||
      p.apodo?.toLowerCase().includes(q)
    )
  }, [profiles, search])

  const handleConfirmRole = async () => {
    if (!confirmRole) return
    try {
      await roleMut.mutateAsync({ id: confirmRole.profile.id, role: confirmRole.newRole })
      toast(`Rol actualizado a ${confirmRole.newRole}`, 'success')
    } catch {
      toast('Error al cambiar el rol', 'error')
    }
    setConfirmRole(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Panel Admin</h1>
          <p className="text-xs text-dim">Gestión de usuarios</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Total</p>
          <p className="text-2xl font-bold text-ink">{profiles.length}</p>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Usuarios</p>
          <p className="text-2xl font-bold text-ink">{totalUsuarios}</p>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Admins</p>
          <p className="text-2xl font-bold text-brand-500">{totalAdmins}</p>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Monedas top</p>
          <p className="text-base font-bold text-ink">
            {monedaTop.map(([cur]) => CURRENCIES.find(x => x.code === cur)?.flag ?? cur).join(' ')}
          </p>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, apodo o email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-panel border border-line rounded-xl pl-9 pr-9 py-2.5 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista */}
      {isLoading && <p className="text-dim text-sm text-center py-16">Cargando...</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-dim text-sm text-center py-12">
          {search ? 'Sin resultados' : 'Sin usuarios registrados'}
        </p>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(p => {
            const isMe     = p.id === me?.id
            const isAdminP = p.role === 'admin'
            const initial  = (p.apodo || p.nombre || p.email || '?')[0].toUpperCase()
            const currency = CURRENCIES.find(c => c.code === p.currency)
            const fechaReg = p.created_at
              ? format(new Date(p.created_at), "d MMM yyyy", { locale: es })
              : '—'

            return (
              <div key={p.id}
                className="bg-panel border border-line rounded-xl p-4 flex items-center gap-3">

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold shrink-0">
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : initial
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink truncate">
                      {p.nombre || p.apodo || p.email?.split('@')[0] || 'Sin nombre'}
                      {isMe && <span className="text-[10px] text-brand-500 ml-1">(vos)</span>}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                      isAdminP
                        ? 'bg-brand-500/20 text-brand-500'
                        : 'bg-well text-dim border border-line'
                    }`}>
                      {isAdminP ? '⚡ Admin' : 'Usuario'}
                    </span>
                  </div>
                  <p className="text-xs text-dim truncate">{p.email}</p>
                  <p className="text-[10px] text-dim mt-0.5">
                    {currency ? `${currency.flag} ${currency.code}` : p.currency} · {fechaReg}
                  </p>
                </div>

                {/* Acción */}
                {!isMe && (
                  <button
                    onClick={() => setConfirmRole({
                      profile: p,
                      newRole: isAdminP ? 'usuario' : 'admin',
                    })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors shrink-0 ${
                      isAdminP
                        ? 'border-expense/40 text-expense hover:bg-expense/10'
                        : 'border-brand-500/40 text-brand-500 hover:bg-brand-500/10'
                    }`}
                  >
                    {isAdminP ? <User size={12} /> : <Shield size={12} />}
                    {isAdminP ? 'Degradar' : 'Promover'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal confirmación */}
      {confirmRole && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                confirmRole.newRole === 'admin' ? 'bg-brand-500/15' : 'bg-expense/15'
              }`}>
                {confirmRole.newRole === 'admin'
                  ? <Shield size={20} className="text-brand-500" />
                  : <User size={20} className="text-expense" />
                }
              </div>
              <div>
                <h3 className="text-ink font-semibold">
                  {confirmRole.newRole === 'admin' ? 'Promover a Admin' : 'Degradar a Usuario'}
                </h3>
                <p className="text-dim text-xs mt-0.5">
                  {confirmRole.profile.nombre || confirmRole.profile.email}
                </p>
              </div>
            </div>

            <p className="text-sm text-dim mb-5">
              {confirmRole.newRole === 'admin'
                ? 'Este usuario tendrá acceso al panel admin y podrá ver todos los perfiles.'
                : 'El usuario perderá acceso al panel de administración.'
              }
            </p>

            <div className="flex gap-3">
              <button onClick={() => setConfirmRole(null)}
                className="flex-1 py-2.5 rounded-xl bg-well text-dim text-sm hover:text-ink transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleConfirmRole}
                disabled={roleMut.isPending}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${
                  confirmRole.newRole === 'admin'
                    ? 'bg-brand-500 hover:bg-brand-600'
                    : 'bg-expense hover:opacity-90'
                }`}
              >
                {roleMut.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
