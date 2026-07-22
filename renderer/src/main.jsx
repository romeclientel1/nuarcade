import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ProfileProvider } from './context/ProfileContext.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <ProfileProvider>
        <App />
      </ProfileProvider>
    </I18nProvider>
  </StrictMode>,
)
