import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useBlocker } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Target, CreditCard, Repeat, ShieldCheck,
  LogOut, X, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useServiceNotifications } from '../hooks/useServiceNotifications'
import { queryClient } from '../lib/queryClient'
import SideDrawer from './SideDrawer'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true

const navItems = [
  { to: '/',              icon: LayoutDashboard, label: 'Inicio' },
  { to: '/transacciones', icon: ArrowLeftRight,  label: 'Movimientos' },
  { to: '/presupuestos',  icon: Target,          label: 'Presupuestos' },
  { to: '/deudas',        icon: CreditCard,      label: 'Deudas' },
  { to: '/servicios',     icon: Repeat,          label: 'Servicios' },
]

function SideNavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
          isActive ? 'bg-brand-500/15 text-brand-500' : 'text-dim hover:text-ink hover:bg-well'
        }`
      }
    >
      <Icon size={20} className="flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const { isAdmin, user, profile, logout } = useAuth()
  const { getCurrency, setCurrency, currencyPending } = useCurrency()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exitSheet,  setExitSheet]  = useState(false)
  const location = useLocation()

  useServiceNotifications()

  // useBlocker intercepta la navegación ANTES de que React Router la ejecute.
  // Solo bloquea cuando: PWA standalone + estamos en / + es un POP (back button)
  const blocker = useBlocker(({ currentLocation, historyAction }) =>
    isStandalone() &&
    currentLocation.pathname === '/' &&
    historyAction === 'POP'
  )

  useEffect(() => {
    if (blocker.state === 'blocked') setExitSheet(true)
  }, [blocker.state])

  const cur         = getCurrency()
  const initial     = (profile?.apodo || profile?.nombre || user?.email || '?')[0].toUpperCase()
  const displayName = profile?.apodo || profile?.nombre || user?.email?.split('@')[0]

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-canvas overflow-hidden">

      {/* Picker de moneda para usuarios nuevos de Google */}
      {currencyPending && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">💰</div>
              <h2 className="text-lg font-bold text-ink">¿Cuál es tu moneda?</h2>
              <p className="text-dim text-sm mt-1">
                Todos tus montos se mostrarán en esta moneda. Puedes cambiarla después en tu perfil.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-well hover:border-brand-500 hover:bg-brand-500/10 transition-colors text-left"
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="min-w-0">
                    <p className="text-ink text-xs font-semibold">{c.code}</p>
                    <p className="text-dim text-xs truncate">{c.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-panel border-r border-line fixed h-full z-10">
        <div className="px-4 py-5">
          <span className="font-bold text-xl text-brand-500">💰 Finanzas</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <SideNavItem key={item.to} {...item} end={item.to === '/'} />
          ))}
          {isAdmin && <SideNavItem to="/admin" icon={ShieldCheck} label="Admin" />}
        </nav>
        <div className="px-3 pb-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-well transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="perfil" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink text-xs font-medium truncate">{displayName}</p>
              <p className="text-dim text-xs">
                {cur.flag} {cur.code}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* Área principal */}
      <div className="flex flex-col flex-1 md:ml-56 h-full overflow-hidden">
        {/* Header móvil */}
        <header className="flex-shrink-0 flex md:hidden items-center justify-between px-4 py-3 bg-panel border-b border-line">
          <span className="font-bold text-lg text-brand-500">💰 Finanzas</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => queryClient.invalidateQueries()}
              className="p-2 rounded-lg text-dim hover:text-ink transition-colors"
              aria-label="Recargar datos"
            >
              <RefreshCw size={19} />
            </button>
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `p-2 rounded-lg transition-colors ${isActive ? 'text-brand-500' : 'text-dim hover:text-ink'}`
                }
              >
                <ShieldCheck size={20} />
              </NavLink>
            )}
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-9 h-9 rounded-full overflow-hidden bg-brand-500 flex items-center justify-center text-white font-bold text-base hover:ring-2 hover:ring-brand-500/50 transition-all flex-shrink-0"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="perfil" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 overflow-y-auto p-4 pb-20 w-full max-w-2xl mx-auto md:max-w-none md:pb-4">
          <Outlet />
        </main>

        {/* Bottom nav móvil */}
        <nav
          className="flex-shrink-0 flex md:hidden bg-panel border-t border-line"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                  isActive ? 'text-brand-500' : 'text-dim hover:text-ink'
                }`
              }
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <SideDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Hoja de salida — solo en PWA, solo desde la pantalla principal */}
      {exitSheet && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          {/* Fondo */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setExitSheet(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-sm bg-panel border-t border-line rounded-t-2xl p-5 pb-10 space-y-3 animate-[sheet-up_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-ink">¿Qué deseas hacer?</p>
              <button onClick={() => setExitSheet(false)} className="text-dim hover:text-ink transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Cerrar sesión */}
            <button
              onClick={async () => {
                blocker.reset?.()   // cancela la navegación, se queda en /
                setExitSheet(false)
                await logout()      // cierra sesión → PrivateRoute redirige a /login
              }}
              className="w-full flex items-center gap-3 p-4 bg-well rounded-xl border border-line hover:border-expense/40 hover:bg-expense/5 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-expense/10 flex items-center justify-center shrink-0">
                <LogOut size={17} className="text-expense" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Cerrar sesión</p>
                <p className="text-xs text-dim">Salir de tu cuenta</p>
              </div>
            </button>

            {/* Cancelar */}
            <button
              onClick={() => { blocker.reset?.(); setExitSheet(false) }}
              className="w-full py-3 rounded-xl bg-well text-dim text-sm font-medium hover:text-ink transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
