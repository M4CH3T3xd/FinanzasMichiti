import {
  Tag, Tv, Music, Wifi, Phone, Zap, Flame, Droplets, Dumbbell,
  Laptop, Shield, Landmark, Home, Car, Gamepad2, CreditCard,
  Heart, BookOpen, Briefcase, ShoppingBag, Globe, Cloud, Package,
} from 'lucide-react'

export const SERVICE_ICONS = [
  { key: 'tv',        Icon: Tv },
  { key: 'music',     Icon: Music },
  { key: 'wifi',      Icon: Wifi },
  { key: 'phone',     Icon: Phone },
  { key: 'globe',     Icon: Globe },
  { key: 'cloud',     Icon: Cloud },
  { key: 'zap',       Icon: Zap },
  { key: 'flame',     Icon: Flame },
  { key: 'droplets',  Icon: Droplets },
  { key: 'dumbbell',  Icon: Dumbbell },
  { key: 'laptop',    Icon: Laptop },
  { key: 'shield',    Icon: Shield },
  { key: 'landmark',  Icon: Landmark },
  { key: 'home',      Icon: Home },
  { key: 'car',       Icon: Car },
  { key: 'gamepad',   Icon: Gamepad2 },
  { key: 'credit',    Icon: CreditCard },
  { key: 'heart',     Icon: Heart },
  { key: 'book',      Icon: BookOpen },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'shopping',  Icon: ShoppingBag },
  { key: 'package',   Icon: Package },
  { key: 'tag',       Icon: Tag },
]

export const DEFAULT_SERVICE_CATS = [
  { name: 'Streaming',    icon: 'tv',       color: '#e11d48' },
  { name: 'Música',       icon: 'music',    color: '#8b5cf6' },
  { name: 'Internet',     icon: 'wifi',     color: '#3b82f6' },
  { name: 'Telefonía',    icon: 'phone',    color: '#10b981' },
  { name: 'Electricidad', icon: 'zap',      color: '#f59e0b' },
  { name: 'Gas',          icon: 'flame',    color: '#f97316' },
  { name: 'Agua',         icon: 'droplets', color: '#06b6d4' },
  { name: 'Gimnasio',     icon: 'dumbbell', color: '#84cc16' },
  { name: 'Software',     icon: 'laptop',   color: '#7c6af7' },
  { name: 'Seguros',      icon: 'shield',   color: '#64748b' },
  { name: 'Banco',        icon: 'landmark', color: '#0ea5e9' },
  { name: 'Otro',         icon: 'tag',      color: '#94a3b8' },
]

const SC_KEY = 'service_category_meta'

export function getCustomServiceCats() {
  try { return JSON.parse(localStorage.getItem(SC_KEY) || '[]') } catch { return [] }
}
export function saveCustomServiceCat(cat) {
  const prev = getCustomServiceCats()
  if (!prev.find(c => c.name === cat.name))
    localStorage.setItem(SC_KEY, JSON.stringify([...prev, cat]))
}
export function deleteCustomServiceCat(name) {
  localStorage.setItem(SC_KEY, JSON.stringify(getCustomServiceCats().filter(c => c.name !== name)))
}
export function getServiceIcon(key) {
  return SERVICE_ICONS.find(i => i.key === key)?.Icon ?? Tag
}
export function getServiceCatMeta(name) {
  const def    = DEFAULT_SERVICE_CATS.find(c => c.name === name)
  if (def) return def
  const custom = getCustomServiceCats().find(c => c.name === name)
  if (custom) return custom
  return { name, icon: 'tag', color: '#94a3b8' }
}
