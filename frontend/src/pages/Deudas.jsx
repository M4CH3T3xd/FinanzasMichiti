import { useState, useMemo } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, X, Check, Trash2, User } from 'lucide-react'
import {
  useDeudas, useAddDeuda, useUpdateDeuda, useDeleteDeuda,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { ICON_MAP, ICON_OPTIONS } from '../lib/categoryMeta'

function getDeudaIcon(key) {
  return ICON_MAP[key] || User
}

function VencimientoBadge({ fecha }) {
  if (!fecha) return null
  const d     = new Date(fecha + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = differenceInDays(d, today)
  if (diff < 0)  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-expense/20 text-expense">Vencida</span>
  if (diff === 0) return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-expense/20 text-expense">Hoy</span>
  if (diff <= 3)  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{diff}d</span>
  return <span className="text-[10px] text-dim">{format(d, 'd MMM', { locale: es })}</span>
}

function sortDeudas(list) {
  return [...list].sort((a, b) => {
    if (a.pagado !== b.pagado) return a.pagado ? 1 : -1
    if (a.vencimiento && b.vencimiento) return a.vencimiento.localeCompare(b.vencimiento)
    if (a.vencimiento) return -1
    if (b.vencimiento) return 1
    return 0
  })
}

export default function Deudas() {
  const { format: fmt } = useCurrency()
  const { toast }       = useToast()
  const [modal, setModal] = useState(null)

  const { data: deudas = [], isLoading } = useDeudas()
  const addMut    = useAddDeuda()
  const updateMut = useUpdateDeuda()
  const deleteMut = useDeleteDeuda()

  const debo    = useMemo(() => deudas.filter(d => d.tipo === 'debo'     && !d.pagado).reduce((s, d) => s + +d.monto, 0), [deudas])
  const meDeben = useMemo(() => deudas.filter(d => d.tipo === 'me_deben' && !d.pagado).reduce((s, d) => s + +d.monto, 0), [deudas])
  const listaDebo    = useMemo(() => sortDeudas(deudas.filter(d => d.tipo === 'debo')),     [deudas])
  const listaMeDeben = useMemo(() => sortDeudas(deudas.filter(d => d.tipo === 'me_deben')), [deudas])

  const handleTogglePagado = async (deuda) => {
    try { await updateMut.mutateAsync({ id: deuda.id, pagado: !deuda.pagado }) }
    catch { toast('Error al actualizar', 'error') }
  }

  const handleSave = async (data) => {
    try {
      if (modal?.deuda) {
        await updateMut.mutateAsync({ id: modal.deuda.id, ...data })
        toast('Deuda actualizada', 'success')
      } else {
        await addMut.mutateAsync(data)
        toast('Deuda agregada', 'success')
      }
      setModal(null)
    } catch { toast('Error al guardar', 'error') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id)
      toast('Deuda eliminada', 'success')
      setModal(null)
    } catch { toast('Error al eliminar', 'error') }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Deudas</h1>
        <button
          onClick={() => setModal({ new: true })}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Nueva
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Debo</p>
          <p className="text-xl font-bold text-expense">{fmt(debo)}</p>
          <p className="text-[10px] text-dim mt-1">{listaDebo.filter(d => !d.pagado).length} pendiente{listaDebo.filter(d => !d.pagado).length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-panel border border-line rounded-xl p-4">
          <p className="text-xs text-dim mb-1">Me deben</p>
          <p className="text-xl font-bold text-income">{fmt(meDeben)}</p>
          <p className="text-[10px] text-dim mt-1">{listaMeDeben.filter(d => !d.pagado).length} pendiente{listaMeDeben.filter(d => !d.pagado).length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {isLoading && <p className="text-dim text-sm text-center py-16">Cargando...</p>}

      {!isLoading && deudas.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin deudas registradas</p>
          <button onClick={() => setModal({ new: true })} className="mt-3 text-brand-500 text-sm hover:underline">
            + Agregar la primera
          </button>
        </div>
      )}

      {/* Sección: Debo */}
      {!isLoading && listaDebo.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Debo</h2>
          <div className="space-y-2">
            {listaDebo.map(d => (
              <DeudaItem key={d.id} deuda={d} fmt={fmt}
                onEdit={() => setModal({ deuda: d })}
                onToggle={() => handleTogglePagado(d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sección: Me deben */}
      {!isLoading && listaMeDeben.length > 0 && (
        <div className="mb-5">
          <h2 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Me deben</h2>
          <div className="space-y-2">
            {listaMeDeben.map(d => (
              <DeudaItem key={d.id} deuda={d} fmt={fmt}
                onEdit={() => setModal({ deuda: d })}
                onToggle={() => handleTogglePagado(d)}
              />
            ))}
          </div>
        </div>
      )}

      {modal && (
        <DeudaModal
          deuda={modal.deuda ?? null}
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

// ── Item ──────────────────────────────────────────────────────────────────────
function DeudaItem({ deuda, fmt, onEdit, onToggle }) {
  const Icon  = getDeudaIcon(deuda.icono)
  const color = deuda.tipo === 'debo' ? '#ff4d6d' : '#00e676'

  return (
    <div
      onClick={onEdit}
      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        deuda.pagado ? 'bg-panel border-line opacity-50' : 'bg-panel border-line hover:border-brand-500/30'
      }`}
    >
      <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: color + '22', color }}>
        <Icon size={16} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink truncate">{deuda.descripcion}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {deuda.pagado
            ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-income/20 text-income">Saldado</span>
            : <VencimientoBadge fecha={deuda.vencimiento} />
          }
        </div>
      </div>

      <p className={`text-sm font-semibold shrink-0 ${deuda.tipo === 'debo' ? 'text-expense' : 'text-income'}`}>
        {deuda.tipo === 'debo' ? '-' : '+'}{fmt(deuda.monto)}
      </p>

      <button
        onClick={e => { e.stopPropagation(); onToggle() }}
        title={deuda.pagado ? 'Marcar pendiente' : 'Marcar saldado'}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          deuda.pagado ? 'bg-income border-income' : 'border-dim hover:border-income'
        }`}
      >
        {deuda.pagado && <Check size={13} className="text-white" />}
      </button>
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function DeudaModal({ deuda, onSave, onDelete, onClose, saving, deleting }) {
  const [tipo,        setTipo]        = useState(deuda?.tipo        || 'debo')
  const [desc,        setDesc]        = useState(deuda?.descripcion || '')
  const [monto,       setMonto]       = useState(deuda?.monto?.toString() || '')
  const [icono,       setIcono]       = useState(deuda?.icono       || 'user')
  const [vencimiento, setVencimiento] = useState(deuda?.vencimiento || '')
  const [confirmDel,  setConfirmDel]  = useState(false)

  const PreviewIcon = getDeudaIcon(icono)
  const color = tipo === 'debo' ? '#ff4d6d' : '#00e676'

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!desc.trim() || !monto) return
    onSave({
      tipo,
      descripcion: desc.trim(),
      monto:       parseFloat(monto),
      icono:       icono || null,
      vencimiento: vencimiento || null,
      pagado:      deuda?.pagado ?? false,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-semibold">{deuda ? 'Editar deuda' : 'Nueva deuda'}</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Toggle Debo / Me deben */}
          <div className="grid grid-cols-2 gap-1.5 bg-well rounded-xl p-1">
            {[{ v: 'debo', l: 'Debo' }, { v: 'me_deben', l: 'Me deben' }].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => setTipo(v)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipo === v
                    ? v === 'debo' ? 'bg-expense/20 text-expense' : 'bg-income/20 text-income'
                    : 'text-dim hover:text-ink'
                }`}
              >{l}</button>
            ))}
          </div>

          {/* Ícono + descripción en una fila */}
          <div className="flex gap-3 items-start">
            {/* Preview del ícono seleccionado */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-5"
              style={{ background: color + '22', color }}>
              <PreviewIcon size={22} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-dim mb-1.5 block">Descripción</label>
              <input
                type="text" placeholder="¿A quién / por qué?"
                value={desc} onChange={e => setDesc(e.target.value)} required
                className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {/* Selector de ícono */}
          <div>
            <label className="text-xs text-dim mb-2 block">Ícono</label>
            <div className="flex flex-wrap gap-1.5">
              {[{ key: 'user', icon: User }, ...ICON_OPTIONS].map(({ key, icon: I }) => (
                <button key={key} type="button" onClick={() => setIcono(key)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    icono === key
                      ? 'ring-2 ring-offset-1 ring-offset-panel'
                      : 'bg-well border border-line text-dim hover:text-ink'
                  }`}
                  style={icono === key ? { color, background: color + '22', ringColor: color } : {}}
                >
                  <I size={15} />
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Monto</label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={monto} onChange={e => setMonto(e.target.value)}
              required min="0.01" step="any"
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Vencimiento */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Fecha de vencimiento <span className="opacity-50">(opcional)</span>
            </label>
            <input
              type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button type="submit" disabled={saving || !desc.trim() || !monto}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : deuda ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>

        {deuda && (
          <div className="mt-3">
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-expense text-sm rounded-xl hover:bg-expense/10 transition-colors">
                <Trash2 size={15} /> Eliminar deuda
              </button>
            ) : (
              <div className="bg-expense/10 border border-expense/30 rounded-xl p-3 space-y-2">
                <p className="text-sm text-ink text-center">¿Eliminar esta deuda?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDel(false)}
                    className="flex-1 py-2 rounded-lg bg-well text-dim text-sm hover:text-ink transition-colors">Cancelar</button>
                  <button onClick={() => onDelete(deuda.id)} disabled={deleting}
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
