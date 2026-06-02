import { Settings, Palette } from 'lucide-react'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useTheme, THEMES } from '../context/ThemeContext'

export default function Ajustes() {
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Ajustes</h1>

      {/* Tema */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Palette size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Tema y apariencia</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`py-3 text-sm rounded-xl border transition-colors ${
                  theme === t.id
                    ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-semibold'
                    : 'border-line bg-well text-dim hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Moneda */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Settings size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Moneda principal</h2>
        </div>
        <div className="p-5">
          <p className="text-xs text-dim mb-4">
            Todos los montos de la app se mostrarán en esta moneda.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CURRENCIES.map(c => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border transition-colors ${
                  currency === c.code
                    ? 'border-brand-500 bg-brand-500/10 text-ink font-semibold'
                    : 'border-line bg-well text-dim hover:text-ink'
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
    </div>
  )
}
