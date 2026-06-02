import { useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import { useServicios } from './queries'
import { daysUntilDue, isPaidThisMonth } from '../utils/serviceDates'

export function useServiceNotifications() {
  const { notificationsEnabled } = useSettings()
  const { data: servicios = [] } = useServicios()

  useEffect(() => {
    function check() {
      if (!notificationsEnabled) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

      // Solo notificar una vez por día
      const today = new Date().toDateString()
      const key   = `notified_services_${today}`
      if (localStorage.getItem(key)) return

      const proximos = servicios
        .filter(s => s.activo && !isPaidThisMonth(s.ultimo_pago))
        .map(s => ({ ...s, dias: daysUntilDue(s.dia_vencimiento) }))
        .filter(s => s.dias !== null && s.dias <= 3)

      if (proximos.length === 0) return

      const titulo = proximos.length === 1
        ? 'Servicio próximo a vencer'
        : `${proximos.length} servicios próximos a vencer`

      const cuerpo = proximos.length === 1
        ? `${proximos[0].icono || '📋'} ${proximos[0].nombre} vence ${
            proximos[0].dias === 0 ? 'hoy' : `en ${proximos[0].dias} día${proximos[0].dias > 1 ? 's' : ''}`
          }`
        : proximos.map(s => `${s.icono || '📋'} ${s.nombre}`).join('\n')

      new Notification(titulo, { body: cuerpo, icon: '/icon-192x192.png' })
      localStorage.setItem(key, '1')
    }

    check()

    // También revisar cuando el usuario vuelve a la app
    const onVisible = () => { if (document.visibilityState === 'visible') check() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [notificationsEnabled, servicios])
}
