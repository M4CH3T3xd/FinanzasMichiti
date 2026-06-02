import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Trash2, ChevronLeft, ChevronRight, X, CheckSquare, Check } from 'lucide-react'
import {
  useTransacciones, useAddTransaccion, useUpdateTransaccion, useDeleteTransaccion,
} from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import {
  getCategoryMeta, DEFAULT_CATEGORIES_EXPENSE, DEFAULT_CATEGORIES_INCOME,
  getCustomCategories, saveCustomCategoryMeta, ICON_OPTIONS, COLOR_OPTIONS,
} from '../lib/categoryMeta'

function fmtDate(fechaStr) {
  return format(new Date(fechaStr + 'T00:00:00'), "d MMM", { locale: es })
}

export default function Transacciones() {
  const { format: fmt } = useCurrency()
  const { toast } = useToast()

  const [mes, setMes]           = useState(new Date())
  const [tipoFiltro, setTipo]   = useState(null)
  const [catFiltro, setCat]     = useState('')
  const [selMode, setSelMode]   = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [modal, setModal]       = useState(null)
  const [confirmDel, setConfirm] = useState(false)

  const from = format(startOfMonth(mes), 'yyyy-MM-dd')
  const to   = format(endOfMonth(mes),   'yyyy-MM-dd')

  const filters = {
    from, to,
    ...(tipoFiltro ? { tipo: tipoFiltro } : {}),
    ...(catFiltro  ? { categoria: catFiltro } : {}),
  }

  const { data: txs = [], isLoading } = useTransacciones(filters)
  const addMut    = useAddTransaccion()
  const updateMut = useUpdateTransaccion()
  const deleteMut = useDeleteTransaccion()

  const ingresos = useMemo(() => txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0), [txs])
  const gastos   = useMemo(() => txs.filter(t => t.tipo === 'gasto' ).reduce((s, t) => s + +t.monto, 0), [txs])
  const balance  = ingresos - gastos

  const mesLabel   = format(mes, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())
  const esMesActual = format(mes, 'yyyy-MM') >= format(new Date(), 'yyyy-MM')

  const toggleSel = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const exitSel = () => { setSelMode(false); setSelected(new Set()) }

  const handleDelete = async () => {
    try {
      await Promise.all([...selected].map(id => deleteMut.mutateAsync(id)))
      toast(`${selected.size} transacción${selected.size > 1 ? 'es eliminadas' : ' eliminada'}`, 'success')
      exitSel()
    } catch { toast('Error al eliminar', 'error') }
    setConfirm(false)
  }

  const handleSave = async (data) => {
    try {
      if (modal.tx) {
        await updateMut.mutateAsync({ id: modal.tx.id, ...data })
        toast('Transacción actualizada', 'success')
      } else {
        await addMut.mutateAsync(data)
        // Navegar al mes de la transacción y limpiar filtros para que sea visible
        setMes(new Date(data.fecha + 'T00:00:00'))
        setTipo(null)
        setCat('')
        toast('Transacción agregada', 'success')
      }
      setModal(null)
    } catch { toast('Error al guardar', 'error') }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        {selMode ? (
          <>
            <span className="text-sm font-medium text-ink">
              {selected.size} seleccionada{selected.size !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              {selected.size > 0 && (
                <button
                  onClick={() => setConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-expense/20 text-expense text-sm rounded-lg hover:bg-expense/30 transition-colors"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
              <button
                onClick={exitSel}
                className="flex items-center gap-1 px-3 py-1.5 bg-well text-dim text-sm rounded-lg hover:text-ink transition-colors"
              >
                <X size={14} /> Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-ink">Transacciones</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setSelMode(true)}
                className="p-2 bg-well text-dim rounded-lg hover:text-ink transition-colors"
                title="Seleccionar para eliminar"
              >
                <CheckSquare size={18} />
              </button>
              <button
                onClick={() => {
                  const isCurrent = format(mes, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
                  const defaultDate = isCurrent
                    ? format(new Date(), 'yyyy-MM-dd')
                    : format(startOfMonth(mes), 'yyyy-MM-dd')
                  setModal({ tx: null, defaultDate })
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={16} /> Nueva
              </button>
            </div>
          </>
        )}
      </div>

      {/* Navegador de mes */}
      <div className="flex items-center justify-between bg-panel border border-line rounded-xl px-4 py-2.5 mb-4">
        <button onClick={() => setMes(m => subMonths(m, 1))} className="p-1 text-dim hover:text-ink transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-ink">{mesLabel}</span>
        <button
          onClick={() => setMes(m => addMonths(m, 1))}
          disabled={esMesActual}
          className="p-1 text-dim hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{ v: null, l: 'Todos' }, { v: 'ingreso', l: 'Ingresos' }, { v: 'gasto', l: 'Gastos' }].map(f => (
          <button
            key={String(f.v)}
            onClick={() => setTipo(f.v)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              tipoFiltro === f.v
                ? 'bg-brand-500 text-white'
                : 'bg-panel border border-line text-dim hover:text-ink'
            }`}
          >
            {f.l}
          </button>
        ))}
        {catFiltro && (
          <button
            onClick={() => setCat('')}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-brand-500/20 text-brand-500"
          >
            {catFiltro} <X size={12} />
          </button>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l: 'Ingresos', v: ingresos, c: 'text-income' },
          { l: 'Gastos',   v: gastos,   c: 'text-expense' },
          { l: 'Balance',  v: balance,  c: balance >= 0 ? 'text-income' : 'text-expense' },
        ].map(({ l, v, c }) => (
          <div key={l} className="bg-panel border border-line rounded-xl p-3 text-center">
            <p className="text-xs text-dim">{l}</p>
            <p className={`text-sm font-bold ${c}`}>{fmt(v)}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <p className="text-dim text-sm text-center py-16">Cargando...</p>
      ) : txs.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-dim text-sm">Sin transacciones este mes</p>
          <button onClick={() => setModal({ tx: null })} className="mt-3 text-brand-500 text-sm hover:underline">
            + Agregar la primera
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {txs.map(tx => {
            const meta = getCategoryMeta(tx.categoria)
            const Icon = meta.icon
            const isSel = selected.has(tx.id)
            return (
              <div
                key={tx.id}
                onClick={() => selMode ? toggleSel(tx.id) : setModal({ tx })}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  isSel ? 'bg-brand-500/10 border-brand-500/40' : 'bg-panel border-line hover:border-brand-500/30'
                }`}
              >
                {selMode && (
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSel ? 'bg-brand-500 border-brand-500' : 'border-dim'
                  }`}>
                    {isSel && <Check size={11} className="text-white" />}
                  </span>
                )}
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: meta.color + '22', color: meta.color }}
                >
                  <Icon size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{tx.descripcion || tx.categoria}</p>
                  <button
                    className="text-xs text-dim hover:text-brand-500 transition-colors text-left"
                    onClick={e => { e.stopPropagation(); setCat(tx.categoria); setTipo(null) }}
                  >
                    {tx.categoria}
                  </button>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-semibold ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {tx.tipo === 'ingreso' ? '+' : '-'}{fmt(tx.monto)}
                  </p>
                  <p className="text-xs text-dim">{fmtDate(tx.fecha)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmar eliminación */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-ink font-semibold mb-1">
              ¿Eliminar {selected.size} transacción{selected.size > 1 ? 'es' : ''}?
            </h3>
            <p className="text-dim text-sm mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-well text-dim text-sm font-medium hover:text-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-expense text-white text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {deleteMut.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar / editar */}
      {modal && (
        <TransaccionModal
          tx={modal.tx}
          defaultDate={modal.defaultDate}
          onSave={handleSave}
          onClose={() => setModal(null)}
          saving={addMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function TransaccionModal({ tx, defaultDate, onSave, onClose, saving }) {
  const [tipo,  setTipo]  = useState(tx?.tipo || 'gasto')
  const [monto, setMonto] = useState(tx?.monto?.toString() || '')
  const [cat,   setCat]   = useState(tx?.categoria   || '')
  const [desc,  setDesc]  = useState(tx?.descripcion || '')
  const [fecha, setFecha] = useState(tx?.fecha || defaultDate || format(new Date(), 'yyyy-MM-dd'))

  // Categorías custom (estado local sincronizado con localStorage)
  const [customCats, setCustomCats] = useState(() => getCustomCategories())

  // Form nueva categoría
  const [showNew,   setShowNew]   = useState(false)
  const [newName,   setNewName]   = useState('')
  const [newIcon,   setNewIcon]   = useState('tag')
  const [newColor,  setNewColor]  = useState('#7c6af7')

  const defaults = tipo === 'ingreso' ? DEFAULT_CATEGORIES_INCOME : DEFAULT_CATEGORIES_EXPENSE
  const allCats  = [...defaults, ...customCats.filter(c => !defaults.includes(c))]

  const handleCreateCat = () => {
    const name = newName.trim()
    if (!name) return
    saveCustomCategoryMeta(name, newIcon, newColor)
    setCustomCats(prev => prev.includes(name) ? prev : [...prev, name])
    setCat(name)
    setNewName('')
    setNewIcon('tag')
    setNewColor('#7c6af7')
    setShowNew(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!monto || !cat) return
    onSave({ tipo, monto: parseFloat(monto), categoria: cat, descripcion: desc, fecha })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-panel border border-line rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-5 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-ink font-semibold">{tx ? 'Editar transacción' : 'Nueva transacción'}</h2>
          <button onClick={onClose} className="text-dim hover:text-ink transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Toggle gasto / ingreso */}
          <div className="grid grid-cols-2 gap-1.5 bg-well rounded-xl p-1">
            {['gasto', 'ingreso'].map(t => (
              <button key={t} type="button"
                onClick={() => { setTipo(t); setCat('') }}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  tipo === t
                    ? t === 'gasto' ? 'bg-expense/20 text-expense' : 'bg-income/20 text-income'
                    : 'text-dim hover:text-ink'
                }`}
              >
                {t === 'gasto' ? 'Gasto' : 'Ingreso'}
              </button>
            ))}
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

          {/* Categoría */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {allCats.map(c => {
                const meta = getCategoryMeta(c)
                const Icon = meta.icon
                return (
                  <button key={c} type="button" onClick={() => setCat(c)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                      cat === c
                        ? 'border-brand-500 bg-brand-500/10 text-ink'
                        : 'border-line bg-well text-dim hover:border-brand-500/40 hover:text-ink'
                    }`}
                  >
                    <Icon size={13} style={{ color: meta.color }} />
                    {c}
                  </button>
                )
              })}
              {/* Botón nueva categoría */}
              <button type="button" onClick={() => setShowNew(v => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  showNew
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500'
                    : 'border-dashed border-line text-dim hover:border-brand-500/40 hover:text-ink'
                }`}
              >
                <Plus size={12} /> Nueva
              </button>
            </div>

            {/* Formulario inline nueva categoría */}
            {showNew && (
              <div className="mt-3 p-3 bg-well border border-line rounded-xl space-y-3">
                <input
                  type="text" placeholder="Nombre de la categoría"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500"
                  autoFocus
                />

                {/* Selector de ícono */}
                <div>
                  <p className="text-xs text-dim mb-1.5">Ícono</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ICON_OPTIONS.map(({ key, icon: Icon }) => (
                      <button key={key} type="button"
                        onClick={() => setNewIcon(key)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          newIcon === key
                            ? 'bg-brand-500/20 text-brand-500 border border-brand-500/50'
                            : 'bg-panel border border-line text-dim hover:text-ink'
                        }`}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de color */}
                <div>
                  <p className="text-xs text-dim mb-1.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-well' : 'hover:scale-110'}`}
                        style={{ background: c, ringColor: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Preview + confirmar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-dim">
                    {newName && (
                      <>
                        {(() => {
                          const Icon = ICON_OPTIONS.find(o => o.key === newIcon)?.icon
                          return Icon ? <Icon size={14} style={{ color: newColor }} /> : null
                        })()}
                        <span className="text-ink">{newName || 'Vista previa'}</span>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowNew(false)}
                      className="px-3 py-1.5 text-xs text-dim bg-panel border border-line rounded-lg hover:text-ink">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleCreateCat}
                      disabled={!newName.trim()}
                      className="px-3 py-1.5 text-xs text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
                      Crear
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">
              Descripción <span className="opacity-50">(opcional)</span>
            </label>
            <input
              type="text" placeholder="¿En qué fue?"
              value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="text-xs text-dim mb-1.5 block">Fecha</label>
            <input
              type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-ink focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <button type="submit"
            disabled={saving || !monto || !cat}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : tx ? 'Guardar cambios' : 'Agregar'}
          </button>
        </form>
      </div>
    </div>
  )
}
