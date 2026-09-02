import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CaseStateProvider } from './contexts/CaseStateContext'
import { DevModeProvider } from './contexts/DevModeContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaseStateProvider>
      <DevModeProvider>
        <App />
      </DevModeProvider>
    </CaseStateProvider>
  </React.StrictMode>,
)
