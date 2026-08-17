/**
 * GoHighLevel hand-off.
 *
 * The platform does not send email or SMS itself — it posts the invitation to a
 * GHL inbound webhook, and the workflow on the other side owns the messaging,
 * the contact record, and the pipeline stage.
 */

export interface InvitePayload {
  /** The office doing the inviting — drives branding and owner notifications. */
  officeName: string
  officeId: string
  /** The owner's unique link. GHL needs it to build the message body. */
  inviteLink: string
  name: string
  email: string
  phone: string
  notes: string
}

/**
 * A contract going out for signature. GHL sends the email and text.
 *
 * The field names crossing the wire are the workflow's, not this codebase's —
 * see `sendContract`. They are capitalised and spaced because that is what the
 * GoHighLevel side maps on, and a rename here silently empties a field there.
 */
export interface ContractPayload {
  /** The office doing the inviting — drives branding and owner notifications. */
  officeName: string
  officeId: string
  /** Who is signing. */
  name: string
  email: string
  phone: string
  /** The unique, unguessable link to their copy of the document. */
  signLink: string
  contractName: string
  contractVersion: string
  sentBy: string
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'network' | 'rejected' | 'timeout'; detail?: string }

/**
 * A stalled request must never trap the UI in a "Sending…" state. GHL normally
 * answers in about a second, so anything past this is treated as a failure the
 * owner can act on — the document already exists either way.
 */
const TIMEOUT_MS = 10000

const INVITE_WEBHOOK = import.meta.env.VITE_GHL_INVITE_WEBHOOK
// Each falls back to the invite webhook so one URL can serve everything —
// every payload carries an `event` field to branch on.
const REGISTRATION_WEBHOOK = import.meta.env.VITE_GHL_REGISTRATION_WEBHOOK || INVITE_WEBHOOK
const CONTRACT_WEBHOOK = import.meta.env.VITE_GHL_CONTRACT_WEBHOOK || INVITE_WEBHOOK
const REMINDER_WEBHOOK = import.meta.env.VITE_GHL_REMINDER_WEBHOOK || CONTRACT_WEBHOOK
const SIGNED_WEBHOOK = import.meta.env.VITE_GHL_SIGNED_WEBHOOK || CONTRACT_WEBHOOK

/** False until the webhooks are set — the UI says so rather than pretending. */
export const ghlConfigured = Boolean(INVITE_WEBHOOK)
export const ghlRegistrationConfigured = Boolean(REGISTRATION_WEBHOOK)
export const ghlContractConfigured = Boolean(CONTRACT_WEBHOOK)

async function post(url: string | undefined, body: unknown): Promise<SendResult> {
  if (!url) return { ok: false, reason: 'not-configured' }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal,
    })
    if (!res.ok) return { ok: false, reason: 'rejected', detail: `${res.status} ${res.statusText}` }
    return { ok: true }
  } catch (e) {
    // An abort here is our own timeout firing, not the caller cancelling.
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, reason: 'timeout', detail: `no response in ${TIMEOUT_MS / 1000}s` }
    }
    // Usually CORS or an offline browser — the request never reached GHL.
    return { ok: false, reason: 'network', detail: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}

/** Someone reserved a seat through an invite link. Triggers M1 + M3. */
export interface RegistrationPayload {
  fullName: string
  phone: string
  email: string
  /** Human-readable, for the message body: 'Sun · Aug 9 · 6:00 PM ET · Zoom'. */
  sessionChosen: string
  /**
   * The same session as 'YYYY-MM-DD HH:MM A' — the format GHL parses into a
   * date field. Kept alongside sessionChosen so the workflow can schedule from
   * one and still write the pretty version into the email.
   */
  sessionAt: string
  /** IANA zone the session time is quoted in — never a fixed EST/EDT label. */
  sessionTimezone: string
  /** The same instant with its real offset: '2026-08-09T18:00:00-04:00'. */
  sessionAtIso: string
  /** The owner whose link they used — derived, never typed (R2). */
  referredBy: string
  officeName: string
  officeId: string
  /**
   * Their personal signing link, so the confirmation can carry the agreement
   * alongside the session details. Empty when the office hasn't finished its
   * contract setup — the workflow should branch on that rather than sending a
   * broken link.
   */
  contractLink: string
  contractName: string
  contractVersion: string
}

/**
 * A nudge for someone who has not signed yet. `reminderType` is the hour mark
 * that triggered it, so one workflow can branch on how urgent the wording
 * should be. Nothing is sent after the 48-hour mark (R4).
 */
export interface ReminderPayload {
  fullName: string
  phone: string
  email: string
  officeName: string
  officeId: string
  reminderType: '12' | '24' | '48'
}

export const sendReminder = (payload: ReminderPayload) =>
  post(REMINDER_WEBHOOK, { event: 'reminder', ...payload })

/**
 * Fired the moment a contract is signed.
 *
 * `signedContractLink` opens that person's executed agreement, which prints
 * straight to PDF. It is a link to the document, not a hosted .pdf file — the
 * app has no storage of its own, so a true file URL has to come from the
 * contract platform or a bucket once one exists.
 */
export interface SignedPayload {
  fullName: string
  email: string
  phone: string
  officeName: string
  officeId: string
  signedContractLink: string
}

export const sendSigned = (payload: SignedPayload) =>
  post(SIGNED_WEBHOOK, { event: 'signed', ...payload })

export const sendInvite = (payload: InvitePayload) =>
  post(INVITE_WEBHOOK, { event: 'invite', ...payload })

export const sendRegistration = (payload: RegistrationPayload) =>
  post(REGISTRATION_WEBHOOK, { event: 'registration', ...payload })

/**
 * Hands a contract to GoHighLevel to deliver.
 *
 * The body is written in the workflow's own field names — `Name`, `Email`,
 * `Phone`, `Contract link`, `Office name` — because those are what the GHL
 * side maps on. The internal names stay on this side of the boundary, and the
 * translation happens here, once, where it can be seen.
 *
 * `event` and `officeId` ride along as metadata so one webhook can serve
 * several events and an owner notification can resolve its office.
 */
export const sendContract = (payload: ContractPayload) =>
  post(CONTRACT_WEBHOOK, {
    event: 'contract',
    Name: payload.name,
    Email: payload.email,
    Phone: payload.phone,
    'Contract link': payload.signLink,
    'Office name': payload.officeName,
    officeId: payload.officeId,
    sentBy: payload.sentBy,
    contractName: payload.contractName,
    contractVersion: payload.contractVersion,
  })
