import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import {
  Plus, X, Trash2, Tag, Tv, Music, Wifi, Phone, Zap, Flame,
  Droplets, Dumbbell, Laptop, Shield, Landmark, Home, Car,
  Gamepad2, CreditCard, Heart, BookOpen, Briefcase, ShoppingBag,
  Globe, Cloud, Package,
} from 'lucide-react'
import {
  useServicios, useAddServicio, useUpdateServicio, useDeleteServicio,
  useAddTransaccion,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { daysUntilDue, isPaidThisMonth } from '../utils/serviceDates'

// ── Íconos disponibles para servicios ────────────────────────────────────────
const SERVICE_ICONS = [
  { key: 'tv',         Icon: Tv },
  { key: 'music',      Icon: Music },
  { key: 'wifi',       Icon: Wifi },
  { key: 'phone',      Icon: Phone },
  { key: 'globe',      Icon: Globe },
  { key: 'cloud',      Icon: Cloud },
  { key: 'zap',        Icon: Zap },
  { key: 'flame',      Icon: Flame },
  { key: 'droplets',   Icon: Droplets },
  { key: 'dumbbell',   Icon: Dumbbell },
  { key: 'laptop',     Icon: Laptop },
  { key: 'shield',     Icon: Shield },
  { key: 'landmark',   Icon: Landmark },
  { key: 'home',       Icon: Home },
  { key: 'car',        Icon: Car },
  { key: 'gamepad',    Icon: Gamepad2 },
  { key: 'credit',     Icon: CreditCard },
  { key: 'heart',      Icon: Heart },
  { key: 'book',       Icon: BookOpen },
  { key: 'briefcase',  Icon: Briefcase },
  { key: 'shopping',   Icon: ShoppingBag },
  { key: 'package',    Icon: Package },
  { key: 'tag',        Icon: Tag },
]

function getServiceIcon(key) {
  return SERVICE_ICONS.find(i => i.key === key)?.Icon ?? Tag
}

// ── Categorías de servicios ───────────────────────────────────────────────────
const DEFAULT_SERVICE_CATS = [
  { name: 'Streaming',    icon: 'tv',        color: '#e11d48' },
  { name: 'Música',       icon: 'music',     color: '#8b5cf6' },
  { name: 'Internet',     icon: 'wifi',      color: '#3b82f6' },
  { name: 'Telefonía',    icon: 'phone',     color: '#10b981' },
  { name: 'Electricidad', icon: 'zap',       color: '#f59e0b' },
  { name: 'Gas',          icon: 'flame',     color: '#f97316' },
  { name: 'Agua',         icon: 'droplets',  color: '#06b6d4' },
  { name: 'Gimnasio',     icon: 'dumbbell',  color: '#84cc16' },
  { name: 'Software',     icon: 'laptop',    color: '#7c6af7' },
  { name: 'Seguros',      icon: 'shield',    color: '#64748b' },
  { name: 'Banco',        icon: 'landmark',  color: '#0ea5e9' },
  { name: 'Otro',         icon: 'tag',       color: '#94a3b8' },
]

const SC_KEY = 'service_category_meta'

function getCustomServiceCats() {
  try { return JSON.parse(localStorage.getItem(SC_KEY) || '[]') } catch { return [] }
}
function saveCustomServiceCat(cat) {
  const prev = getCustomServiceCats()
  if (!prev.find(c => c.name === cat.name)) {
    localStorage.setItem(SC_KEY, JSON.stringify([...prev, cat]))
  }
}

function getServiceCatMeta(name) {
  const def = DEFAULT_SERVICE_CATS.find(c => c.name === name)
  if (def) return def
  const custom = getCustomServiceCats().find(c => c.name === name)
  if (custom) return custom
  return { name, icon: 'tag', color: '#94a3b8' }
}

// ── Badge días ────────────────────────────────────────────────────────────────
function DaysBadge({ dias, pagado }) {
  if (pagado) return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-income/20 text-income">Pagado</span>
  )
  if (dias === null) return null
  if (dias === 0) return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-expense/20 text-expense">Hoy</span>
  )
  if (dias <= 2) return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{dias}d</span>
  )
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-500">{dias}d</span>
  )
}


