import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useSettings } from './SettingsContext'

const CurrencyContext = createContext()

export const CURRENCIES = [
  { code: 'CLP', symbol: '$',   name: 'Peso Chileno',    flag: '🇨🇱', locale: 'es-CL' },
  { code: 'PEN', symbol: 'S/',  name: 'Sol Peruano',     flag: '🇵🇪', locale: 'es-PE' },
  { code: 'USD', symbol: 'US$', name: 'Dólar',           flag: '🇺🇸', locale: 'en-US' },
  { code: 'ARS', symbol: '$',   name: 'Peso Argentino',  flag: '🇦🇷', locale: 'es-AR' },
  { code: 'EUR', symbol: '€',   name: 'Euro',            flag: '🇪🇺', locale: 'es-ES' },
  { code: 'BRL', symbol: 'R$',  name: 'Real Brasileño',  flag: '🇧🇷', locale: 'pt-BR' },
  { code: 'UYU', symbol: '$',   name: 'Peso Uruguayo',   flag: '🇺🇾', locale: 'es-UY' },
]

const CACHE_KEY = 'fx_rates'
const CACHE_TTL = 3_600_000

async function fetchRates() {
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached) {
    const { rates, ts } = JSON.parse(cached)
    if (Date.now() - ts < CACHE_TTL) return rates
  }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    const data = await res.json()
    if (data.result === 'success') {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: data.rates, ts: Date.now() }))
      return data.rates
    }
  } catch (_) {}
  return { ARS: 1050, USD: 1, CLP: 890, UYU: 38, PEN: 3.72, EUR: 0.92, BRL: 5.1 }
}

export function CurrencyProvider({ children }) {
  const { isPrivate } = useSettings()
  const [currency,        setCurrencyState]    = useState(() => localStorage.getItem('currency') || 'CLP')
  const [rates,           setRates]            = useState(null)
  const [currencyPending, setCurrencyPending]  = useState(false)

  useEffect(() => { fetchRates().then(setRates) }, [])

  useEffect(() => {
    async function syncFromProfile(session) {
      if (!session?.user) return

      const isGoogle     = session.user.app_metadata?.provider === 'google'
      const confirmedKey = `currency_ok_${session.user.id}`
      const confirmed    = !!localStorage.getItem(confirmedKey)

      const { data } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', session.user.id)
        .single()

      if (!data) {
        // Usuario nuevo — crear perfil con CLP por defecto
        await supabase.from('user_profiles').insert({
          id:       session.user.id,
          email:    session.user.email,
          role:     'usuario',
          currency: 'CLP',
        })
        setCurrencyState('CLP')
        localStorage.setItem('currency', 'CLP')
        // Si es Google, mostrar picker de moneda
        if (isGoogle && !confirmed) setCurrencyPending(true)
        return
      }

      setCurrencyState(data.currency)
      localStorage.setItem('currency', data.currency)

      // Usuario Google existente que nunca confirmó su moneda
      if (isGoogle && !confirmed) setCurrencyPending(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => syncFromProfile(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      syncFromProfile(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const setCurrency = useCallback(async (code) => {
    setCurrencyState(code)
    localStorage.setItem('currency', code)
    setCurrencyPending(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('user_profiles').update({ currency: code }).eq('id', user.id)
      // Marcar moneda como confirmada para no volver a preguntar
      localStorage.setItem(`currency_ok_${user.id}`, '1')
    }
  }, [])

  const format = useCallback(
    (amount) => {
      if (amount == null) return ''
      if (isPrivate) return '••••'
      const cur = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0]
      const decimals = ['CLP', 'ARS', 'BRL', 'UYU'].includes(currency) ? 0 : 2
      return `${cur.symbol}${Math.abs(amount).toLocaleString(cur.locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`
    },
    [currency, isPrivate]
  )

  const convert = useCallback(
    (amount, toCurrency) => {
      if (!rates || !amount) return null
      const rateBase = rates[currency] ?? 1
      const rateTarget = rates[toCurrency] ?? 1
      return (amount / rateBase) * rateTarget
    },
    [rates, currency]
  )

  const getCurrency = useCallback(
    () => CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0],
    [currency]
  )

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, format, convert, getCurrency, currencyPending }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
