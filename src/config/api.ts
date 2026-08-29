/**
 * RELAY — Frontend API Configuration
 * Supports decoupled deployment where the frontend is on GitHub Pages / Vercel
 * and the backend is deployed on Render / Railway / Cloud Run.
 */

export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.replace(/\/$/, '')
  }
  return ''
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${cleanPath}`
}
