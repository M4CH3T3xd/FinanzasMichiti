import { useState, useRef, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, Palette, ArrowLeftRight, Download, LogOut, Camera, Save, RefreshCw } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useProfile, useUpdateProfile } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export default function Perfil() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Perfil</h1>
      <SeccionPerfil />
      <SeccionConversor />
      <SeccionExportar />
    </div>
  )
}

// ── Sección 1: Perfil y ajustes ───────────────────────────────────────────────
function SeccionPerfil() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()
  const { data: profile } = useProfile()
  const updateMut = useUpdateProfile()

  const [nombre, setNombre] = useState('')
  const [apodo,  setApodo]  = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre     || '')
      setApodo(profile.apodo       || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile?.id])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
      // Bust cache con timestamp
      const urlFinal = `${publicUrl}?t=${Date.now()}`
      await updateMut.mutateAsync({ avatar_url: urlFinal })
      setAvatarUrl(urlFinal)
      toast('Avatar actualizado', 'success')
    } catch {
      toast('Error al subir la imagen', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ nombre: nombre.trim(), apodo: apodo.trim() })
      toast('Perfil guardado', 'success')
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
        <User size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-ink">Perfil y ajustes</h2>
      </div>

      <div className="p-5 space-y-6">

        {/* Avatar + email */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                : <User size={28} className="text-brand-500" />
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={11} className="text-white animate-spin" /> : <Camera size={11} className="text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink truncate">{profile?.nombre || 'Sin nombre'}</p>
            <p className="text-xs text-dim truncate">{user?.email}</p>
          </div>
        </div>

        {/* Nombre y apodo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-dim mb-1.5 block">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-well border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-dim mb-1.5 block">Apodo</label>
            <input
              type="text"
              value={apodo}
              onChange={e => setApodo(e.target.value)}
              placeholder="Cómo te llaman"
              className="w-full bg-well border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateMut.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {/* Tema */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} className="text-dim" />
            <span className="text-xs font-medium text-dim uppercase tracking-wide">Tema</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`py-2 text-sm rounded-xl border transition-colors ${
                  theme === t.id
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-medium'
                    : 'border-line bg-well text-dim hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Moneda */}
        <div>
          <span className="text-xs font-medium text-dim uppercase tracking-wide block mb-3">Moneda principal</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                  currency === c.code
                    ? 'border-brand-500 bg-brand-500/10 text-ink font-medium'
                    : 'border-line bg-well text-dim hover:text-ink'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="pt-2 border-t border-line">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-dim hover:text-expense transition-colors"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Sección 2: Conversor de divisas ───────────────────────────────────────────
function SeccionConversor() {
  const { rates } = useCurrency()
  const [monto,    setMonto]    = useState('')
  const [fromCur,  setFromCur]  = useState('USD')
  const [toCur,    setToCur]    = useState('ARS')

  const resultado = (() => {
    if (!rates || !monto || isNaN(+monto)) return null
    const rateFrom = rates[fromCur] ?? 1
    const rateTo   = rates[toCur]   ?? 1
    return (+monto / rateFrom) * rateTo
  })()

  const tasa = (() => {
    if (!rates) return null
    return (rates[toCur] ?? 1) / (rates[fromCur] ?? 1)
  })()

  const swap = () => { setFromCur(toCur); setToCur(fromCur) }

  const fmtResult = (n) => {
    if (n == null) return '—'
    const cur = CURRENCIES.find(c => c.code === toCur)
    const decimals = ['CLP', 'ARS', 'BRL', 'UYU'].includes(toCur) ? 0 : 2
    return `${cur?.symbol ?? ''}${n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
        <ArrowLeftRight size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-ink">Conversor de divisas</h2>
        {rates && <span className="ml-auto text-xs text-dim">Tasas en tiempo real</span>}
      </div>

      <div className="p-5 space-y-4">

        {/* Moneda origen */}
        <div>
          <label className="text-xs text-dim mb-1.5 block">Monto a convertir</label>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className="flex-1 bg-well border border-line rounded-xl px-4 py-3 text-ink text-xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
            <select
              value={fromCur}
              onChange={e => setFromCur(e.target.value)}
              className="bg-well border border-line rounded-xl px-3 py-3 text-sm text-ink focus:outline-none focus:border-brand-500"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-line" />
          <button
            onClick={swap}
            className="p-2 rounded-full bg-well border border-line text-dim hover:text-brand-500 hover:border-brand-500/40 transition-colors"
          >
            <ArrowLeftRight size={14} />
          </button>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Moneda destino + resultado */}
        <div>
          <label className="text-xs text-dim mb-1.5 block">Resultado</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-well border border-line rounded-xl px-4 py-3">
              <p className="text-xl font-bold text-income">{fmtResult(resultado)}</p>
            </div>
            <select
              value={toCur}
              onChange={e => setToCur(e.target.value)}
              className="bg-well border border-line rounded-xl px-3 py-3 text-sm text-ink focus:outline-none focus:border-brand-500"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tasa de cambio */}
        {tasa != null && (
          <p className="text-xs text-dim text-center">
            1 {fromCur} = {tasa.toLocaleString('es-AR', { maximumFractionDigits: 4 })} {toCur}
          </p>
        )}

      </div>
    </div>
  )
}

