import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { CaseStateProvider } from './contexts/CaseStateContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CaseStateProvider>
      <App />
    </CaseStateProvider>
  </React.StrictMode>,
)
