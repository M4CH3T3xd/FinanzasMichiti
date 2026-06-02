import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { Plus, X, Trash2 } from 'lucide-react'
import {
  usePresupuestos, useUpsertPresupuesto, useDeletePresupuesto,
  useTransacciones,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import {
  getCategoryMeta, DEFAULT_CATEGORIES_EXPENSE, getCustomCategories,
  saveCustomCategoryMeta, deleteCustomCategory, ICON_OPTIONS, COLOR_OPTIONS,
} from '../lib/categoryMeta'

const now  = new Date()
const from = format(startOfMonth(now), 'yyyy-MM-dd')
const to   = format(endOfMonth(now),   'yyyy-MM-dd')

function barColor(pct) {
  if (pct >= 100) return 'bg-expense'
  if (pct >= 80)  return 'bg-yellow-400'
  return 'bg-income'
}

function pctColor(pct) {
  if (pct >= 100) return 'text-expense'
  if (pct >= 80)  return 'text-yellow-400'
  return 'text-income'
}

export default function Presupuestos() {
  const { format: fmt } = useCurrency()
  const { toast } = useToast()
  const [modal, setModal] = useState(null) // null | { presupuesto? }

  const { data: presupuestos = [], isLoading } = usePresupuestos()
  const { data: txMes = [] } = useTransacciones({ from, to, tipo: 'gasto' })
  const upsertMut = useUpsertPresupuesto()
  const deleteMut = useDeletePresupuesto()

  // Gasto real del mes por categoría
  const gastoPorCategoria = useMemo(() => {
    const map = {}
    txMes.forEach(t => {
      map[t.categoria] = (map[t.categoria] || 0) + +t.monto
    })
    return map
  }, [txMes])

  // Presupuestos enriquecidos con progreso
  const items = useMemo(() =>
    presupuestos
      .map(p => {
        const gastado = gastoPorCategoria[p.categoria] || 0
        const pct     = p.limite > 0 ? (gastado / p.limite) * 100 : 0
        return { ...p, gastado, pct }
      })
      .sort((a, b) => b.pct - a.pct),
    [presupuestos, gastoPorCategoria]
  )

  const totalLimite  = items.reduce((s, p) => s + +p.limite, 0)
  const totalGastado = items.reduce((s, p) => s + p.gastado, 0)
  const totalPct     = totalLimite > 0 ? (totalGastado / totalLimite) * 100 : 0

  const handleSave = async (data) => {
    try {
      await upsertMut.mutateAsync(data)
      toast('Presupuesto guardado', 'success')
      setModal(null)
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteMut.mutateAsync(id)
      toast('Presupuesto eliminado', 'success')
      setModal(null)
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-ink">Presupuestos</h1>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      {/* Resumen del mes */}
      {items.length > 0 && (
        <div className="bg-panel border border-line rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-dim">Gasto total del mes</p>
            <p className={`text-xs font-semibold ${pctColor(totalPct)}`}>
              {totalPct.toFixed(0)}%
            </p>
          </div>
          <div className="h-2 bg-well rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${barColor(totalPct)}`}
              style={{ width: `${Math.min(totalPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-dim">
            <span>{fmt(totalGastado)} gastado</span>
            <span>{fmt(totalLimite)} presupuestado</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && <p className="text-dim text-sm text-center py-16">Cargando...</p>}

      {/* Estado vacío */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin presupuestos configurados</p>
          <button
            onClick={() => setModal({})}
            className="mt-3 text-brand-500 text-sm hover:underline"
          >
            + Crear el primero
          </button>
        </div>
      )}

      {/* Lista */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(p => {
            const meta = getCategoryMeta(p.categoria)
            const Icon = meta.icon
            const pctClamped = Math.min(p.pct, 100)

            return (
              <div
                key={p.id}
                onClick={() => setModal({ presupuesto: p })}
                className="bg-panel border border-line rounded-xl p-4 cursor-pointer hover:border-brand-500/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: meta.color + '22', color: meta.color }}
                    >
                      <Icon size={15} />
                    </span>
                    <p className="text-sm font-medium text-ink truncate">{p.categoria}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${pctColor(p.pct)}`}>
                      {p.pct.toFixed(0)}%
                    </p>
                    <p className="text-xs text-dim">{fmt(p.gastado)} / {fmt(p.limite)}</p>
                  </div>
                </div>
                <div className="h-1.5 bg-well rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor(p.pct)}`}
                    style={{ width: `${pctClamped}%` }}
                  />
                </div>
                {p.pct >= 100 && (
                  <p className="text-[10px] text-expense mt-1.5">
                    Superado por {fmt(p.gastado - p.limite)}
                  </p>
                )}
                {p.pct >= 80 && p.pct < 100 && (
                  <p className="text-[10px] text-yellow-400 mt-1.5">
                    Quedan {fmt(p.limite - p.gastado)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <PresupuestoModal
          presupuesto={modal.presupuesto ?? null}
          categoriasUsadas={presupuestos.map(p => p.categoria)}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          saving={upsertMut.isPending}
          deleting={deleteMut.isPending}
        />
      )}
    </div>
  )
}

// ── Dropdown nueva categoría de presupuesto (portal) ─────────────────────────
function NewBudgetCatDropdown({ anchorRef, open, onClose, onCrear }) {
  const [name,  setName]  = useState('')
  const [icon,  setIcon]  = useState('tag')
  const [color, setColor] = useState('#7c6af7')
  const [pos,   setPos]   = useState({ top: 0, left: 0, w: 288 })

  useEffect(() => {
    if (!open || !anchorRef.current) return
    const r  = anchorRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pad = 8
    const w   = Math.min(288, vw - pad * 2)
    const estimatedH = 340
    let left = r.left
    let top  = r.bottom + 6
    if (left + w > vw - pad) left = vw - w - pad
    if (left < pad)          left = pad
    if (top + estimatedH > vh - pad) top = Math.max(pad, r.top - estimatedH - 6)
    setPos({ top, left, w })
  }, [open])

  const handleCrear = () => {
    const n = name.trim()
    if (!n) return
    saveCustomCategoryMeta(n, icon, color)
    onCrear(n)
    setName(''); setIcon('tag'); setColor('#7c6af7')
  }

  if (!open) return null
  return createPortal(
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <div
        className="dropdown-bouncy fixed z-[999] bg-panel border border-line rounded-xl shadow-2xl p-3 space-y-3 overflow-y-auto"
        style={{ top: pos.top, left: pos.left, width: pos.w, maxHeight: '80vh' }}
      >
        <input
          type="text" placeholder="Nombre de la categoría"
          value={name} onChange={e => setName(e.target.value)} autoFocus
          className="w-full bg-well border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500"
        />
        <div>
          <p className="text-xs text-dim mb-1.5">Ícono</p>
          <div className="flex flex-wrap gap-1.5">
            {ICON_OPTIONS.map(({ key, icon: I }) => (
              <button key={key} type="button" onClick={() => setIcon(key)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  icon === key ? 'bg-brand-500/20 text-brand-500 border border-brand-500/50' : 'bg-well border border-line text-dim hover:text-ink'
                }`}
              ><I size={14} /></button>
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
            className="px-3 py-1.5 text-xs text-dim bg-well border border-line rounded-lg hover:text-ink">Cancelar</button>
          <button type="button" onClick={handleCrear} disabled={!name.trim()}
            className="px-3 py-1.5 text-xs text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">Crear</button>
        </div>
      </div>
    </>,
    document.body
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function PresupuestoModal({ presupuesto, categoriasUsadas, onSave, onDelete, onClose, saving, deleting }) {
  const [customCats,  setCustomCats]  = useState(() => getCustomCategories())
  const [showNewCat,  setShowNewCat]  = useState(false)
  const nuevaBtnRef = useRef(null)

  const allCats = [...DEFAULT_CATEGORIES_EXPENSE, ...customCats.filter(c => !DEFAULT_CATEGORIES_EXPENSE.includes(c))]
  const catsDisponibles = presupuesto ? allCats : allCats.filter(c => !categoriasUsadas.includes(c))

  const [categoria,  setCategoria]  = useState(presupuesto?.categoria || '')
  const [limite,     setLimite]     = useState(presupuesto?.limite?.toString() || '')
  const [confirmDel, setConfirmDel] = useState(false)

  const handleDeleteCat = (name) => {
    deleteCustomCategory(name)
    setCustomCats(getCustomCategories())
    if (categoria === name) setCategoria('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!categoria || !limite) return
    onSave({ categoria, limite: parseFloat(limite) })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[85vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-semibold">
            {presupuesto ? 'Editar presupuesto' : 'Nuevo presupuesto'}
          </h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Categoría */}
          <div>
            <label className="text-xs text-dim mb-2 block">Categoría</label>
            {presupuesto ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-well border border-line rounded-xl">
                {(() => { const meta = getCategoryMeta(presupuesto.categoria); const Icon = meta.icon; return <><Icon size={14} style={{ color: meta.color }} /><span className="text-sm text-ink">{presupuesto.categoria}</span></> })()}
              </div>
            ) : catsDisponibles.length === 0 && !showNewCat ? (
              <p className="text-xs text-dim py-2">Todas las categorías ya tienen presupuesto.</p>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {catsDisponibles.map(c => {
                  const meta     = getCategoryMeta(c)
                  const Icon     = meta.icon
                  const isCustom = !DEFAULT_CATEGORIES_EXPENSE.includes(c)
                  return (
                    <button key={c} type="button" onClick={() => setCategoria(c)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        categoria === c ? 'border-brand-500 bg-brand-500/10 text-ink' : 'border-line bg-well text-dim hover:border-brand-500/40 hover:text-ink'
                      }`}
                    >
                      <Icon size={12} style={{ color: meta.color }} />
                      {c}
                      {isCustom && (
                        <span onClick={e => { e.stopPropagation(); handleDeleteCat(c) }}
                          className="ml-0.5 text-dim hover:text-expense transition-colors">
                          <X size={10} />
                        </span>
                      )}
                    </button>
                  )
                })}
                <button ref={nuevaBtnRef} type="button" onClick={() => setShowNewCat(v => !v)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                    showNewCat ? 'border-brand-500 bg-brand-500/10 text-brand-500' : 'border-dashed border-line text-dim hover:border-brand-500/40 hover:text-ink'
                  }`}
                >
                  <Plus size={11} /> Nueva
                </button>
                <NewBudgetCatDropdown
                  anchorRef={nuevaBtnRef}
                  open={showNewCat}
                  onClose={() => setShowNewCat(false)}
                  onCrear={(name) => {
                    setCustomCats(getCustomCategories())
                    setCategoria(name)
                    setShowNewCat(false)
                  }}
                />
              </div>
            )}
          </div>

          {/* Límite */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Límite mensual</label>
            <input
              type="number" inputMode="decimal" placeholder="0"
              value={limite} onChange={e => setLimite(e.target.value)}
              required min="1" step="any"
              className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button type="submit" disabled={saving || !categoria || !limite}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        {/* Eliminar */}
        {presupuesto && (
          <div className="mt-4 pt-4 border-t border-line">
            {confirmDel ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(false)}
                  className="flex-1 py-2 rounded-xl bg-well text-dim text-sm hover:text-ink transition-colors">
                  Cancelar
                </button>
                <button onClick={() => onDelete(presupuesto.id)} disabled={deleting}
                  className="flex-1 py-2 rounded-xl bg-expense text-white text-sm font-semibold disabled:opacity-50">
                  {deleting ? 'Eliminando...' : 'Confirmar'}
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="flex items-center gap-1.5 text-sm text-dim hover:text-expense transition-colors"
              >
                <Trash2 size={14} /> Eliminar presupuesto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
