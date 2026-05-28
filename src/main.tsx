import React from 'react'
import ReactDOM from 'react-dom/client'
import { SettingsProvider } from '@/context/SettingsContext'
import { GenericWidgetProvider } from '@/context/GenericWidgetContext'
import { App } from './App'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SettingsProvider>
      <GenericWidgetProvider>
        <App />
      </GenericWidgetProvider>
    </SettingsProvider>
  </React.StrictMode>
)
