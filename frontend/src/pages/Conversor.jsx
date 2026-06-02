import { useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'

export default function Conversor() {
  const { rates } = useCurrency()
  const [monto,   setMonto]   = useState('')
  const [fromCur, setFromCur] = useState('USD')
  const [toCur,   setToCur]   = useState('ARS')

  const resultado = (() => {
    if (!rates || !monto || isNaN(+monto)) return null
    return (+monto / (rates[fromCur] ?? 1)) * (rates[toCur] ?? 1)
  })()

  const tasa = rates
    ? (rates[toCur] ?? 1) / (rates[fromCur] ?? 1)
    : null

  const fmtResult = (n) => {
    if (n == null) return '—'
    const cur = CURRENCIES.find(c => c.code === toCur)
    const decimals = ['CLP', 'ARS', 'BRL', 'UYU'].includes(toCur) ? 0 : 2
    return `${cur?.symbol ?? ''}${n.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
  }

  const swap = () => { setFromCur(toCur); setToCur(fromCur) }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Conversor de divisas</h1>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <ArrowLeftRight size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Equivalencias de moneda</h2>
          {rates && <span className="ml-auto text-xs text-dim">Tasas en tiempo real</span>}
        </div>

        <div className="p-5 space-y-4">

          <div>
            <label className="text-xs text-dim mb-1.5 block">Monto a convertir</label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className="flex-1 bg-well border border-line rounded-xl px-4 py-3 text-ink text-2xl font-bold placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
              />
              <select
                value={fromCur}
                onChange={e => setFromCur(e.target.value)}
                className="bg-well border border-line rounded-xl px-3 text-sm text-ink focus:outline-none focus:border-brand-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
          </div>

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

          <div>
            <label className="text-xs text-dim mb-1.5 block">Resultado</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-well border border-line rounded-xl px-4 py-3">
                <p className="text-2xl font-bold text-income">{fmtResult(resultado)}</p>
              </div>
              <select
                value={toCur}
                onChange={e => setToCur(e.target.value)}
                className="bg-well border border-line rounded-xl px-3 text-sm text-ink focus:outline-none focus:border-brand-500"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
            </div>
          </div>

          {tasa != null && (
            <p className="text-xs text-dim text-center">
              1 {fromCur} = {tasa.toLocaleString('es-AR', { maximumFractionDigits: 4 })} {toCur}
            </p>
          )}

          {/* Tabla de todas las tasas vs fromCur */}
          <div className="mt-2 pt-4 border-t border-line">
            <p className="text-xs text-dim mb-3">Equivalencias de 1 {fromCur}</p>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.filter(c => c.code !== fromCur).map(c => {
                const rate = rates ? (rates[c.code] ?? 1) / (rates[fromCur] ?? 1) : null
                const decimals = ['CLP', 'ARS', 'BRL', 'UYU'].includes(c.code) ? 0 : 4
                return (
                  <div key={c.code} className="flex items-center justify-between bg-well rounded-xl px-3 py-2">
                    <span className="text-sm text-dim">{c.flag} {c.code}</span>
                    <span className="text-sm font-medium text-ink">
                      {rate != null
                        ? rate.toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
                        : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
