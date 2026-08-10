import { useSyncExternalStore } from 'react'
import { ICA_TEMPLATE } from '../data/icaTemplate'
import { offices, preparers as seedPreparers } from '../data/mock'
import { contractStatus } from './contract'
import type {
  SendStatus,
  ContractDetails,
  ContractSend,
  ContractTemplate,
  OfficeBranding,
  Signature,
  Stage,
  Tone,
} from '../types'

/**
 * Contract templates, each office's customization of them, and everything sent
 * out for signature.
 *
 * Persisted to localStorage so admin edits and owner customizations survive a
 * reload and are visible across both roles. This stands in for the contract
 * platform's API — swap the read/write pair for real calls when it's wired up.
 */

// Bumped when the seeded template changes shape, so stored copies reseed.
const KEY = 'hv_contracts_v3'

export interface ContractStore {
  templates: ContractTemplate[]
  /** officeId -> logo + business name, shared by all their contracts. */
  branding: Record<string, OfficeBranding>
  /** `${officeId}:${templateId}` -> that office's version of that contract. */
  details: Record<string, ContractDetails>
  /** officeId -> the contract that sends automatically after a Discovery Session. */
  assignments: Record<string, string | null>
  /** Every contract sent for signature, newest first. */
  sends: ContractSend[]
}

export const TERM_LENGTHS = ['1 year', '2 years', '3 years', 'Until terminated']

export const blankDetails = (): ContractDetails => ({
  heroTitle: '',
  heroSubtitle: '',
  entityName: '',
  businessAddress: '',
  cityStateZip: '',
  governingState: '',
  agreementDate: '',
  termLength: TERM_LENGTHS[0],
  values: {},
})

/**
 * Every office sends the same standardized agreement. The document itself is
 * identical across tenants — what differs is the branding and the blanks each
 * owner fills in for themselves (R3). So the ICA is assigned to all offices up
 * front rather than one at a time.
 */
const seedAssignments = (): Record<string, string | null> =>
  Object.fromEntries(offices.map((o) => [o.id, ICA_TEMPLATE.id]))

/** The business name is known from the office record; the logo is not. */
const seedBranding = (): Record<string, OfficeBranding> =>
  Object.fromEntries(offices.map((o) => [o.id, { businessName: o.name }]))

/* ── Demo seed ────────────────────────────────────────────
 * Sample contract details and documents so the console has something to show
 * before any real data exists. Delete this block (and the sample arrays in
 * `mock.ts`) when real onboarding begins.
 */

const CITIES: [string, string, string][] = [
  ['1180 Peachtree St NE, Suite 400', 'Atlanta, GA 30309', 'Georgia'],
  ['77 Marietta Square', 'Marietta, GA 30060', 'Georgia'],
  ['420 Lenox Ave, Suite 12', 'Atlanta, GA 30308', 'Georgia'],
  ['915 Riverside Pkwy', 'Augusta, GA 30901', 'Georgia'],
  ['300 Commerce Dr', 'Decatur, GA 30030', 'Georgia'],
  ['58 Broad St, Suite 210', 'Columbus, OH 43215', 'Ohio'],
  ['1201 Delaware Ave', 'Marion, OH 43302', 'Ohio'],
]

/** Every office starts demo-ready: filled in and countersigned. */
const seedDetails = (): Record<string, ContractDetails> =>
  Object.fromEntries(
    offices.map((o, i) => {
      const [address, cityStateZip, governingState] = CITIES[i % CITIES.length]
      return [
        `${o.id}:${ICA_TEMPLATE.id}`,
        {
          heroTitle: 'Independent Contractor Agreement',
          heroSubtitle: 'Review the agreement, fill in your details, and sign securely online.',
          entityName: `${o.name} LLC`,
          businessAddress: address,
          cityStateZip,
          governingState,
          agreementDate: '',
          termLength: '1 year',
          values: {},
        },
      ]
    }),
  )

/** Document state implied by where the person sits in the pipeline. */
const SEND_STATE: Record<string, { status: SendStatus; reminders: string[] }> = {
  sent: { status: 'sent', reminders: [] },
  reminder1: { status: 'viewed', reminders: ['12'] },
  reminder2: { status: 'viewed', reminders: ['12', '24'] },
  followup: { status: 'viewed', reminders: ['12', '24', '48'] },
  signed: { status: 'signed', reminders: [] },
  orientation: { status: 'signed', reminders: [] },
  onboarded: { status: 'signed', reminders: [] },
}

/**
 * One document per seeded prospect who has reached the contract step.
 *
 * `remindersStopped` is set on every one of them deliberately: the reminder
 * sweep runs on load, and without this the demo set would fire a burst of real
 * reminder webhooks at GoHighLevel for people who don't exist.
 */
