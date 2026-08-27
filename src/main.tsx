import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ClientPortalProvider } from './contexts/ClientPortalContext'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ClientPortalProvider>
          <App />
        </ClientPortalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