// ── Sección 3: Exportar resumen PDF ───────────────────────────────────────────
function SeccionExportar() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { data: profile } = useProfile()
  const { toast } = useToast()
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)

  const mesOpciones = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()) }
  })

  const handleExport = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [year, month] = mes.split('-')
      const from = format(startOfMonth(new Date(+year, +month - 1)), 'yyyy-MM-dd')
      const to   = format(endOfMonth(new Date(+year, +month - 1)),   'yyyy-MM-dd')

      const { data: txs, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha', { ascending: true })
      if (error) throw error

      const ingresos = txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0)
      const gastos   = txs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + +t.monto, 0)
      const balance  = ingresos - gastos

      const doc = new jsPDF()
      const mesLabel = mesOpciones.find(o => o.value === mes)?.label ?? mes
      const nombre   = profile?.nombre || profile?.apodo || user.email

      // Encabezado
      doc.setFontSize(20)
      doc.setTextColor(40, 40, 60)
      doc.text('Resumen financiero', 14, 22)

      doc.setFontSize(11)
      doc.setTextColor(100, 100, 120)
      doc.text(`${nombre}  ·  ${mesLabel}`, 14, 30)

      // Línea separadora
      doc.setDrawColor(200, 200, 220)
      doc.line(14, 34, 196, 34)

      // Resumen
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 80)
      const summary = [
        ['Ingresos', fmt(ingresos)],
        ['Gastos',   fmt(gastos)],
        ['Balance',  fmt(balance)],
      ]
      summary.forEach(([label, value], i) => {
        doc.text(label, 14, 44 + i * 8)
        doc.setTextColor(balance >= 0 || label !== 'Balance' ? 30 : 200, 50, 50)
        doc.text(value, 80, 44 + i * 8)
        doc.setTextColor(60, 60, 80)
      })

      // Tabla de transacciones
      autoTable(doc, {
        startY: 72,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body: txs.map(t => [
          format(new Date(t.fecha + 'T00:00:00'), 'd MMM', { locale: es }),
          t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
          t.categoria,
          t.descripcion || '—',
          (t.tipo === 'ingreso' ? '+' : '-') + fmt(t.monto),
        ]),
        headStyles: { fillColor: [124, 106, 247], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 248, 252] },
        columnStyles: { 4: { halign: 'right' } },
        styles: { fontSize: 9, cellPadding: 3 },
      })

      doc.save(`finanzas_${mes}.pdf`)
      toast('PDF exportado', 'success')
    } catch {
      toast('Error al exportar', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
        <Download size={16} className="text-brand-500" />
        <h2 className="text-sm font-semibold text-ink">Exportar resumen</h2>
      </div>

      <div className="p-5 space-y-4">

        <div>
          <label className="text-xs text-dim mb-1.5 block">Mes a exportar</label>
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 transition-colors"
          >
            {mesOpciones.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-dim">
          Genera un PDF con el resumen del mes: ingresos, gastos, balance y el listado completo de transacciones.
        </p>

        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 w-full justify-center"
        >
          <Download size={15} />
          {loading ? 'Generando PDF...' : 'Exportar PDF'}
        </button>

      </div>
    </div>
  )
}
