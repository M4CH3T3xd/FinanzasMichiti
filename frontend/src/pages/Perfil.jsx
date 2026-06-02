import { useState, useRef, useEffect } from 'react'
import { User, Palette, Camera, Save, RefreshCw, LogOut } from 'lucide-react'
import { useProfile, useUpdateProfile } from '../hooks/queries'
import { useAuth } from '../context/AuthContext'
import { useCurrency, CURRENCIES } from '../context/CurrencyContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export default function Perfil() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const { currency, setCurrency } = useCurrency()
  const { data: profile } = useProfile()
  const updateMut = useUpdateProfile()

  const [nombre, setNombre] = useState('')
  const [apodo,  setApodo]  = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre     || '')
      setApodo(profile.apodo       || '')
      setAvatarUrl(profile.avatar_url || null)
    }
  }, [profile?.id])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
      const urlFinal = `${publicUrl}?t=${Date.now()}`
      await updateMut.mutateAsync({ avatar_url: urlFinal })
      setAvatarUrl(urlFinal)
      toast('Avatar actualizado', 'success')
    } catch {
      toast('Error al subir la imagen', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ nombre: nombre.trim(), apodo: apodo.trim() })
      toast('Perfil guardado', 'success')
    } catch {
      toast('Error al guardar', 'error')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-ink">Mi perfil</h1>

      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <User size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Datos personales</h2>
        </div>

        <div className="p-5 space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <User size={28} className="text-brand-500" />
                }
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {uploading
                  ? <RefreshCw size={11} className="text-white animate-spin" />
                  : <Camera size={11} className="text-white" />
                }
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink truncate">{profile?.nombre || 'Sin nombre'}</p>
              <p className="text-xs text-dim truncate">{user?.email}</p>
            </div>
          </div>

          {/* Nombre y apodo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dim mb-1.5 block">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-well border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-dim mb-1.5 block">Apodo</label>
              <input
                type="text"
                value={apodo}
                onChange={e => setApodo(e.target.value)}
                placeholder="Cómo te llaman"
                className="w-full bg-well border border-line rounded-xl px-3 py-2.5 text-sm text-ink placeholder-dim focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {updateMut.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Tema */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
          <Palette size={16} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-ink">Apariencia</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-dim mb-3">Tema</p>
            <div className="grid grid-cols-4 gap-2">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`py-2 text-sm rounded-xl border transition-colors ${
                    theme === t.id
                      ? 'border-brand-500 bg-brand-500/10 text-brand-500 font-medium'
                      : 'border-line bg-well text-dim hover:text-ink'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-dim mb-3">Moneda principal</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
                    currency === c.code
                      ? 'border-brand-500 bg-brand-500/10 text-ink font-medium'
                      : 'border-line bg-well text-dim hover:text-ink'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-dim hover:text-expense transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
