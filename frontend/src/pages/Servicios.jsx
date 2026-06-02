import { useState, useMemo } from 'react'
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

// ── Picker de ícono ───────────────────────────────────────────────────────────
function IconPicker({ value, color, onChange }) {
  const [open, setOpen] = useState(false)
  const Icon = getServiceIcon(value)

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title="Cambiar ícono"
        className="w-20 h-20 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{ background: color + '22', color }}
      >
        <Icon size={38} />
      </button>

      {open && (
        <div className="w-full bg-well border border-line rounded-2xl p-3">
          <p className="text-[10px] text-dim mb-2 text-center">Seleccioná un ícono</p>
          <div className="grid grid-cols-6 gap-1.5">
            {SERVICE_ICONS.map(({ key, Icon: I }) => (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(key); setOpen(false) }}
                className={`h-10 rounded-xl flex items-center justify-center transition-colors ${
                  value === key
                    ? 'ring-2 ring-offset-1 ring-offset-well'
                    : 'hover:bg-brand-500/10 text-dim hover:text-ink'
                }`}
                style={value === key ? { color, ringColor: color } : {}}
              >
                <I size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
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
  const [newCatName,  setNewCatName]  = useState('')
  const [newCatIcon,  setNewCatIcon]  = useState('tag')
  const [newCatColor, setNewCatColor] = useState('#7c6af7')

  const allCats = [...DEFAULT_SERVICE_CATS, ...customCats.filter(c => !DEFAULT_SERVICE_CATS.find(d => d.name === c.name))]
  const catActual = allCats.find(c => c.name === categoria) ?? allCats[0]

  const handleSelectCat = (cat) => {
    setCategoria(cat.name)
    setIcono(cat.icon)
  }

  const handleCreateCat = () => {
    const name = newCatName.trim()
    if (!name) return
    const cat = { name, icon: newCatIcon, color: newCatColor }
    saveCustomServiceCat(cat)
    setCustomCats(getCustomServiceCats())
    handleSelectCat(cat)
    setNewCatName('')
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

  const COLOR_OPTIONS = ['#e11d48','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#7c6af7','#64748b','#94a3b8']

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-ink font-semibold">{servicio ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Ícono grande centrado */}
          <IconPicker value={icono} color={catActual.color} onChange={setIcono} />

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
            <div className="flex flex-wrap gap-2">
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
              {/* Botón nueva categoría */}
              <button
                type="button" onClick={() => setShowNewCat(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  showNewCat
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                    : 'border-dashed border-line text-dim hover:border-brand-500/40 hover:text-ink'
                }`}
              >
                <Plus size={11} /> Nueva
              </button>
            </div>

            {/* Form nueva categoría */}
            {showNewCat && (
              <div className="mt-3 p-3 bg-well border border-line rounded-xl space-y-3">
                <input
                  type="text" placeholder="Nombre de la categoría"
                  value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  autoFocus
                  className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500"
                />
                {/* Selector de ícono mini */}
                <div>
                  <p className="text-xs text-dim mb-1.5">Ícono</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SERVICE_ICONS.map(({ key, Icon: I }) => (
                      <button key={key} type="button" onClick={() => setNewCatIcon(key)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          newCatIcon === key
                            ? 'bg-brand-500/20 text-brand-500 border border-brand-500/50'
                            : 'bg-panel border border-line text-dim hover:text-ink'
                        }`}
                      >
                        <I size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                {/* Color */}
                <div>
                  <p className="text-xs text-dim mb-1.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} type="button" onClick={() => setNewCatColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${newCatColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-well' : 'hover:scale-110'}`}
                        style={{ background: c, '--tw-ring-color': c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowNewCat(false)}
                    className="px-3 py-1.5 text-xs text-dim bg-panel border border-line rounded-lg hover:text-ink">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreateCat} disabled={!newCatName.trim()}
                    className="px-3 py-1.5 text-xs text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
                    Crear
                  </button>
                </div>
              </div>
            )}
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
