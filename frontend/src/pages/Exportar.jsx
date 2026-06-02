import { useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useProfile } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export default function Exportar() {
  const { user } = useAuth()
  const { format: fmt } = useCurrency()
  const { data: profile } = useProfile()
  const { toast } = useToast()
  const [mes, setMes] = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading] = useState(false)

  const mesOpciones = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase()),
    }
  })

  const handleExport = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [year, month] = mes.split('-')
      const from = format(startOfMonth(new Date(+year, +month - 1)), 'yyyy-MM-dd')
      const to   = format(endOfMonth(new Date(+year, +month - 1)),   'yyyy-MM-dd')

      const { data: txs, error } = await supabase
        .from('transacciones')
        .select('*')
        .eq('user_id', user.id)
        .gte('fecha', from)
        .lte('fecha', to)
        .order('fecha', { ascending: true })
      if (error) throw error

      const ingresos = txs.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + +t.monto, 0)
      const gastos   = txs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + +t.monto, 0)
      const balance  = ingresos - gastos

      const mesLabel = mesOpciones.find(o => o.value === mes)?.label ?? mes
      const nombre   = profile?.nombre || profile?.apodo || user.email

      const doc = new jsPDF()

      // Encabezado
      doc.setFontSize(20)
      doc.setTextColor(40, 40, 60)
      doc.text('Resumen financiero', 14, 22)

      doc.setFontSize(11)
      doc.setTextColor(100, 100, 120)
      doc.text(`${nombre}  ·  ${mesLabel}`, 14, 30)

      doc.setDrawColor(200, 200, 220)
      doc.line(14, 34, 196, 34)

      // Resumen
      const rows = [
        ['Ingresos', fmt(ingresos), [0, 180, 100]],
        ['Gastos',   fmt(gastos),   [220, 60, 80]],
        ['Balance',  fmt(balance),  balance >= 0 ? [0, 180, 100] : [220, 60, 80]],
      ]
      rows.forEach(([label, value, color], i) => {
        doc.setFontSize(10)
        doc.setTextColor(80, 80, 100)
        doc.text(label, 14, 44 + i * 8)
        doc.setTextColor(...color)
        doc.text(value, 80, 44 + i * 8)
      })

      // Tabla
      autoTable(doc, {
        startY: 72,
        head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
        body: txs.map(t => [
          format(new Date(t.fecha + 'T00:00:00'), 'd MMM', { locale: es }),
          t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
          t.categoria,
          t.descripcion || '—',
          (t.tipo === 'ingreso' ? '+' : '-') + fmt(t.monto),
        ]),
        headStyles:          { fillColor: [124, 106, 247], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles:  { fillColor: [248, 248, 252] },
        columnStyles:        { 4: { halign: 'right' } },
        styles:              { fontSize: 9, cellPadding: 3 },
      })

      doc.save(`finanzas_${mes}.pdf`)
      toast('PDF exportado', 'success')
    } catch {
      toast('Error al exportar', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Exportar resumen</h1>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Download size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Generar PDF</h2>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-dim mb-1.5 block">Mes a exportar</label>
            <select
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="w-full bg-well border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-brand-500 transition-colors"
            >
              {mesOpciones.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <p className="text-xs text-dim">
            Genera un PDF con el resumen del mes: ingresos, gastos, balance y el listado completo de transacciones.
          </p>

          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 w-full justify-center"
          >
            <Download size={15} />
            {loading ? 'Generando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
