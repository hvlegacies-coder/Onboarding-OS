/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** GoHighLevel inbound webhook that receives owner invitations. */
  readonly VITE_GHL_INVITE_WEBHOOK?: string
  /** Receives a prospect's session registration from the public form. */
  readonly VITE_GHL_REGISTRATION_WEBHOOK?: string
  /** Receives contracts going out for signature. */
  readonly VITE_GHL_CONTRACT_WEBHOOK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
