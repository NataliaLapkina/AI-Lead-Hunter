/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_APP_URL: string
  readonly VITE_DEV_BUSINESS_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
