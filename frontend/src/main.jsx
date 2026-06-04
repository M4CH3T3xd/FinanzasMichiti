import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Registra el service worker y verifica actualizaciones inmediatamente al cargar.
// Sin esto, el SW solo busca actualizaciones después de un delay, por lo que
// los usuarios pueden ver la versión anterior en deploys recientes.
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
