import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { SettingsProvider } from './context/SettingsContext'
import { CurrencyProvider } from './context/CurrencyContext'
import { ToastProvider } from './context/ToastContext'
import Layout from './components/Layout'

const Login         = lazy(() => import('./pages/Login'))
const Dashboard     = lazy(() => import('./pages/Dashboard'))
const Transacciones = lazy(() => import('./pages/Transacciones'))
const Presupuestos  = lazy(() => import('./pages/Presupuestos'))
const Deudas        = lazy(() => import('./pages/Deudas'))
const Servicios     = lazy(() => import('./pages/Servicios'))
const Metas         = lazy(() => import('./pages/Metas'))
const Perfil        = lazy(() => import('./pages/Perfil'))
const Ajustes       = lazy(() => import('./pages/Ajustes'))
const Conversor     = lazy(() => import('./pages/Conversor'))
const Exportar      = lazy(() => import('./pages/Exportar'))
const Admin         = lazy(() => import('./pages/Admin'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen text-dim text-sm">
      Cargando...
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SettingsProvider>
        <CurrencyProvider>
          <ToastProvider>
            <AuthProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                      path="/"
                      element={
                        <PrivateRoute>
                          <Layout />
                        </PrivateRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="transacciones" element={<Transacciones />} />
                      <Route path="presupuestos"  element={<Presupuestos />} />
                      <Route path="servicios"     element={<Servicios />} />
                      <Route path="metas"         element={<Metas />} />
                      <Route path="deudas"        element={<Deudas />} />
                      <Route path="perfil"        element={<Perfil />} />
                      <Route path="ajustes"       element={<Ajustes />} />
                      <Route path="conversor"     element={<Conversor />} />
                      <Route path="exportar"      element={<Exportar />} />
                      <Route
                        path="admin"
                        element={
                          <AdminRoute>
                            <Admin />
                          </AdminRoute>
                        }
                      />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AuthProvider>
          </ToastProvider>
        </CurrencyProvider>
        </SettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
