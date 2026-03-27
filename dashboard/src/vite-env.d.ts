/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  /** When `"true"`, API helpers return mock data and skip the network. */
  readonly VITE_API_USE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