function seedSends(): ContractSend[] {
  return seedPreparers
    .filter((p) => p.stage in SEND_STATE)
    .map((p) => {
      const { status, reminders } = SEND_STATE[p.stage]
      const office = offices.find((o) => o.id === p.officeId)
      return {
        token: `demo${p.id}${p.officeId}`.replace(/[^a-z0-9]/g, '').slice(0, 32),
        officeId: p.officeId,
        officeName: p.office,
        ownerName: office?.owner || p.office,
        template: ICA_TEMPLATE,
        details: seedDetails()[`${p.officeId}:${ICA_TEMPLATE.id}`],
        prospect: { name: p.name, email: p.email, phone: p.phone },
        status,
        sentAt: p.invited,
        sentAtMs: Date.now(),
        reminders,
        remindersStopped: true,
        ...(status === 'signed'
          ? { signedAt: p.signedOn, signature: { name: p.name, mode: 'type' as const, font: 'font-vibes', signedAt: p.signedOn ?? '' } }
          : {}),
      }
    })
}

const EMPTY: ContractStore = {
  templates: [ICA_TEMPLATE],
  sends: seedSends(),
  branding: seedBranding(),
  assignments: seedAssignments(),
  details: seedDetails(),
}

function read(): ContractStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as ContractStore
    if (!p.templates?.length) p.templates = [ICA_TEMPLATE]
    p.branding ??= {}
    p.details ??= {}
    p.assignments ??= {}
    p.sends ??= []
    // Backfill offices this browser stored before the ICA was assigned to
    // everyone. Gaps only — an explicit null means an admin unassigned it, and
    // saved branding is the owner's own work. Never touches `sends`, which are
    // snapshots of already-executed agreements.
    for (const o of offices) {
      if (!(o.id in p.assignments)) p.assignments[o.id] = ICA_TEMPLATE.id
      p.branding[o.id] ??= { businessName: o.name }
    }
    return p
  } catch {
    return EMPTY
  }
}

let store = read()
const listeners = new Set<() => void>()

function commit(next: ContractStore) {
  store = next
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  // Keep other tabs in sync — an admin in one tab, an owner in another.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      store = read()
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

/** Read-only view of the current store, for non-React callers. */
export const storeSnapshot = () => store

export function useContracts() {
  return useSyncExternalStore(subscribe, () => store, () => store)
}

/* ── Templates ───────────────────────────────────────────── */

export function saveTemplate(t: ContractTemplate) {
  const templates = store.templates.some((x) => x.id === t.id)
    ? store.templates.map((x) => (x.id === t.id ? t : x))
    : [...store.templates, t]
  commit({ ...store, templates })
}

export function deleteTemplate(id: string) {
  const assignments = { ...store.assignments }
  Object.keys(assignments).forEach((k) => {
    if (assignments[k] === id) assignments[k] = null
  })
  commit({ ...store, templates: store.templates.filter((t) => t.id !== id), assignments })
}

export const assignedTemplateId = (officeId: string) => store.assignments[officeId] ?? null

export function assignTemplate(officeId: string, templateId: string | null) {
  commit({ ...store, assignments: { ...store.assignments, [officeId]: templateId } })
}

/* ── Office branding + details ───────────────────────────── */

export const officeBranding = (officeId: string): OfficeBranding =>
  store.branding[officeId] ?? { businessName: '' }

export function saveBranding(officeId: string, branding: OfficeBranding) {
  commit({ ...store, branding: { ...store.branding, [officeId]: branding } })
}

const detailKey = (officeId: string, templateId: string) => `${officeId}:${templateId}`

export const contractDetails = (officeId: string, templateId: string): ContractDetails =>
  store.details[detailKey(officeId, templateId)] ?? blankDetails()

/**
 * The blanks the office itself has to fill before it can send anything. Signer
 * fields are excluded — the contractor completes those at signing — and the
 * agreement date is deliberately optional, since leaving it blank dates the
 * contract on the day it's opened.
 *
 * Every office now carries the standard agreement, so this is what separates
 * "has a template" from "can actually send a correct one" (R3).
 */
const OFFICE_REQUIRED: [
  'entityName' | 'businessAddress' | 'cityStateZip' | 'governingState',
  string,
][] = [
  ['entityName', 'Legal entity name'],
  ['businessAddress', 'Business address'],
  ['cityStateZip', 'City, state & ZIP'],
  ['governingState', 'Governing state'],
]

/**
 * The same check against details held anywhere — the office's saved answers now
 * come from `owner_contracts`, not only from this browser.
 */
export function missingIn(d: ContractDetails, businessName: string): string[] {
  const missing = OFFICE_REQUIRED.filter(([k]) => !d[k].trim()).map(([, label]) => label)
  if (!businessName.trim()) missing.unshift('Business name')
  return missing
}

export function missingOfficeDetails(officeId: string, templateId: string): string[] {
  return missingIn(contractDetails(officeId, templateId), officeBranding(officeId).businessName)
}

export function saveDetails(officeId: string, templateId: string, details: ContractDetails) {
  commit({
    ...store,
    details: { ...store.details, [detailKey(officeId, templateId)]: details },
  })
}

export function setSignature(officeId: string, templateId: string, signature?: Signature) {
  const current = contractDetails(officeId, templateId)
  saveDetails(officeId, templateId, { ...current, signature })
}

/* ── Sending for signature ───────────────────────────────── */

const stamp = () =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())

