import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import Cropper from 'react-easy-crop'
import { User, Camera, Save, RefreshCw, LogOut, AlertTriangle, X, ZoomIn, ZoomOut, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useProfile, useUpdateProfile, useTransacciones } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { getCategoryMeta } from '../lib/categoryMeta'
import { supabase } from '../lib/supabase'

const now        = new Date()
const mesFrom    = format(startOfMonth(now), 'yyyy-MM-dd')
const mesTo      = format(endOfMonth(now),   'yyyy-MM-dd')
const mesAntFrom = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
const mesAntTo   = format(endOfMonth(subMonths(now, 1)),   'yyyy-MM-dd')

export default function Perfil() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const { currency, setCurrency, format: fmt } = useCurrency()
  const { data: profile } = useProfile()
  const updateMut = useUpdateProfile()

  const { data: txMes    = [] } = useTransacciones({ from: mesFrom,    to: mesTo    })
  const { data: txAntMes = [] } = useTransacciones({ from: mesAntFrom, to: mesAntTo })

  const resumen = useMemo(() => {
    const ingresos  = txMes.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0)
    const gastos    = txMes.filter(t => t.tipo === 'gasto').reduce((s, t)   => s + +t.monto, 0)
    const gastosAnt = txAntMes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + +t.monto, 0)
    const balance   = ingresos - gastos
    const pctVsMes  = gastosAnt > 0 ? ((gastos - gastosAnt) / gastosAnt * 100).toFixed(0) : null

    const catMap = {}
    txMes.filter(t => t.tipo === 'gasto').forEach(t => {
      catMap[t.categoria] = (catMap[t.categoria] || 0) + +t.monto
    })
    const topCat = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]

    return { ingresos, gastos, balance, pctVsMes, topCat, count: txMes.length }
  }, [txMes, txAntMes])

  const [nombre, setNombre] = useState('')
  const [apodo,  setApodo]  = useState('')
  const [avatarUrl,       setAvatarUrl]       = useState(null)
  const [uploading,       setUploading]       = useState(false)
  const [pendingCurrency, setPendingCurrency] = useState(null)
  const [savingCurrency,  setSavingCurrency]  = useState(false)
  // Crop state
  const [cropSrc,     setCropSrc]     = useState(null)  // URL del archivo seleccionado
  const [crop,        setCrop]        = useState({ x: 0, y: 0 })
  const [zoom,        setZoom]        = useState(1)
  const [croppedArea, setCroppedArea] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre     || '')
      setApodo(profile.apodo       || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile?.id])

  // Al seleccionar archivo → abrir modal de crop
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast('La imagen no puede superar 10 MB', 'error')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedArea(areaPixels)
  }, [])

  // Al confirmar el crop → generar canvas → subir blob
  const handleUploadCropped = async () => {
    if (!croppedArea || !cropSrc || !user) return
    setUploading(true)
    try {
      const blob = await getCroppedBlob(cropSrc, croppedArea)
      const path = `${user.id}/${Date.now()}.jpg`

      const { data: uploadData, error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { contentType: 'image/jpeg' })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path)

      await updateMut.mutateAsync({ avatar_url: publicUrl })
      setAvatarUrl(publicUrl)
      setCropSrc(null)
      toast('Foto actualizada', 'success')
    } catch (err) {
      console.error('Avatar upload error:', err)
      toast(err?.message ?? 'Error al subir la imagen', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmCurrency = async () => {
    if (!pendingCurrency) return
    setSavingCurrency(true)
    try {
      await setCurrency(pendingCurrency)
      toast(`Moneda cambiada a ${pendingCurrency}`, 'success')
    } catch {
      toast('Error al cambiar la moneda', 'error')
    } finally {
      setSavingCurrency(false)
      setPendingCurrency(null)
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Mi perfil</h1>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <User size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Datos personales</h2>
        </div>

        <div className="p-5 space-y-6">

          {/* Avatar */}
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
                {uploading
                  ? <RefreshCw size={11} className="text-white animate-spin" />
                  : <Camera size={11} className="text-white" />
                }
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
        </div>
      </div>

      {/* Moneda */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-sm font-semibold text-ink">Moneda principal</h2>
          <p className="text-xs text-dim mt-0.5">Todos los montos de la app se mostrarán en esta moneda.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => c.code !== currency && setPendingCurrency(c.code)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-colors ${
                  currency === c.code
                    ? 'border-brand-500 bg-brand-500/10 text-ink font-semibold'
                    : 'border-line bg-well text-dim hover:text-ink hover:border-brand-500/30'
                }`}
              >
                <span className="text-xl">{c.flag}</span>
                <span className="text-sm">{c.code}</span>
                <span className="text-xs text-dim">{c.symbol}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen mensual */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">
              Resumen de {format(now, 'MMMM', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
            </h2>
            <span className="text-xs text-dim">{resumen.count} movimiento{resumen.count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* 3 stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Ingresos', value: resumen.ingresos, icon: TrendingUp,   color: 'text-income',  bg: 'bg-income/10'  },
              { label: 'Gastos',   value: resumen.gastos,   icon: TrendingDown, color: 'text-expense', bg: 'bg-expense/10' },
              { label: 'Balance',  value: resumen.balance,  icon: Wallet,
                color: resumen.balance >= 0 ? 'text-income' : 'text-expense',
                bg:    resumen.balance >= 0 ? 'bg-income/10' : 'bg-expense/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="text-center">
                <div className={`w-8 h-8 rounded-lg ${bg} ${color} flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon size={15} />
                </div>
                <p className="text-[10px] text-dim">{label}</p>
                <p className={`text-xs font-bold ${color}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Top categoría + comparación */}
          <div className="flex items-center justify-between pt-3 border-t border-line">
            {resumen.topCat ? (() => {
              const meta = getCategoryMeta(resumen.topCat[0])
              const Icon = meta.icon
              return (
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: meta.color + '22', color: meta.color }}>
                    <Icon size={13} />
                  </span>
                  <div>
                    <p className="text-[10px] text-dim">Top categoría</p>
                    <p className="text-xs font-medium text-ink">{resumen.topCat[0]}</p>
                  </div>
                </div>
              )
            })() : <span className="text-xs text-dim">Sin gastos este mes</span>}

            {resumen.pctVsMes !== null && (
              <div className="text-right">
                <p className="text-[10px] text-dim">vs mes anterior</p>
                <p className={`text-xs font-semibold ${+resumen.pctVsMes > 0 ? 'text-expense' : 'text-income'}`}>
                  {+resumen.pctVsMes > 0 ? '+' : ''}{resumen.pctVsMes}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de recorte de avatar */}
      {cropSrc && (
        <div className="fixed inset-0 bg-black/80 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 shrink-0">
            <button
              onClick={() => setCropSrc(null)}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X size={22} />
            </button>
            <span className="text-white text-sm font-medium">Ajustar foto</span>
            <button
              onClick={handleUploadCropped}
              disabled={uploading}
              className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? <RefreshCw size={14} className="animate-spin" /> : 'Guardar'}
            </button>
          </div>

          {/* Área de recorte */}
          <div className="relative flex-1">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { background: '#000' },
                cropAreaStyle:  { border: '2px solid #7c6af7', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' },
              }}
            />
          </div>

          {/* Slider de zoom */}
          <div className="flex items-center gap-3 px-6 py-5 shrink-0">
            <ZoomOut size={18} className="text-white/50 shrink-0" />
            <input
              type="range"
              min={1} max={3} step={0.01}
              value={zoom}
              onChange={e => setZoom(+e.target.value)}
              className="flex-1 accent-brand-500"
            />
            <ZoomIn size={18} className="text-white/50 shrink-0" />
          </div>
        </div>
      )}

      {/* Modal confirmación cambio de moneda */}
      {pendingCurrency && (() => {
        const cur = CURRENCIES.find(c => c.code === pendingCurrency)
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-ink font-semibold">Cambiar a {cur?.name}</h3>
                  <p className="text-dim text-sm mt-1">
                    Los montos se mostrarán en <span className="text-ink font-medium">{cur?.flag} {cur?.code} ({cur?.symbol})</span>. Los números no se convierten — solo cambia el formato de visualización.
                  </p>
                </div>
                <button onClick={() => setPendingCurrency(null)} className="text-dim hover:text-ink shrink-0">
                  <X size={18} />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingCurrency(null)}
                  className="flex-1 py-2.5 rounded-xl bg-well text-dim text-sm font-medium hover:text-ink transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCurrency}
                  disabled={savingCurrency}
                  className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingCurrency ? 'Guardando...' : `Confirmar`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Logout */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-dim hover:text-expense transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

// ── Genera un Blob JPEG a partir de la imagen y el área recortada ─────────────
async function getCroppedBlob(imageSrc, pixelCrop) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = Math.min(pixelCrop.width, pixelCrop.height, 512)
  canvas.width  = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0, size, size,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas vacío')), 'image/jpeg', 0.9)
  })
}
