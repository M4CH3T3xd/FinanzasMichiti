import { useState, useMemo } from 'react'
import { differenceInDays } from 'date-fns'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  useMetas, useAddMeta, useUpdateMeta, useDeleteMeta,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'

const EMOJIS = ['🏠', '🚗', '✈️', '💻', '📱', '🎓', '💍', '🏖️', '💰', '🎯', '🏋️', '📚', '🎨', '🎸', '🌍', '🐶']

function progressColor(pct) {
  if (pct >= 80) return 'bg-income'
  if (pct >= 50) return 'bg-yellow-400'
  return 'bg-brand-500'
}

function FechaLimiteBadge({ fecha }) {
  if (!fecha) return null
  const d = new Date(fecha + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = differenceInDays(d, today)

  if (diff < 0) {
    return (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-expense/20 text-expense">
        Vencida
      </span>
    )
  }
  return (
    <span className="text-[10px] text-dim">
      {diff === 0 ? 'Hoy' : `${diff}d restantes`}
    </span>
  )
}

export default function Metas() {
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [modal,       setModal]       = useState(null) // null | { new: true } | { meta } | { abonar: meta }
  const [abonarMonto, setAbonarMonto] = useState('')

  const { data: metas = [], isLoading } = useMetas()
  const addMut    = useAddMeta()
  const updateMut = useUpdateMeta()
  const deleteMut = useDeleteMeta()

  const handleSave = async (data) => {
    try {
      if (modal?.meta) {
        await updateMut.mutateAsync({ id: modal.meta.id, ...data })
        toast('Meta actualizada', 'success')
      } else {
        await addMut.mutateAsync(data)
        toast('Meta agregada', 'success')
      }
      setModal(null)
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id)
      toast('Meta eliminada', 'success')
      setModal(null)
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  const handleAbonar = async () => {
    const meta = modal?.abonar
    if (!meta || !abonarMonto) return
    const suma = parseFloat(abonarMonto)
    if (!suma || suma <= 0) return
    const nuevo = Math.min(+meta.monto_actual + suma, +meta.monto_objetivo)
    try {
      await updateMut.mutateAsync({ id: meta.id, monto_actual: nuevo })
      toast('Abono registrado', 'success')
      setModal(null)
      setAbonarMonto('')
    } catch {
      toast('Error al registrar abono', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Metas de ahorro</h1>
        <button
          onClick={() => setModal({ new: true })}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-dim text-sm text-center py-16">Cargando...</p>
      )}

      {/* Estado vacío */}
      {!isLoading && metas.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin metas de ahorro</p>
          <button
            onClick={() => setModal({ new: true })}
            className="mt-3 text-brand-500 text-sm hover:underline"
          >
            + Crear la primera
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && metas.length > 0 && (
        <div className="space-y-3">
          {metas.map(meta => {
            const objetivo  = +meta.monto_objetivo
            const actual    = +meta.monto_actual
            const pct       = objetivo > 0 ? Math.min((actual / objetivo) * 100, 100) : 0
            const completada = actual >= objetivo

            return (
              <div
                key={meta.id}
                onClick={() => setModal({ meta })}
                className="relative bg-panel border border-line rounded-xl p-4 cursor-pointer hover:border-brand-500/30 transition-colors overflow-hidden"
              >
                {/* Overlay completada */}
                {completada && (
                  <div className="absolute inset-0 bg-income/10 flex items-center justify-center rounded-xl z-10">
                    <span className="text-2xl font-bold text-income bg-panel/90 px-4 py-2 rounded-xl border border-income/30">
                      Completada
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl shrink-0 leading-none">{meta.icono || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">{meta.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <FechaLimiteBadge fecha={meta.fecha_limite} />
                    </div>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (!completada) {
                        setAbonarMonto('')
                        setModal({ abonar: meta })
                      }
                    }}
                    disabled={completada}
                    className="shrink-0 px-2.5 py-1.5 text-[11px] font-medium bg-brand-500/15 text-brand-500 rounded-lg hover:bg-brand-500/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    + Abonar
                  </button>
                </div>

                {/* Barra de progreso */}
                <div className="h-2 bg-well rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${progressColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-dim">
                    {fmt(actual)} de {fmt(objetivo)}
                  </p>
                  <p className="text-xs font-semibold text-ink">
                    {pct.toFixed(0)}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal abonar */}
      {modal?.abonar && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-ink font-semibold">Abonar a "{modal.abonar.nombre}"</h2>
              <button onClick={() => setModal(null)} className="text-dim hover:text-ink transition-colors">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-dim mb-3">
              Actual: {(+modal.abonar.monto_actual).toLocaleString()} / {(+modal.abonar.monto_objetivo).toLocaleString()}
            </p>
            <input
              type="number" inputMode="decimal" placeholder="Monto a abonar"
              value={abonarMonto} onChange={e => setAbonarMonto(e.target.value)}
              min="0.01" step="any" autoFocus
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-well text-dim text-sm hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbonar}
                disabled={!abonarMonto || updateMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {updateMut.isPending ? 'Guardando...' : 'Abonar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar / crear */}
      {(modal?.meta || modal?.new) && (
        <MetaModal
          meta={modal?.meta ?? null}
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

// ── Modal editar/crear ────────────────────────────────────────────────────────
function MetaModal({ meta, onSave, onDelete, onClose, saving, deleting }) {
  const [nombre,    setNombre]    = useState(meta?.nombre          || '')
  const [icono,     setIcono]     = useState(meta?.icono           || '')
  const [objetivo,  setObjetivo]  = useState(meta?.monto_objetivo?.toString() || '')
  const [fechaLim,  setFechaLim]  = useState(meta?.fecha_limite    || '')
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim() || !objetivo) return
    onSave({
      nombre: nombre.trim(),
      icono: icono || null,
      monto_objetivo: parseFloat(objetivo),
      monto_actual: meta?.monto_actual ?? 0,
      fecha_limite: fechaLim || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-semibold">{meta ? 'Editar meta' : 'Nueva meta'}</h2>
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
              placeholder="¿Qué quieres lograr?"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Monto objetivo */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Monto objetivo</label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={objetivo} onChange={e => setObjetivo(e.target.value)}
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

          {/* Fecha límite */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Fecha límite <span className="opacity-50">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaLim}
              onChange={e => setFechaLim(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !nombre.trim() || !objetivo}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : meta ? 'Guardar cambios' : 'Crear meta'}
          </button>
        </form>

        {/* Eliminar */}
        {meta && (
          <div className="mt-3">
            {!confirmDel ? (
              <button
                onClick={() => setConfirmDel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-expense text-sm rounded-xl hover:bg-expense/10 transition-colors"
              >
                <Trash2 size={15} /> Eliminar meta
              </button>
            ) : (
              <div className="bg-expense/10 border border-expense/30 rounded-xl p-3 text-center space-y-2">
                <p className="text-sm text-ink">¿Eliminar esta meta?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDel(false)}
                    className="flex-1 py-2 rounded-lg bg-well text-dim text-sm hover:text-ink transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => onDelete(meta.id)}
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
