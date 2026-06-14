const GIS_SCRIPT = 'https://accounts.google.com/gsi/client'
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'

let gisLoaded = false

function loadGisScript(): Promise<void> {
  if (gisLoaded && window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => {
        gisLoaded = true
        resolve()
      })
      return
    }

    const script = document.createElement('script')
    script.src = GIS_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => {
      gisLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('Не удалось загрузить Google Identity Services'))
    document.head.appendChild(script)
  })
}

export function getGoogleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
}

export function isGoogleConfigured(): boolean {
  return Boolean(getGoogleClientId())
}

export interface GoogleTokenResult {
  accessToken: string
  expiresAt: string
}

export async function requestGoogleAccessToken(): Promise<GoogleTokenResult> {
  const clientId = getGoogleClientId()
  if (!clientId) {
    throw new Error(
      'Google Client ID не настроен. Добавьте VITE_GOOGLE_CLIENT_ID в .env',
    )
  }

  await loadGisScript()

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SHEETS_SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        const expiresAt = new Date(
          Date.now() + (response.expires_in ?? 3600) * 1000,
        ).toISOString()
        resolve({
          accessToken: response.access_token,
          expiresAt,
        })
      },
    })
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export function isTokenValid(expiry?: string): boolean {
  if (!expiry) return false
  return new Date(expiry).getTime() > Date.now() + 60_000
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token: string
              expires_in?: number
              error?: string
            }) => void
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void }
        }
      }
    }
  }
}