/** Random, unguessable, and URL-safe — this token is the only key to the document. */
function makeToken() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

interface CreateSendArgs {
  officeId: string
  officeName: string
  ownerName: string
  template: ContractTemplate
  details: ContractDetails
  logo?: string
  prospect: { name: string; email: string; phone: string }
}

/** Freezes a copy of the contract and returns the send, including its token. */
export function createSend(args: CreateSendArgs): ContractSend {
  const send: ContractSend = {
    token: makeToken(),
    officeId: args.officeId,
    officeName: args.officeName,
    ownerName: args.ownerName,
    // Deep-copy the snapshot so later edits can't reach into a sent contract.
    template: JSON.parse(JSON.stringify(args.template)),
    details: JSON.parse(JSON.stringify(args.details)),
    logo: args.logo,
    prospect: args.prospect,
    status: 'sent',
    sentAt: stamp(),
    sentAtMs: Date.now(),
    reminders: [],
  }
  commit({ ...store, sends: [send, ...store.sends] })
  return send
}

/**
 * Creates the send for whatever contract an office has assigned, resolving the
 * template, their filled-in details and their branding for them.
 *
 * Returns null when the office isn't ready — no template assigned, or blanks
 * still empty — so a caller can carry on without a contract rather than
 * producing a document full of gaps (R3).
 */
export function createSendForOffice(
  officeId: string,
  prospect: { name: string; email: string; phone: string },
): ContractSend | null {
  const templateId = assignedTemplateId(officeId)
  if (!templateId) return null
  const template = store.templates.find((t) => t.id === templateId)
  if (!template) return null
  if (missingOfficeDetails(officeId, templateId).length > 0) return null

  const office = offices.find((o) => o.id === officeId)
  const branding = officeBranding(officeId)
  return createSend({
    officeId,
    officeName: branding.businessName || office?.name || '',
    ownerName: office?.owner || office?.name || '',
    template,
    details: contractDetails(officeId, templateId),
    logo: branding.logo,
    prospect,
  })
}

export const getSend = (token: string | undefined) => store.sends.find((s) => s.token === token)

export const sendsForOffice = (officeId: string) => store.sends.filter((s) => s.officeId === officeId)

/** The most recent document sent to one person. Email is the only identifier
 *  the contract platform and the central account share. */
export const latestSendTo = (email: string) =>
  store.sends.find((s) => s.prospect.email.toLowerCase() === email.trim().toLowerCase())

/** Whether a document has actually gone out to this person. */
export const hasSendTo = (email: string) => Boolean(latestSendTo(email))

/**
 * One preparer's contract status, accounting for documents raised at booking
 * rather than after the session. Every view reads through this so the console
 * can't report "not sent yet" for a contract already in someone's inbox.
 */
export const statusOf = (p: { stage: Stage; email: string }) =>
  contractStatus(p.stage, hasSendTo(p.email))

/* ── Document state ──────────────────────────────────────── */

/**
 * What the document itself reports, as distinct from where the person sits in
 * the pipeline. A contract can be sent and never opened, which the stage alone
 * cannot express.
 */
export type DocStatus = 'none' | 'not-open' | 'open-unsigned' | 'signed' | 'declined'

export const DOC_LABEL: Record<DocStatus, { label: string; tone: Tone; help: string }> = {
  none: {
    label: 'Not sent',
    tone: 'gold',
    help: 'No document has been raised for this person yet.',
  },
  'not-open': {
    label: 'Contract not Open',
    tone: 'warn',
    help: 'Delivered, but they have not opened the link yet.',
  },
  'open-unsigned': {
    label: 'Open, not Signed',
    tone: 'warn',
    help: 'They have opened the document but have not signed it.',
  },
  signed: { label: 'Signed', tone: 'good', help: 'Signed and filed.' },
  declined: {
    label: 'Declined',
    tone: 'bad',
    help: 'They declined to sign. The reason is on the document.',
  },
}

/** Document state for one person, from their most recent send. */
export function docStatus(email: string): DocStatus {
  const send = latestSendTo(email)
  if (!send) return 'none'
  switch (send.status) {
    case 'sent':
      return 'not-open'
    case 'viewed':
      return 'open-unsigned'
    case 'signed':
      return 'signed'
    case 'declined':
      return 'declined'
  }
}

