import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  useServicios, useAddServicio, useUpdateServicio, useDeleteServicio,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { daysUntilDue, isPaidThisMonth } from '../utils/serviceDates'

const EMOJIS = ['📺', '🎵', '🌐', '💡', '💧', '🏠', '📱', '🎮', '☁️', '🚗', '🏋️', '📰', '🔒', '🎬', '🛡️', '📦']

function DaysBadge({ dias, pagado }) {
  if (pagado) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-income/20 text-income">
        Pagado
      </span>
    )
  }
  if (dias === null) return null
  if (dias === 0) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-expense/20 text-expense">
        Hoy
      </span>
    )
  }
  if (dias <= 2) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
        {dias}d
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-500">
      {dias}d
    </span>
  )
}

export default function Servicios() {
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [modal, setModal] = useState(null)

  const { data: servicios = [], isLoading } = useServicios()
  const addMut    = useAddServicio()
  const updateMut = useUpdateServicio()
  const deleteMut = useDeleteServicio()

  const totalMensual = useMemo(() =>
    servicios
      .filter(s => s.activo && !isPaidThisMonth(s.ultimo_pago))
      .reduce((sum, s) => sum + +s.monto, 0),
    [servicios]
  )

  const sorted = useMemo(() => {
    return [...servicios].sort((a, b) => {
      const da = daysUntilDue(a.dia_vencimiento) ?? Infinity
      const db = daysUntilDue(b.dia_vencimiento) ?? Infinity
      return da - db
    })
  }, [servicios])

  const handleMarcarPagado = async (servicio) => {
    try {
      await updateMut.mutateAsync({
        id: servicio.id,
        ultimo_pago: format(new Date(), 'yyyy-MM-dd'),
      })
      toast('Marcado como pagado', 'success')
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  const handleToggleActivo = async (servicio) => {
    try {
      await updateMut.mutateAsync({ id: servicio.id, activo: !servicio.activo })
    } catch {
      toast('Error al actualizar', 'error')
    }
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
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id)
      toast('Servicio eliminado', 'success')
      setModal(null)
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Servicios</h1>
        <button
          onClick={() => setModal({ new: true })}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Resumen */}
      <div className="bg-panel border border-line rounded-xl p-4 mb-6">
        <p className="text-xs text-dim mb-1">Total mensual pendiente</p>
        <p className="text-2xl font-bold text-ink">{fmt(totalMensual)}</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-dim text-sm text-center py-16">Cargando...</p>
      )}

      {/* Estado vacío */}
      {!isLoading && servicios.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin servicios registrados</p>
          <button
            onClick={() => setModal({ new: true })}
            className="mt-3 text-brand-500 text-sm hover:underline"
          >
            + Agregar el primero
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map(s => {
            const dias   = daysUntilDue(s.dia_vencimiento)
            const pagado = isPaidThisMonth(s.ultimo_pago)
            return (
              <div
                key={s.id}
                onClick={() => setModal({ servicio: s })}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  !s.activo
                    ? 'bg-panel border-line opacity-40'
                    : 'bg-panel border-line hover:border-brand-500/30'
                }`}
              >
                <span className="text-2xl shrink-0 w-9 text-center leading-none">{s.icono || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{s.nombre}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {s.categoria && (
                      <span className="text-[10px] text-dim">{s.categoria}</span>
                    )}
                    {s.activo && <DaysBadge dias={dias} pagado={pagado} />}
                    {!s.activo && (
                      <span className="text-[10px] text-dim">Inactivo</span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink shrink-0">{fmt(s.monto)}</p>
                {s.activo && !pagado && (
                  <button
                    onClick={e => { e.stopPropagation(); handleMarcarPagado(s) }}
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

      {/* Modal */}
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
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function ServicioModal({ servicio, onSave, onDelete, onClose, saving, deleting }) {
  const [nombre,        setNombre]        = useState(servicio?.nombre          || '')
  const [monto,         setMonto]         = useState(servicio?.monto?.toString() || '')
  const [icono,         setIcono]         = useState(servicio?.icono           || '')
  const [categoria,     setCategoria]     = useState(servicio?.categoria       || '')
  const [diaVencimiento, setDia]          = useState(servicio?.dia_vencimiento?.toString() || '')
  const [activo,        setActivo]        = useState(servicio?.activo ?? true)
  const [confirmDel,    setConfirmDel]    = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim() || !monto) return
    const dia = parseInt(diaVencimiento, 10)
    onSave({
      nombre: nombre.trim(),
      monto: parseFloat(monto),
      icono: icono || null,
      categoria: categoria.trim() || null,
      dia_vencimiento: diaVencimiento && dia >= 1 && dia <= 31 ? dia : null,
      activo,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-semibold">{servicio ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Nombre</label>
            <input
              type="text"
              placeholder="Ej: Netflix, Internet..."
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Monto mensual</label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={monto} onChange={e => setMonto(e.target.value)}
              required min="0.01" step="any"
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Ícono</label>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJIS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setIcono(prev => prev === e ? '' : e)}
                  className={`h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${
                    icono === e
                      ? 'bg-brand-500/20 ring-1 ring-brand-500/60'
                      : 'bg-well hover:bg-brand-500/10'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Día vencimiento */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Día de vencimiento <span className="opacity-50">(1-31, opcional)</span>
            </label>
            <input
              type="number" inputMode="numeric" placeholder="Ej: 15"
              value={diaVencimiento} onChange={e => setDia(e.target.value)}
              min="1" max="31"
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Categoría <span className="opacity-50">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Entretenimiento, Hogar..."
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Toggle activo */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-ink">Servicio activo</span>
            <button
              type="button"
              onClick={() => setActivo(v => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                activo ? 'bg-brand-500' : 'bg-well border border-line'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                activo ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <button
            type="submit"
            disabled={saving || !nombre.trim() || !monto}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : servicio ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>

        {/* Eliminar */}
        {servicio && (
          <div className="mt-3">
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-expense text-sm rounded-xl hover:bg-expense/10 transition-colors"
              >
                <Trash2 size={15} /> Eliminar servicio
              </button>
            ) : (
              <div className="bg-expense/10 border border-expense/30 rounded-xl p-3 text-center space-y-2">
                <p className="text-sm text-ink">¿Eliminar este servicio?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="flex-1 py-2 rounded-lg bg-well text-dim text-sm hover:text-ink transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onDelete(servicio.id)}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-lg bg-expense text-white text-sm disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
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