// ── Página principal ──────────────────────────────────────────────────────────
export default function Servicios() {
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [modal,       setModal]       = useState(null)
  const [pagoModal,   setPagoModal]   = useState(null) // { servicio }

  const { data: servicios = [], isLoading } = useServicios()
  const addMut    = useAddServicio()
  const updateMut = useUpdateServicio()
  const deleteMut = useDeleteServicio()
  const addTxMut  = useAddTransaccion()

  const totalMensual = useMemo(() =>
    servicios
      .filter(s => s.activo && !isPaidThisMonth(s.ultimo_pago))
      .reduce((sum, s) => sum + +s.monto, 0),
    [servicios]
  )

  const sorted = useMemo(() =>
    [...servicios].sort((a, b) => {
      const da = daysUntilDue(a.dia_vencimiento) ?? Infinity
      const db = daysUntilDue(b.dia_vencimiento) ?? Infinity
      return da - db
    }),
    [servicios]
  )

  const handleConfirmarPago = async ({ servicio, monto, registrarGasto }) => {
    try {
      await updateMut.mutateAsync({
        id: servicio.id,
        ultimo_pago: format(new Date(), 'yyyy-MM-dd'),
      })
      if (registrarGasto) {
        await addTxMut.mutateAsync({
          tipo:       'gasto',
          monto:      parseFloat(monto),
          categoria:  servicio.categoria || 'Otro',
          descripcion: servicio.nombre,
          fecha:      format(new Date(), 'yyyy-MM-dd'),
        })
      }
      toast('Pago registrado', 'success')
      setPagoModal(null)
    } catch { toast('Error al registrar pago', 'error') }
  }

  const handleSave = async (data) => {
    try {
      if (modal?.servicio) {
        await updateMut.mutateAsync({ id: modal.servicio.id, ...data })
        toast('Servicio actualizado', 'success')
      } else {
        await addMut.mutateAsync(data)
        toast('Servicio agregado', 'success')
      }
      setModal(null)
    } catch { toast('Error al guardar', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id)
      toast('Servicio eliminado', 'success')
      setModal(null)
    } catch { toast('Error al eliminar', 'error') }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Servicios</h1>
        <button
          onClick={() => setModal({ new: true })}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="bg-panel border border-line rounded-xl p-4 mb-6">
        <p className="text-xs text-dim mb-1">Total mensual pendiente</p>
        <p className="text-2xl font-bold text-ink">{fmt(totalMensual)}</p>
      </div>

      {isLoading && <p className="text-dim text-sm text-center py-16">Cargando...</p>}

      {!isLoading && servicios.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin servicios registrados</p>
          <button onClick={() => setModal({ new: true })} className="mt-3 text-brand-500 text-sm hover:underline">
            + Agregar el primero
          </button>
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map(s => {
            const dias   = daysUntilDue(s.dia_vencimiento)
            const pagado = isPaidThisMonth(s.ultimo_pago)
            const meta   = s.categoria ? getServiceCatMeta(s.categoria) : null
            const Icon   = getServiceIcon(s.icono)
            const color  = meta?.color ?? '#7c6af7'

            return (
              <div
                key={s.id}
                onClick={() => setModal({ servicio: s })}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  !s.activo ? 'bg-panel border-line opacity-40' : 'bg-panel border-line hover:border-brand-500/30'
                }`}
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: color + '22', color }}
                >
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{s.nombre}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {s.categoria && <span className="text-[10px] text-dim">{s.categoria}</span>}
                    {s.activo && <DaysBadge dias={dias} pagado={pagado} />}
                    {!s.activo && <span className="text-[10px] text-dim">Inactivo</span>}
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink shrink-0">{fmt(s.monto)}</p>
                {s.activo && !pagado && (
                  <button
                    onClick={e => { e.stopPropagation(); setPagoModal({ servicio: s }) }}
                    className="shrink-0 px-2.5 py-1.5 text-[11px] font-medium bg-income/15 text-income rounded-lg hover:bg-income/25 transition-colors"
                  >
                    Pagar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <ServicioModal
          servicio={modal.servicio ?? null}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          saving={addMut.isPending || updateMut.isPending}
          deleting={deleteMut.isPending}
        />
      )}

      {pagoModal && (
        <PagoModal
          servicio={pagoModal.servicio}
          onConfirm={handleConfirmarPago}
          onClose={() => setPagoModal(null)}
          saving={updateMut.isPending || addTxMut.isPending}
        />
      )}
    </div>
  )
}

// ── Modal confirmación de pago ────────────────────────────────────────────────
function PagoModal({ servicio, onConfirm, onClose, saving }) {
  const { format: fmt } = useCurrency()
  const [monto,          setMonto]          = useState(servicio.monto?.toString() || '')
  const [registrarGasto, setRegistrarGasto] = useState(true)

  const Icon  = getServiceIcon(servicio.icono)
  const meta  = servicio.categoria ? getServiceCatMeta(servicio.categoria) : null
  const color = meta?.color ?? '#7c6af7'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: color + '22', color }}>
              <Icon size={16} />
            </span>
            <h2 className="text-ink font-semibold text-sm">{servicio.nombre}</h2>
          </div>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-dim mb-1.5 block">¿Cuánto pagaste este mes?</label>
            <input
              type="number" inputMode="decimal"
              value={monto} onChange={e => setMonto(e.target.value)}
              min="0.01" step="any" autoFocus
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
            {+monto !== +servicio.monto && servicio.monto > 0 && (
              <p className="text-xs text-dim mt-1">
                Monto habitual: {fmt(servicio.monto)}
              </p>
            )}
          </div>

          {/* Opción registrar como gasto */}
          <button
            type="button"
            onClick={() => setRegistrarGasto(v => !v)}
            className="flex items-center gap-2.5 w-full text-left"
          >
            <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
              registrarGasto ? 'bg-brand-500 border-brand-500' : 'border-dim'
            }`}>
              {registrarGasto && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="text-sm text-ink">Registrar también como gasto</span>
          </button>

          <button
            onClick={() => onConfirm({ servicio, monto, registrarGasto })}
            disabled={saving || !monto || +monto <= 0}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dropdown nueva categoría via portal ──────────────────────────────────────
function NewCatDropdown({ anchorRef, open, onClose, onCrear }) {
  const [name,  setName]  = useState('')
  const [icon,  setIcon]  = useState('tag')
  const [color, setColor] = useState('#7c6af7')
  const [pos,   setPos]   = useState({ top: 0, left: 0, width: 0 })

  const COLOR_OPTIONS = ['#e11d48','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#7c6af7','#64748b','#94a3b8']

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const r   = anchorRef.current.getBoundingClientRect()
    const vw  = window.innerWidth
    const vh  = window.innerHeight
    const pad = 8
    const w   = Math.min(288, vw - pad * 2)
    const estimatedH = 360

    let left = r.left
    let top  = r.bottom + 6

    // No salir por la derecha
    if (left + w > vw - pad) left = vw - w - pad
    // No salir por la izquierda
    if (left < pad) left = pad
    // Si no entra abajo, abrir hacia arriba
    if (top + estimatedH > vh - pad) top = Math.max(pad, r.top - estimatedH - 6)

    setPos({ top, left, w })
  }, [open])

  const handleCrear = () => {
    const n = name.trim()
    if (!n) return
    onCrear({ name: n, icon, color })
    setName(''); setIcon('tag'); setColor('#7c6af7')
  }

  if (!open) return null

  return createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <div
        className="dropdown-bouncy fixed z-[999] bg-panel border border-line rounded-xl shadow-2xl p-3 space-y-3 overflow-y-auto"
        style={{ top: pos.top, left: pos.left, width: pos.w ?? 288, maxHeight: '80vh' }}
      >
        <input
          type="text" placeholder="Nombre de la categoría"
          value={name} onChange={e => setName(e.target.value)}
          autoFocus
          className="w-full bg-well border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500"
        />
        <div>
          <p className="text-xs text-dim mb-1.5">Ícono</p>
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_ICONS.map(({ key, Icon: I }) => (
              <button key={key} type="button" onClick={() => setIcon(key)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  icon === key
                    ? 'bg-brand-500/20 text-brand-500 border border-brand-500/50'
                    : 'bg-well border border-line text-dim hover:text-ink'
                }`}
              >
                <I size={14} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs text-dim mb-1.5">Color</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-panel' : 'hover:scale-110'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-xs text-dim bg-well border border-line rounded-lg hover:text-ink">
            Cancelar
          </button>
          <button type="button" onClick={handleCrear} disabled={!name.trim()}
            className="px-3 py-1.5 text-xs text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
            Crear
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Modal editar/crear servicio ───────────────────────────────────────────────
function ServicioModal({ servicio, onSave, onDelete, onClose, saving, deleting }) {
  const initialCat = servicio?.categoria
    ? getServiceCatMeta(servicio.categoria)
    : DEFAULT_SERVICE_CATS[0]

  const [nombre,        setNombre]     = useState(servicio?.nombre || '')
  const [monto,         setMonto]      = useState(servicio?.monto?.toString() || '')
  const [icono,         setIcono]      = useState(servicio?.icono || initialCat.icon)
  const [categoria,     setCategoria]  = useState(servicio?.categoria || initialCat.name)
  const [diaVenc,       setDia]        = useState(servicio?.dia_vencimiento?.toString() || '')
  const [activo,        setActivo]     = useState(servicio?.activo ?? true)
  const [confirmDel,    setConfirmDel] = useState(false)

  // Categorías custom del usuario
  const [customCats,  setCustomCats]  = useState(() => getCustomServiceCats())
  const [showNewCat,  setShowNewCat]  = useState(false)
  const nuevaBtnRef = useRef(null)

  const allCats = [...DEFAULT_SERVICE_CATS, ...customCats.filter(c => !DEFAULT_SERVICE_CATS.find(d => d.name === c.name))]
  const catActual = allCats.find(c => c.name === categoria) ?? allCats[0]

  const handleSelectCat = (cat) => {
    setCategoria(cat.name)
    setIcono(cat.icon)
  }

  const handleCreateCat = ({ name, icon, color }) => {
    const cat = { name, icon, color }
    saveCustomServiceCat(cat)
    setCustomCats(getCustomServiceCats())
    handleSelectCat(cat)
    setShowNewCat(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim() || !monto) return
    const dia = parseInt(diaVenc, 10)
    onSave({
      nombre:         nombre.trim(),
      monto:          parseFloat(monto),
      icono:          icono || null,
      categoria:      categoria || null,
      dia_vencimiento: diaVenc && dia >= 1 && dia <= 31 ? dia : null,
      activo,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ink font-semibold">{servicio ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Nombre</label>
            <input
              type="text" placeholder="Ej: Netflix, Internet..."
              value={nombre} onChange={e => setNombre(e.target.value)} required
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Monto mensual</label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={monto} onChange={e => setMonto(e.target.value)} required min="0.01" step="any"
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs text-dim mb-2 block">Categoría</label>
            <div className="flex flex-wrap gap-2 items-center">
              {allCats.map(cat => {
                const CatIcon = getServiceIcon(cat.icon)
                const sel = categoria === cat.name
                return (
                  <button
                    key={cat.name} type="button"
                    onClick={() => handleSelectCat(cat)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                      sel
                        ? 'border-brand-500 bg-brand-500/10 text-ink'
                        : 'border-line bg-well text-dim hover:border-brand-500/40 hover:text-ink'
                    }`}
                  >
                    <CatIcon size={12} style={{ color: cat.color }} />
                    {cat.name}
                  </button>
                )
              })}

              {/* Botón Nueva */}
              <button
                ref={nuevaBtnRef}
                type="button"
                onClick={() => setShowNewCat(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  showNewCat
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                    : 'border-dashed border-line text-dim hover:border-brand-500/40 hover:text-ink'
                }`}
              >
                <Plus size={11} /> Nueva
              </button>

              <NewCatDropdown
                anchorRef={nuevaBtnRef}
                open={showNewCat}
                onClose={() => setShowNewCat(false)}
                onCrear={handleCreateCat}
              />
            </div>
          </div>

          {/* Día vencimiento */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Día de vencimiento <span className="opacity-50">(1–31, opcional)</span>
            </label>
            <input
              type="number" inputMode="numeric" placeholder="Ej: 15"
              value={diaVenc} onChange={e => setDia(e.target.value)} min="1" max="31"
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Toggle activo */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-ink">Servicio activo</span>
            <button type="button" onClick={() => setActivo(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${activo ? 'bg-brand-500' : 'bg-line'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${activo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <button type="submit" disabled={saving || !nombre.trim() || !monto}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : servicio ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>

        {servicio && (
          <div className="mt-3">
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-expense text-sm rounded-xl hover:bg-expense/10 transition-colors">
                <Trash2 size={15} /> Eliminar servicio
              </button>
            ) : (
              <div className="bg-expense/10 border border-expense/30 rounded-xl p-3 text-center space-y-2">
                <p className="text-sm text-ink">¿Eliminar este servicio?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDel(false)}
                    className="flex-1 py-2 rounded-lg bg-well text-dim text-sm hover:text-ink transition-colors">
                    Cancelar
                  </button>
                  <button onClick={() => onDelete(servicio.id)} disabled={deleting}
                    className="flex-1 py-2 rounded-lg bg-expense text-white text-sm disabled:opacity-50">
                    {deleting ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