/** en-CA gives yyyy-mm-dd, which is what the date input and Date() both want. */
const isoToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())

export function markViewed(token: string) {
  const s = getSend(token)
  if (!s || s.status !== 'sent') return
  commit({
    ...store,
    sends: store.sends.map((x) =>
      x.token === token
        ? { ...x, status: 'viewed', viewedAt: stamp(), accessedOn: x.accessedOn ?? isoToday() }
        : x,
    ),
  })
}

export function signSend(
  token: string,
  signature: Signature,
  signerValues: Record<string, string> = {},
) {
  commit({
    ...store,
    sends: store.sends.map((x) =>
      x.token === token
        ? { ...x, status: 'signed', signature, signerValues, signedAt: signature.signedAt }
        : x,
    ),
  })
}

/**
 * Records that a reminder went out, and closes the sequence when it was the
 * last one. Written before the network call returns is deliberate — see
 * `runDueReminders`.
 */
export function recordReminder(token: string, type: string, final = false) {
  commit({
    ...store,
    sends: store.sends.map((x) =>
      x.token === token
        ? {
            ...x,
            reminders: [...(x.reminders ?? []), type],
            remindersStopped: final || x.remindersStopped,
          }
        : x,
    ),
  })
}

export function declineSend(token: string, reason: string) {
  commit({
    ...store,
    sends: store.sends.map((x) =>
      x.token === token ? { ...x, status: 'declined', declineReason: reason } : x,
    ),
  })
}

/**
 * The details as the signer sees them. An office that left the agreement date
 * blank gets it dated the day the signer opened the link.
 */
export function effectiveDetails(send: ContractSend): ContractDetails {
  const agreementDate = send.details.agreementDate || send.accessedOn || isoToday()
  return {
    ...send.details,
    agreementDate,
    // Anything the signer typed becomes part of the document.
    values: { ...send.details.values, ...(send.signerValues ?? {}) },
  }
}

export const signUrl = (token: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/sign/${token}`

/* ── Rendering ───────────────────────────────────────────── */

/** Every merge field available to a template, for one office's contract. */
export function mergeFields(
  details: ContractDetails,
  branding: OfficeBranding,
  preparerName = '',
): Record<string, string> {
  // The agreement date feeds the "___ day of ___, 20 ___" blanks and the term
  // start. Left blank, they stay blank — the contract is dated on signature.
  const d = details.agreementDate ? new Date(`${details.agreementDate}T00:00:00`) : null
  const month = d ? d.toLocaleString('en-US', { month: 'long' }) : ''

  // The agreement runs to April 30 in the year the term elapses. No extra year:
  // an executed agreement dated 2026 with a two-year term expires April 30 2028,
  // and this used to print 2029 — a year of term nobody agreed to.
  const years = parseInt(details.termLength, 10)
  const expiry = d && !Number.isNaN(years) ? d.getFullYear() + years : null

  return {
    ...details.values,
    office_name: branding.businessName,
    entity_name: details.entityName,
    business_address: details.businessAddress,
    city_state_zip: details.cityStateZip,
    governing_state: details.governingState,
    agreement_date: details.agreementDate,
    intro_day: d ? String(d.getDate()) : '',
    intro_month: month,
    intro_year: d ? String(d.getFullYear()).slice(2) : '',
    commencement_date: d ? `${month} ${d.getDate()}` : '',
    expiration_year: expiry ? String(expiry).slice(2) : '',
    term_length: details.termLength,
    // The notices contact is whoever signed for the office.
    notice_contact: details.signature?.name ?? '',
    preparer_name: preparerName,
    // The signer supplies these; keep whatever they've typed.
    preparer_address: details.values.preparer_address ?? '',
    preparer_city: details.values.preparer_city ?? '',
  }
}

/** Every merge key referenced anywhere in the document. */
export function mergeKeys(template: ContractTemplate): string[] {
  const keys = new Set<string>()
  template.sections.forEach((s) => {
    for (const m of s.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) keys.add(m[1])
  })
  return [...keys]
}

/** Required blanks the signer still has to complete before they can sign. */
export function missingRequired(
  template: ContractTemplate,
  merged: Record<string, string>,
  signerValues: Record<string, string>,
): string[] {
  const optional = template.optionalFields ?? []
  return mergeKeys(template).filter(
    (k) =>
      !optional.includes(k) &&
      !merged[k]?.trim() &&
      !signerValues[k]?.trim(),
  )
}

/** Fill {{merge_fields}}. Unknown or empty fields render as a visible blank. */
export function fillText(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const v = values[key]
    return v && v.trim() ? v : '__________'
  })
}

export const newTemplateId = () => `tpl-${Date.now().toString(36)}`
