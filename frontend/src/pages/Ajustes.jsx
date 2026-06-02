import { useState } from 'react'
import { Palette, Eye, EyeOff, AlignJustify, History, Bell, BellOff } from 'lucide-react'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useSettings } from '../context/SettingsContext'
import { useToast } from '../context/ToastContext'

function Toggle({ enabled, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-brand-500' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

function SettingRow({ icon: Icon, title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-line last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
          <Icon size={17} className="text-brand-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">{title}</p>
          <p className="text-xs text-dim mt-0.5">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function Ajustes() {
  const { theme, setTheme } = useTheme()
  const {
    isPrivate,            togglePrivacy,
    compactView,          toggleCompact,
    historyMonths,        setHistoryMonths,
    notificationsEnabled, toggleNotifications,
  } = useSettings()
  const { toast } = useToast()
  const [loadingNotif, setLoadingNotif] = useState(false)

  const handleToggleNotifications = async () => {
    setLoadingNotif(true)
    const result = await toggleNotifications()
    setLoadingNotif(false)

    if (result.status === 'granted')     toast('Notificaciones activadas', 'success')
    else if (result.status === 'disabled') toast('Notificaciones desactivadas', 'success')
    else if (result.status === 'denied')
      toast('El navegador bloqueó los permisos. Habilitálos en la configuración del sitio.', 'warning')
    else if (result.status === 'unsupported')
      toast('Tu navegador no soporta notificaciones', 'warning')
  }

  const notifDesc = () => {
    if (typeof Notification === 'undefined') return 'No disponible en este navegador'
    if (Notification.permission === 'denied') return 'Bloqueadas — habilitá los permisos en el navegador'
    return 'Avisos cuando un servicio vence en los próximos 3 días'
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Ajustes</h1>

      {/* Tema */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Palette size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Tema</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`py-2.5 text-sm rounded-xl border transition-colors ${
                  theme === t.id
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-semibold'
                    : 'border-line bg-well text-dim hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Opciones */}
      <div className="bg-panel border border-line rounded-2xl px-5">

        {/* Modo privacidad */}
        <SettingRow
          icon={isPrivate ? EyeOff : Eye}
          title="Modo privacidad"
          description={isPrivate ? 'Montos ocultos — tocá para mostrar' : 'Oculta todos los montos de la app'}
        >
          <Toggle enabled={isPrivate} onChange={togglePrivacy} />
        </SettingRow>

        {/* Vista compacta */}
        <SettingRow
          icon={AlignJustify}
          title="Vista compacta"
          description="Reduce el espaciado de las listas"
        >
          <Toggle enabled={compactView} onChange={toggleCompact} />
        </SettingRow>

        {/* Límite de historial */}
        <SettingRow
          icon={History}
          title="Historial del gráfico"
          description="Meses visibles en el gráfico de inicio"
        >
          <div className="flex gap-1 bg-well rounded-lg p-0.5">
            {[3, 6, 12].map(n => (
              <button
                key={n}
                onClick={() => setHistoryMonths(n)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  historyMonths === n
                    ? 'bg-brand-500 text-white'
                    : 'text-dim hover:text-ink'
                }`}
              >
                {n}m
              </button>
            ))}
          </div>
        </SettingRow>

        {/* Notificaciones */}
        <SettingRow
          icon={notificationsEnabled ? Bell : BellOff}
          title="Notificaciones"
          description={notifDesc()}
        >
          <Toggle
            enabled={notificationsEnabled && Notification?.permission !== 'denied'}
            onChange={loadingNotif ? undefined : handleToggleNotifications}
          />
        </SettingRow>

      </div>
    </div>
  )
}
