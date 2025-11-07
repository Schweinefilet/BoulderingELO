import React from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './styles.css'

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

// Only wrap with GoogleOAuthProvider if client ID is properly configured
const isGoogleConfigured = GOOGLE_CLIENT_ID && 
  GOOGLE_CLIENT_ID.length > 0 && 
  !GOOGLE_CLIENT_ID.includes('your-google') && // Exclude placeholder values
  GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com');

const AppWithProviders = isGoogleConfigured ? (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
) : (
  <App />
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {AppWithProviders}
  </React.StrictMode>
)
