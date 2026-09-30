import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import DebugPage from './DebugPage'

const isDebug = window.location.pathname.endsWith('/debug') || window.location.pathname.endsWith('/debug/')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDebug ? <DebugPage /> : <App />}
  </StrictMode>,
)
