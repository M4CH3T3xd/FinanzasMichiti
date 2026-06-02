import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, isToday, isYesterday } from 'date-fns'
import { es } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Wallet, ArrowRight, Clock, AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTransacciones, usePresupuestos, useServicios } from '../hooks/queries'
import { useCurrency } from '../context/CurrencyContext'
import { getCategoryMeta } from '../lib/categoryMeta'
import { daysUntilDue, isPaidThisMonth } from '../utils/serviceDates'

const now = new Date()
const mesActualFrom  = format(startOfMonth(now), 'yyyy-MM-dd')
const mesActualTo    = format(endOfMonth(now),   'yyyy-MM-dd')
const mesAntFrom     = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd')
const mesAntTo       = format(endOfMonth(subMonths(now, 1)),   'yyyy-MM-dd')

function relDate(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00')
  if (isToday(d))     return 'hoy'
  if (isYesterday(d)) return 'ayer'
  return format(d, "d MMM", { locale: es })
}

function pctChange(curr, prev) {
  if (!prev) return null
  return ((curr - prev) / prev * 100).toFixed(0)
}

export default function Dashboard() {
  const { format: fmt } = useCurrency()

  const { data: txActual   = [] } = useTransacciones({ from: mesActualFrom, to: mesActualTo })
  const { data: txAnterior = [] } = useTransacciones({ from: mesAntFrom,    to: mesAntTo    })
  const { data: ultimos    = [] } = useTransacciones({ limit: 5 })
  const { data: presupuestos = [] } = usePresupuestos()
  const { data: servicios    = [] } = useServicios()

  const ingresos    = useMemo(() => txActual.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0), [txActual])
  const gastos      = useMemo(() => txActual.filter(t => t.tipo === 'gasto').reduce((s, t) => s + +t.monto, 0),   [txActual])
  const ingresosAnt = useMemo(() => txAnterior.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0), [txAnterior])
  const gastosAnt   = useMemo(() => txAnterior.filter(t => t.tipo === 'gasto').reduce((s, t) => s + +t.monto, 0),   [txAnterior])
  const balance     = ingresos - gastos

  const donaData = useMemo(() => {
    const map = {}
    txActual.filter(t => t.tipo === 'gasto').forEach(t => {
      map[t.categoria] = (map[t.categoria] || 0) + +t.monto
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [txActual])

  const serviciosProximos = useMemo(() =>
    servicios
      .filter(s => s.activo && !isPaidThisMonth(s.ultimo_pago))
      .map(s => ({ ...s, dias: daysUntilDue(s.dia_vencimiento) }))
      .filter(s => s.dias !== null && s.dias <= 7)
      .sort((a, b) => a.dias - b.dias),
    [servicios]
  )

  const presupuestosCriticos = useMemo(() =>
    presupuestos
      .map(p => {
        const gastado = txActual
          .filter(t => t.tipo === 'gasto' && t.categoria === p.categoria)
          .reduce((s, t) => s + +t.monto, 0)
        return { ...p, gastado, pct: p.limite > 0 ? (gastado / p.limite * 100) : 0 }
      })
      .filter(p => p.pct > 0)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4),
    [presupuestos, txActual]
  )

  const mesLabel = format(now, "MMMM yyyy", { locale: es }).replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-ink mb-6">{mesLabel}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">

        {/* ── COLUMNA IZQUIERDA ── */}
        <div className="space-y-5">

          {/* Tarjetas resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="Ingresos"
              value={fmt(ingresos)}
              pct={pctChange(ingresos, ingresosAnt)}
              good={true}
              icon={<TrendingUp size={18} />}
              colorClass="text-income"
              bgClass="bg-income/10"
            />
            <SummaryCard
              label="Gastos"
              value={fmt(gastos)}
              pct={pctChange(gastos, gastosAnt)}
              good={false}
              icon={<TrendingDown size={18} />}
              colorClass="text-expense"
              bgClass="bg-expense/10"
            />
            <SummaryCard
              label="Balance"
              value={fmt(balance)}
              pct={null}
              good={balance >= 0}
              icon={<Wallet size={18} />}
              colorClass={balance >= 0 ? 'text-income' : 'text-expense'}
              bgClass={balance >= 0 ? 'bg-income/10' : 'bg-expense/10'}
            />
          </div>

          {/* Gráfico dona */}
          {donaData.length > 0 && (
            <div className="bg-panel border border-line rounded-xl p-4">
              <h2 className="text-sm font-semibold text-ink mb-3">Gastos por categoría</h2>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-52 h-48 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donaData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {donaData.map(entry => (
                          <Cell key={entry.name} fill={getCategoryMeta(entry.name).color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={v => fmt(v)}
                        contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8 }}
                        labelStyle={{ color: 'var(--ink)' }}
                        itemStyle={{ color: 'var(--dim)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  {donaData.map(entry => {
                    const meta = getCategoryMeta(entry.name)
                    const pct = gastos > 0 ? (entry.value / gastos * 100).toFixed(0) : 0
                    return (
                      <div key={entry.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: meta.color }} />
                          <span className="text-sm text-ink truncate">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-dim">{pct}%</span>
                          <span className="text-sm font-medium text-ink">{fmt(entry.value)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Últimos movimientos */}
          <div className="bg-panel border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">Últimos movimientos</h2>
              <Link to="/transacciones" className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>
            {ultimos.length === 0
              ? <p className="text-dim text-sm text-center py-6">Sin movimientos aún</p>
              : (
                <div className="space-y-3">
                  {ultimos.map(tx => {
                    const meta = getCategoryMeta(tx.categoria)
                    const Icon = meta.icon
                    return (
                      <div key={tx.id} className="flex items-center gap-3">
                        <span
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: meta.color + '22', color: meta.color }}
                        >
                          <Icon size={16} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink truncate">{tx.descripcion || tx.categoria}</p>
                          <p className="text-xs text-dim">{tx.categoria} · {relDate(tx.fecha)}</p>
                        </div>
                        <span className={`text-sm font-semibold flex-shrink-0 ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                          {tx.tipo === 'ingreso' ? '+' : '-'}{fmt(tx.monto)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div className="space-y-5">

          {/* Servicios próximos */}
          <div className="bg-panel border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={15} className="text-dim" />
              <h2 className="text-sm font-semibold text-ink">Servicios próximos</h2>
            </div>
            {serviciosProximos.length === 0
              ? <p className="text-dim text-sm text-center py-4">Sin vencimientos en 7 días</p>
              : (
                <div className="space-y-3">
                  {serviciosProximos.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{s.icono || '📋'}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-ink truncate">{s.nombre}</p>
                          <p className="text-xs text-dim">{fmt(s.monto)}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
                        s.dias === 0 ? 'bg-expense/20 text-expense' :
                        s.dias <= 2  ? 'bg-yellow-500/20 text-yellow-400' :
                                       'bg-brand-500/20 text-brand-500'
                      }`}>
                        {s.dias === 0 ? 'hoy' : `${s.dias}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )
            }
          </div>

          {/* Presupuestos críticos */}
          {presupuestosCriticos.length > 0 && (
            <div className="bg-panel border border-line rounded-xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={15} className="text-dim" />
                <h2 className="text-sm font-semibold text-ink">Presupuestos</h2>
              </div>
              <div className="space-y-4">
                {presupuestosCriticos.map(p => {
                  const meta  = getCategoryMeta(p.categoria)
                  const pctCl = Math.min(p.pct, 100)
                  const color = p.pct >= 90 ? 'var(--expense)' : p.pct >= 70 ? '#eab308' : meta.color
                  return (
                    <div key={p.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink">{p.categoria}</span>
                        <span style={{ color }}>{Math.round(p.pct)}%</span>
                      </div>
                      <div className="h-1.5 bg-well rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pctCl}%`, background: color }}
                        />
                      </div>
                      <p className="text-xs text-dim mt-1">{fmt(p.gastado)} de {fmt(p.limite)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, pct, good, icon, colorClass, bgClass }) {
  const pctNum = Number(pct)
  const isPositive = pctNum >= 0
  const isGoodChange = good ? isPositive : !isPositive
  return (
    <div className="bg-panel border border-line rounded-xl p-4 flex items-start gap-3">
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-dim mb-0.5">{label}</p>
        <p className="text-lg font-bold text-ink leading-tight truncate">{value}</p>
        {pct !== null && (
          <p className={`text-xs mt-0.5 ${isGoodChange ? 'text-income' : 'text-expense'}`}>
            {isPositive ? '+' : ''}{pct}% vs mes ant.
          </p>
        )}
      </div>
    </div>
  )
}
