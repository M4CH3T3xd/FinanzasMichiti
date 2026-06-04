import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CURRENCIES } from '../context/CurrencyContext'

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
      <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z" fill="#FF3D00"/>
      <path d="M24 46c5.5 0 10.5-1.9 14.3-5.1l-6.6-5.6C29.7 36.9 27 38 24 38c-6.1 0-10.7-4.1-11.8-9.5l-7 5.4C8.1 41.4 15.5 46 24 46z" fill="#4CAF50"/>
      <path d="M44.5 20H24v8.5h11.8c-.6 2.9-2.3 5.4-4.7 7.1l6.6 5.6C41.7 37.6 45 31.3 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
    </svg>
  )
}

export default function Login() {
  const [mode,     setMode]     = useState('login')
  const [step,     setStep]     = useState(1)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [currency, setCurrency] = useState('ARS')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const navigate = useNavigate()

  function switchMode(m) {
    setMode(m); setError(''); setSuccess(false); setConfirm(''); setStep(1)
  }

  async function handleLogin(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }))
      if (error) setError('Email o contraseña incorrectos')
      else navigate('/', { replace: true })
    } catch (err) {
      setError(err.message === 'timeout' ? 'El servidor tardó demasiado. Intenta de nuevo.' : 'Error al conectar')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError(''); setLoading(true)
    try {
      const { error } = await withTimeout(supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      }), 8000)
      if (error) { setError('Error al conectar con Google'); setLoading(false) }
      // Si no hay error, el navegador redirige a Google — loading queda true intencionalmente
    } catch (err) {
      setError(err.message === 'timeout' ? 'El servidor tardó demasiado. Intenta de nuevo.' : 'Error al conectar con Google')
      setLoading(false)
    }
  }

  function handleNextStep(e) {
    e.preventDefault(); setError('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (password !== confirm) return setError('Las contraseñas no coinciden')
    setStep(2)
  }

  async function handleSignup(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        options: { data: { currency } },
      }))
      if (error) {
        setError(error.message)
        return
      }
      if (data.user) {
        await withTimeout(
          supabase.from('user_profiles').upsert(
            { id: data.user.id, email, role: 'usuario', currency },
            { onConflict: 'id' }
          ),
          8000
        )
        localStorage.setItem('currency', currency)
        setSuccess(true)
      }
    } catch (err) {
      setError(err.message === 'timeout' ? 'El servidor tardó demasiado. Intenta de nuevo.' : err.message ?? 'Error al crear cuenta')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-8xl">✅</div>
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-ink">¡Cuenta creada!</h2>
            <div className="bg-panel border border-line rounded-2xl p-5">
              <p className="text-lg font-semibold text-ink mb-1">Verifica tu correo</p>
              <p className="text-dim">
                Te enviamos un enlace de confirmación a
              </p>
              <p className="text-brand-500 font-semibold mt-1 break-all">{email}</p>
              <p className="text-dim text-sm mt-3">
                Revisa también la carpeta de spam si no lo ves.
              </p>
            </div>
          </div>
          <button
            onClick={() => switchMode('login')}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 rounded-xl transition-colors text-lg"
          >
            Ir al inicio de sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-canvas">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-ink">Finanzas Personal</h1>
          <p className="text-dim text-sm mt-1">Controla tu dinero, sin complicaciones</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-well rounded-xl p-1 mb-6">
          {[['login', 'Ingresar'], ['signup', 'Registrarse']].map(([m, label]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-panel text-ink shadow-sm' : 'text-dim hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <div className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs text-dim mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="tu@email.com"
                  className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-dim mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required autoComplete="current-password" placeholder="••••••••"
                    className="w-full bg-well border border-line rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                  <p className="text-expense text-sm text-center">{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Cargando...' : 'Ingresar'}
              </button>
            </form>

            <Divider />

            <button
              onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-panel border border-line hover:border-brand-500/40 text-ink font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </div>
        )}

        {/* ── SIGNUP paso 1 ── */}
        {mode === 'signup' && step === 1 && (
          <div className="space-y-4">
            <form onSubmit={handleNextStep} className="space-y-3">
              <div>
                <label className="block text-xs text-dim mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="tu@email.com"
                  className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-dim mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required autoComplete="new-password" placeholder="Mínimo 6 caracteres"
                    className="w-full bg-well border border-line rounded-xl px-4 py-3 pr-11 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ink">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-dim mb-1.5">Confirmar contraseña</label>
                <input
                  type={showPass ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required autoComplete="new-password" placeholder="Repite la contraseña"
                  className="w-full bg-well border border-line rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
              {error && (
                <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                  <p className="text-expense text-sm text-center">{error}</p>
                </div>
              )}
              <button type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl transition-colors">
                Siguiente →
              </button>
            </form>

            <Divider />

            <button
              onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-panel border border-line hover:border-brand-500/40 text-ink font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <GoogleIcon />
              Registrarse con Google
            </button>
            <p className="text-center text-xs text-dim">
              Te pediremos elegir tu moneda al ingresar por primera vez.
            </p>
          </div>
        )}

        {/* ── SIGNUP paso 2: moneda ── */}
        {mode === 'signup' && step === 2 && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-ink font-semibold">¿Cuál es tu moneda?</p>
              <p className="text-dim text-xs mt-1">
                Todos tus montos se guardarán en esta moneda. Puedes ver equivalencias después.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code} type="button" onClick={() => setCurrency(c.code)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                    currency === c.code
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-line hover:border-dim bg-well'
                  }`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="min-w-0">
                    <p className="text-ink text-xs font-semibold">{c.code}</p>
                    <p className="text-dim text-xs truncate">{c.name}</p>
                  </div>
                </button>
              ))}
            </div>
            {error && (
              <div className="bg-expense/10 border border-expense/20 rounded-xl px-4 py-2.5">
                <p className="text-expense text-sm text-center">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)}
                className="flex-1 bg-well hover:bg-panel text-dim py-3 rounded-xl font-medium transition-colors">
                ← Atrás
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors">
                {loading ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-line" />
      <span className="text-xs text-dim">o</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}
