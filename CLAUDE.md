# FinanzasMichiti — Contexto del proyecto

Refactor completo de AppFinanzas con mejores prácticas. Sin Docker, deploy a Vercel.

## Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS v4
- **Data fetching**: TanStack React Query v5
- **Backend**: Supabase (Postgres + Auth + RLS + Storage)
- **Deploy**: Vercel (root directory: `frontend/`)
- **CI**: GitHub Actions (lint + test en cada push a main)

## Arrancar el proyecto
```bash
cd frontend
npm install        # primera vez
npm run dev        # dev server en localhost:5173
npm run build      # build de producción
npm run lint       # ESLint
npm test           # Vitest (una pasada)
npm run test:watch # Vitest en modo watch
```

## Variables de entorno (`frontend/.env`)
```
VITE_SUPABASE_URL=https://qhfyuirsdplhvgzvjwrx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```
El `.env` está en `.gitignore` — nunca commitear.

## Estructura de carpetas
```
FinanzasMichiti/
├── .github/workflows/ci.yml   # lint + test en cada push
├── frontend/
│   └── src/
│       ├── components/        Layout, SideDrawer
│       ├── context/           AuthContext, CurrencyContext, ThemeContext, ToastContext
│       ├── hooks/             queries.js  ← todos los hooks de React Query
│       ├── lib/               supabase.js, queryClient.js, categoryMeta.js
│       ├── pages/             Dashboard, Transacciones, Presupuestos, Deudas,
│       │                      Servicios, Metas, Perfil, Admin, Login
│       ├── utils/             serviceDates.js
│       └── test/              setup.js
├── .gitignore
└── CLAUDE.md
```

## Decisiones de arquitectura

### React Query — regla de oro
**Todo fetch de datos va en `src/hooks/queries.js`**. Ninguna página hace fetch directo a Supabase.
- Queries: `useTransacciones(filters)`, `usePresupuestos()`, `useDeudas()`, `useServicios()`, `useMetas()`, `useProfile()`
- Mutations: `useAddTransaccion()`, `useUpdateTransaccion()`, `useDeleteTransaccion()`, etc.
- `staleTime: 5min`, `gcTime: 10min`, `retry: 1`
- Las mutations invalidan su query key correspondiente en `onSuccess`

### Lazy loading
Todas las páginas se importan con `React.lazy()` en `App.jsx`. No importar páginas directamente.

### Contextos — qué va donde
- `AuthContext`: user, role, profile, logout(), refreshProfile() — también limpia queryClient al logout
- `CurrencyContext`: currency, format(), convert(), setCurrency() — sincroniza con user_profiles
- `ThemeContext`: theme, setTheme() — persiste en localStorage, aplica `data-theme` al `<html>`
- `ToastContext`: toast(message, type) — tipos: success / error / warning

### Auth
- `getSession()` para carga rápida desde caché, `getUser()` en background para validar token
- `logout()` en AuthContext: limpia queryClient + sessionStorage + llama `supabase.auth.signOut()`
- El perfil se crea en `CurrencyContext` si no existe (primer login OAuth)

## Tailwind v4 — diferencias clave
- **No hay `tailwind.config.js`** — configuración en CSS con `@theme inline`
- Plugin de Vite: `@tailwindcss/vite` (no PostCSS)
- Las clases de color (`bg-canvas`, `text-ink`, etc.) están mapeadas en `src/index.css` via `@theme inline`

## Sistema de colores (CSS variables)
| Variable | Dark | Uso |
|----------|------|-----|
| `--canvas` | `#08080f` | fondo de página |
| `--panel` | `#111118` | tarjetas, sidebar |
| `--well` | `#0d0d16` | inputs, fondos anidados |
| `--line` | `#1c1c2e` | bordes |
| `--ink` | `#eaeaf0` | texto principal |
| `--dim` | `#5a5a7a` | texto secundario |
| `--brand-500` | `#7c6af7` | violeta acento |
| `--income` | `#00e676` | verde ingresos |
| `--expense` | `#ff4d6d` | coral gastos |

Temas disponibles: `dark` (default), `light`, `mono`, `pink` — se setean con `data-theme` en `<html>`.

## Base de datos Supabase

### Tablas principales
| Tabla | Cols clave |
|-------|-----------|
| `user_profiles` | id, email, role ('usuario'/'admin'), currency, nombre, apodo, avatar_url |
| `transacciones` | id, user_id, monto, tipo ('ingreso'/'gasto'), categoria, descripcion, fecha |
| `presupuestos` | id, user_id, categoria, limite |
| `deudas` | id, user_id, descripcion, monto, tipo ('debo'/'me deben'), vencimiento, icono, pagado |
| `servicios` | id, user_id, nombre, monto, icono, categoria, dia_vencimiento, activo, ultimo_pago |
| `metas` | id, user_id, nombre, icono, monto_objetivo, monto_actual, fecha_limite |

### RLS — crítico
- RLS activo en **todas** las tablas
- `is_admin()` como `SECURITY DEFINER` para evitar recursión infinita
- Storage avatares: estructura `userId/filename` para políticas con `foldername()`

## Monedas soportadas
ARS, CLP, UYU, PEN, USD, EUR, BRL — elegida al registrarse, fija en `user_profiles.currency`.
Conversor de referencia disponible en Perfil (usa `open.er-api.com`, caché 1h en localStorage).

## Íconos de categoría
`lucide-react` con color y fondo de color. Definidos en `src/lib/categoryMeta.js`.
Categorías custom guardan `{ icon, color }` en `localStorage('category_meta')`.

## Próximas features
- [ ] Implementar Dashboard con React Query (resumen del mes, últimos movimientos)
- [ ] Implementar Transacciones con filtros y formulario
- [ ] Implementar Presupuestos con barra de progreso por categoría
- [ ] Implementar Deudas
- [ ] Implementar Servicios con días hasta vencimiento
- [ ] Implementar Metas de ahorro
- [ ] Implementar Perfil (avatar upload, cambio de tema, conversor)
- [ ] Implementar Admin
- [ ] Exportar datos (PDF con jsPDF — dependencia ya instalada)
- [ ] Notificaciones de vencimiento de servicios

## Deploy en Vercel
- Framework Preset: **Vite**
- Root Directory: `frontend`
- Env vars: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- Cada push a `main` redespliega automáticamente
