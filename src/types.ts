export type Stage =
  | 'invited'
  | 'scheduled'
  | 'attended'
  | 'sent'
  | 'reminder1'
  | 'reminder2'
  | 'signed'
  | 'followup'
  | 'orientation'
  | 'onboarded'

export type BrandingStatus = 'complete' | 'contract-pending' | 'logo-pending'
export type Tone = 'good' | 'gold' | 'warn' | 'bad'

export interface Office {
  id: string
  name: string
  /**
   * The owner's name, where the office list gives one. Blank means it hasn't
   * been collected yet — fall back to the business name when displaying.
   */
  owner: string
  initials: string
  /** URL segment that resolves to this Office ID. The only attribution mechanism (R2). */
  slug: string
  branding: BrandingStatus
}

/** What the contract platform reports back for a prospect. */
export type ContractStatus = 'not-sent' | 'open' | 'signed' | 'stalled'

export interface Preparer {
  id: string
  name: string
  email: string
  phone: string
  initials: string
  /** Office ID — set from the invite link, never from prospect input (R2). */
  officeId: string
  office: string
  stage: Stage
  session: string
  invited: string
  /** Optional free text from the invitation form. */
  referredBy?: string
  /** Date the ICA was signed, when it has been. */
  signedOn?: string
}

export interface Session {
  id: string
  type: 'Discovery Session' | 'New Preparer Orientation'
  /** Display string, e.g. 'Sun · Aug 9'. */
  date: string
  /** yyyy-mm-dd — what the catalog sorts and filters on. */
  dateIso?: string
  time: string
  registered: number
  note: string
}

export interface Message {
  code: string
  channel: string
  audience: string
  title: string
  body: string
  note?: string
}

/* ── Contracts ─────────────────────────────────────────── */

/** A blank an owner fills in. Admin decides which blanks exist. */
export interface TemplateField {
  key: string
  label: string
  placeholder: string
  /** Long-form fields render as a textarea. */
  multiline?: boolean
}

export interface TemplateSection {
  id: string
  heading: string
  /** Body text. Supports {{merge_fields}}. */
  body: string
}

export interface ContractTemplate {
  id: string
  name: string
  /** Short form used in panel headings and buttons. Falls back to `name`. */
  shortName?: string
  version: string
  sections: TemplateSection[]
  /** The blanks each office fills in for themselves. */
  fields: TemplateField[]
  /**
   * Merge-field keys that are NOT required. Anything appearing in the document
   * is required by default; listing it here makes it optional.
   */
  optionalFields?: string[]
  updatedAt: string
}

export type SignatureMode = 'draw' | 'type' | 'upload'

export interface Signature {
  /** Typed legal name — always captured, whichever mode was used. */
  name: string
  mode: SignatureMode
  /** Drawn or uploaded signature as a data URL. Absent when typed. */
  drawing?: string
  /** Tailwind font class when the signature was typed. */
  font?: string
  signedAt: string
}

/** Shared across every contract an office sends. */
export interface OfficeBranding {
  /** Data URL of the uploaded logo. */
  logo?: string
  businessName: string
}

/** One office's customization of one template. */
export interface ContractDetails {
  heroTitle: string
  heroSubtitle: string
  entityName: string
  businessAddress: string
  cityStateZip: string
  governingState: string
  /** Blank means "date it the day the client signs". */
  agreementDate: string
  termLength: string
  /** Answers to the template's own custom fields. */
  values: Record<string, string>
  signature?: Signature
}

export type SendStatus = 'sent' | 'viewed' | 'signed' | 'declined'

/**
 * One contract sent to one prospect. The template, the office's answers, and
 * the owner's countersignature are all snapshotted at send time — a signed
 * agreement must never change afterwards.
 */
export interface ContractSend {
  token: string
  officeId: string
  officeName: string
  ownerName: string
  template: ContractTemplate
  details: ContractDetails
  logo?: string
  prospect: { name: string; email: string; phone: string }
  status: SendStatus
  sentAt: string
  /**
   * Epoch milliseconds the document went out. `sentAt` is a formatted string
   * for display; the reminder schedule needs something it can do arithmetic on.
   */
  sentAtMs: number
  /**
   * Which reminders have already fired, as hour marks ('12' | '24' | '48').
   * Recorded so a reminder is never sent twice, however often the sweep runs.
   */
  reminders?: string[]
  /** Set once the final reminder has gone and automation has handed over. */
  remindersStopped?: boolean
  viewedAt?: string
  /**
   * ISO date the signer first opened the document. When the office left the
   * agreement date blank, this is what dates the agreement.
   */
  accessedOn?: string
  signedAt?: string
  signature?: Signature
  /** Blanks the signer filled in on their copy. */
  signerValues?: Record<string, string>
  declineReason?: string
}

export interface Activity {
  id: string
  tone: Tone
  text: string
  meta: string
}

export interface FunnelStep {
  name: string
  count: number
  pct: number
}
