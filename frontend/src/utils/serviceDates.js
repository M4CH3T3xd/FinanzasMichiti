import { format, isBefore, addMonths, setDate, startOfMonth } from 'date-fns'

export function nextDueDate(diaVencimiento) {
  if (!diaVencimiento) return null
  const today = new Date()
  const thisMonth = setDate(startOfMonth(today), diaVencimiento)
  return isBefore(today, thisMonth) ? thisMonth : setDate(startOfMonth(addMonths(today, 1)), diaVencimiento)
}

export function isPaidThisMonth(ultimoPago) {
  if (!ultimoPago) return false
  const pago = new Date(ultimoPago)
  const today = new Date()
  return pago.getMonth() === today.getMonth() && pago.getFullYear() === today.getFullYear()
}

export function formatDueDate(date) {
  if (!date) return ''
  return format(date, 'dd/MM/yyyy')
}

export function daysUntilDue(diaVencimiento) {
  const due = nextDueDate(diaVencimiento)
  if (!due) return null
  const diff = Math.ceil((due - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}
