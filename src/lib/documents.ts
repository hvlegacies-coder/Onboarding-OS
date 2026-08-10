import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { ICA_TEMPLATE } from '../data/icaTemplate'
/**
 * A blank set of answers.
 *
 * Defined here rather than imported from `contractStore`, which imports this
 * module in turn. A cycle between two modules that both do work at import time
 * resolves to `undefined` in whichever loads first — not a thing to discover
 * in production.
 */
const blankDetails = (): ContractDetails => ({
  heroTitle: '',
  heroSubtitle: '',
  entityName: '',
  businessAddress: '',
  cityStateZip: '',
  governingState: '',
  agreementDate: '',
  termLength: `${TERM_YEARS} years`,
  values: {},
})
import type { ContractDetails, ContractSend, ContractTemplate, SendStatus, Signature } from '../types'

/**
 * Contracts, in the database.
 *
 * Documents used to live in localStorage, which meant a signing link only
 * resolved in the browser that created it — the prospect always saw "Link not
 * valid". A document is a real record: it is raised here, read back by token
 * from anywhere, and signed once.
 *
 * The app's `ContractSend` stays as the view model. Everything below adapts a
 * `documents` row to it, so the signing page, the drawer and the owner's sent
 * list keep working unchanged.
 *
 * ── Why the whole agreement is snapshotted into `form_data` ──
 * The signing page is public. Anonymous callers reach exactly one row, through
 * the `get_document` SECURITY DEFINER function — they cannot read `owners` or
 * `owner_contracts` to find out the office's name, logo or entity details. So
 * everything needed to render the agreement is frozen into the document when
 * it is sent. That also satisfies R3: a sent contract can never change
 * afterwards, however the office edits its template later.
 */

/** The `documents` row, as PostgREST hands it back. */
interface DocumentRow {
  id: string
  token: string
  title: string
  recipient_name: string | null
  recipient_email: string | null
  recipient_phone: string | null
  form_data: Record<string, unknown> | null
  signature: string | null
  status: string
  owner_id: string | null
  contract_type: string
  required_fields: string[] | null
  custom_clauses: unknown[] | null
  block_overrides: Record<string, unknown> | null
  first_accessed_at: string | null
  signed_at: string | null
  sent_at: string | null
  created_at: string
  reminders: string[] | null
  reminders_stopped: boolean
}

const DOC_COLUMNS =
  'id,token,title,recipient_name,recipient_email,recipient_phone,form_data,signature,status,' +
  'owner_id,contract_type,required_fields,custom_clauses,block_overrides,first_accessed_at,' +
  'signed_at,sent_at,created_at,reminders,reminders_stopped'

/** What we freeze into `form_data` when a document goes out. */
interface Snapshot {
  office?: { name?: string; ownerName?: string; logo?: string }
  details?: Partial<ContractDetails>
  template?: ContractTemplate
  prospect?: { name?: string; email?: string; phone?: string }
}

const SNAPSHOT_KEY = '_snapshot'
const SIGNER_KEY = '_signer'

/** The only contract this platform sends, and the platform's own name for it. */
export const CONTRACT_TYPE = 'independent_contractor'

/**
 * Blanks the signer filled in.
 *
 * Documents raised before this module existed keep a flat `form_data`, so
 * anything that isn't one of our two reserved keys is treated as a signer
 * value. That keeps the nine already-signed agreements readable.
 */
function signerValuesOf(form: Record<string, unknown> | null): Record<string, string> {
  if (!form) return {}
  const nested = form[SIGNER_KEY]
  if (nested && typeof nested === 'object') {
    return Object.fromEntries(
      Object.entries(nested as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')]),
    )
  }
  // A document in the platform's own shape keeps the contractor's answers under
  // its names, not this app's. Translate them so a signed agreement renders
  // with what the contractor actually typed.
  const s = (k: string) => (typeof form[k] === 'string' ? (form[k] as string) : '')
  const out: Record<string, string> = {}
  const name = s('sig_contractor_print') || s('contractor_name')
  const address = s('contractor_place') || s('notice_contractor_address')
  const city = s('notice_contractor_city')
  if (name) out.preparer_name = name
  if (address) out.preparer_address = address
  if (city) out.preparer_city = city
  return out
}

const snapshotOf = (form: Record<string, unknown> | null): Snapshot => {
  const s = form?.[SNAPSHOT_KEY]
  return s && typeof s === 'object' ? (s as Snapshot) : {}
}

/**
 * The office's saved answers.
 *
 * The vocabulary here is the contract platform's, not this app's: an office
 * stores `company_name` / `company_place` / `company_city`, and the 38 existing
 * documents use the same keys. Reading this app's own names first and falling
 * back to those is what lets one table serve both — get it wrong and a fully
 * configured office renders a contract full of blanks.
 */
function readDetails(raw: unknown): ContractDetails {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k]
      if (typeof v === 'string' && v.trim()) return v
    }
    return ''
  }
  const base = blankDetails()
  return {
    ...base,
    heroTitle: pick('heroTitle', 'hero_title') || base.heroTitle,
    heroSubtitle: pick('heroSubtitle', 'hero_subtitle') || base.heroSubtitle,
    entityName: pick('entityName', 'entity_name', 'company_name'),
    businessAddress: pick('businessAddress', 'business_address', 'company_place'),
    cityStateZip: pick('cityStateZip', 'city_state_zip', 'company_city'),
    governingState: pick('governingState', 'governing_state'),
    agreementDate: pick('agreementDate', 'agreement_date'),
    // The house term, on every agreement — the stored per-office `term_years`
    // is deliberately not read, so no document can carry a different one.
    termLength: `${TERM_YEARS} years`,
    values: (d.values && typeof d.values === 'object' ? d.values : {}) as Record<string, string>,
    // The countersignature is stored as a bare data URL, not as this app's
    // Signature object — `readSignature` handles both.
    signature: readSignature(pick('owner_signature') || asText(d.signature)),
  }
}

const asText = (v: unknown) => (typeof v === 'string' ? v : '')


/**
 * `documents.signature` is a single text column. This app records more than a
 * name — the mode, the drawn image, the typed font — so it stores JSON there.
 * Older rows hold a bare string: a data URL is a drawing, anything else is a
 * typed name.
 */
export function readSignature(raw: string | null | undefined): Signature | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
      return parsed as Signature
    }
  } catch {
    // Not JSON — fall through to the legacy shapes below.
  }
  if (raw.startsWith('data:image')) {
    return { name: '', mode: 'draw', drawing: raw, signedAt: '' }
  }
  return { name: raw, mode: 'type', signedAt: '' }
}

const DOC_STATUS: Record<string, SendStatus> = {
  pending: 'sent',
  sent: 'sent',
  viewed: 'viewed',
  signed: 'signed',
  declined: 'declined',
}

const stamp = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(iso))
    : ''

/** A database row as the rest of the app expects to see it. */
export function toSend(r: DocumentRow): ContractSend {
  const form = r.form_data ?? {}
  const snap = snapshotOf(form)
  const sentAt = r.sent_at ?? r.created_at

  return {
    token: r.token,
    officeId: r.owner_id ?? '',
    // A document raised by the contract platform has no snapshot — its office
    // and details sit flat in `form_data`. Falling back to that is what lets
    // this app read the agreements it did not itself send.
    officeName: snap.office?.name || asText(form.company_name),
    // Not `sig_company_by` — that column holds the signature image, not a name.
    ownerName: snap.office?.ownerName || asText(form.notice_company_attn) || asText(form.sig_company_print),
    // The template is frozen at send time; the code copy is only a fallback for
    // documents raised before snapshots existed.
    template: snap.template ?? ICA_TEMPLATE,
    details: readDetails(snap.details ?? form),
    logo: snap.office?.logo || asText(form.company_logo) || undefined,
    prospect: {
      name: r.recipient_name || asText(form.contractor_name) || snap.prospect?.name || '',
      email: r.recipient_email ?? snap.prospect?.email ?? '',
      phone: r.recipient_phone ?? snap.prospect?.phone ?? '',
    },
    status: DOC_STATUS[r.status] ?? 'sent',
    sentAt: stamp(sentAt),
    sentAtMs: sentAt ? new Date(sentAt).getTime() : Date.now(),
    reminders: r.reminders ?? [],
    remindersStopped: r.reminders_stopped,
    viewedAt: r.first_accessed_at ? stamp(r.first_accessed_at) : undefined,
    accessedOn: r.first_accessed_at ? r.first_accessed_at.slice(0, 10) : undefined,
    signedAt: r.signed_at ? stamp(r.signed_at) : undefined,
    signature: readSignature(r.signature),
    signerValues: signerValuesOf(form),
    raw: Object.fromEntries(
      Object.entries(form).filter(([k]) => k !== SNAPSHOT_KEY && k !== SIGNER_KEY),
    ) as Record<string, string>,
  }
}

/* ── The console's view of every document ────────────────── */

/**
 * Documents, cached for the admin screens.
 *
 * The drawer, the Contracts page and the pipeline all ask "has this person been
 * sent a contract, and did they open it". That used to be answered from
 * localStorage, so a real document raised anywhere else read as "not sent".
 * One shared, database-backed cache answers it for all of them.
 */
let cache: ContractSend[] = []
let cacheLoaded = false
const cacheListeners = new Set<() => void>()
let cacheInFlight: Promise<void> | null = null

export function hydrateDocuments(): Promise<void> {
  cacheInFlight ??= (async () => {
    try {
      cache = await fetchDocuments()
      cacheLoaded = true
      cacheListeners.forEach((l) => l())
    } finally {
      cacheInFlight = null
    }
  })()
  return cacheInFlight
}

export function useDocuments() {
  useSyncExternalStore(
    (l) => {
      cacheListeners.add(l)
      return () => cacheListeners.delete(l)
    },
    () => cache,
    () => cache,
  )
  useEffect(() => {
    void hydrateDocuments()
  }, [])
  return { documents: cache, loading: !cacheLoaded }
}

const sameEmail = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/** The most recent document sent to one person, from the cache. */
export const documentFor = (email: string) =>
  email ? cache.find((s) => sameEmail(s.prospect.email, email)) : undefined

/** Every document raised for one office. */
export const documentsForOffice = (officeId: string) =>
  cache.filter((s) => s.officeId === officeId)

/** Everything the signed-in user may see, for non-React callers. */
export const allDocuments = () => cache

/** Drop the cache on sign-out so nothing survives into the next session. */
export function clearDocuments() {
  cache = []
  cacheLoaded = false
  cacheInFlight = null
  cacheListeners.forEach((l) => l())
}

/* ── Reading ─────────────────────────────────────────────── */

/**
 * Every document this viewer may see. RLS decides the scope — an admin gets all
 * of them, an owner only their own office's.
 */
export async function fetchDocuments(): Promise<ContractSend[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('documents')
    .select(DOC_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('fetchDocuments', error.message)
    return []
  }
  return (data as unknown as DocumentRow[]).map(toSend)
}

/**
 * One document, by the token in the signing link.
 *
 * Goes through `get_document`, which is SECURITY DEFINER and granted to anon:
 * the token is the capability, and RLS cannot express "only the row whose token
 * you already hold" without opening the table to everyone. The call also stamps
 * `first_accessed_at` and flips pending → viewed, so opening the link is what
 * records that they opened it.
 */
export async function fetchDocumentByToken(token: string): Promise<ContractSend | null> {
  if (!supabase || !token) return null

  /*
   * Pull the UUID out of whatever arrived.
   *
   * A signing link travels through email and SMS, and both mangle it: a mail
   * client that autolinks "…480516." swallows the sentence's full stop into
   * the href, a copy-paste picks up a trailing bracket or a newline. Any of
   * those fails the uuid cast, and the page then tells someone holding a
   * perfectly good link that it is invalid.
   */
  const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.exec(token)?.[0]
  if (!uuid) return null

  const { data, error } = await supabase.rpc('get_document', { p_token: uuid })
  if (error) {
    console.error('fetchDocumentByToken', error.message)
    return null
  }
  const row = (Array.isArray(data) ? data[0] : data) as DocumentRow | undefined
  return row ? toSend(row) : null
}

/* ── Raising one ─────────────────────────────────────────── */

/* ── Field derivation ────────────────────────────────────── */

/**
 * The house term, on every agreement. Offices used to store their own
 * `term_years` and it varied; one standard term is the decision, so the stored
 * value is deliberately ignored rather than read as a default.
 */
export const TERM_YEARS = 3

/**
 * The full field set a generated document carries.
 *
 * An office stores six things — company name, address, city, governing state,
 * a signature image and a term length. A real document carries thirty-two: the
 * notices blocks, the signature blocks and the term dates are all *derived* at
 * send time. This mirrors an executed agreement exactly, so a document raised
 * here renders identically to one the contract platform produced.
 *
 * Contractor fields are deliberately left empty. They are filled at signing,
 * by the contractor, and an unsigned agreement should show them blank.
 */
export function deriveDocumentFields(args: {
  /** The office's stored answers, in the platform's own vocabulary. */
  stored: Record<string, unknown>
  /** The office's name. This, not the stored value, is the business name. */
  officeName: string
  /**
   * The office's logo, snapshotted in. The signing page is anonymous and
   * cannot read `owners`, so a logo that stays there never reaches the person
   * signing. Empty means no logo, and no logo means none is drawn.
   */
  logo?: string
  /** `owners.owner_name` — the only source for the notices "attn" line. */
  ownerName: string
  prospect: { name: string }
}): Record<string, string> {
  const s = args.stored
  const str = (k: string) => (typeof s[k] === 'string' ? (s[k] as string) : '')

  /*
   * Today, always — never the office's stored `agreement_date`.
   *
   * That stored value is whenever the owner filled in their setup form. Read
   * as the agreement date it would freeze every contract that office ever
   * sends to that one day: one office's setup is dated 4 August, so a contract
   * raised in December would still say the parties agreed in August.
   */
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const d = new Date(`${iso}T00:00:00`)
  const month = d.toLocaleString('en-US', { month: 'long' })
  const yy = String(d.getFullYear()).slice(2)

  // The business name is the office's name, always — not whatever happens to
  // be sitting in the stored contract details, which in at least one office is
  // an email address.
  const company = args.officeName || str('company_name')

  /*
   * Deliberately minimal.
   *
   * Only four things go onto an agreement right now: the entity name, the
   * dates, the term, and the applicant's own details. The offices' stored
   * addresses, cities, governing states and countersignatures are held back
   * until they have been verified — twelve different people typed them, in
   * twelve different formats, and an unverified address on an executed
   * contract is worse than a blank one the owner fills in afterwards.
   *
   * Restoring any of them is a one-line change here: read `str('company_place')`
   * and so on, exactly as before.
   */
  return {
    intro_day: String(d.getDate()),
    intro_month: month,
    intro_year: yy,
    company_name: company,
    company_place: '',
    company_city: '',
    governing_state: '',
    agreement_date: iso,
    contractor_name: args.prospect.name,
    contractor_place: '',
    // Term
    term_years: String(TERM_YEARS),
    term_commence: `${month} ${d.getDate()}`,
    term_commence_year: yy,
    term_expire_year: String(d.getFullYear() + TERM_YEARS).slice(2),
    // Notices — the company block restates the company fields; the attn line
    // is the owner personally, which is why an office with no `owner_name`
    // leaves it blank.
    // Notices: the entity is named, the rest of the block stays blank.
    notice_company_entity: company,
    notice_company_address: '',
    notice_company_city: '',
    notice_company_attn: '',
    notice_contractor_entity: args.prospect.name,
    notice_contractor_address: '',
    notice_contractor_city: '',
    notice_contractor_attn: args.prospect.name,
    // Execution. The countersignature is held back with the rest — the owner
    // signs, or completes it, after the applicant has.
    sig_company_org: company,
    sig_company_by: '',
    sig_company_print: company,
    sig_company_title: 'Owner',
    sig_company_date: `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
    sig_contractor_org: args.prospect.name,
    sig_contractor_by: '',
    sig_contractor_print: '',
    sig_contractor_title: 'Independent Contractor',
    sig_contractor_date: '',
    owner_signature: '',
    // Held back with the rest. At this stage the agreement exists to collect
    // the applicant's details and their signature; the branded, countersigned
    // copy is what goes out afterwards. Restore with `args.logo ?? ''`.
    company_logo: '',
  }
}

export interface RaiseArgs {
  /** The inviting office. Never taken from prospect input (R2/R3). */
  officeId: string
  /**
   * Who it is for. Linking the prospect to the document is what lets signing
   * complete their journey server-side — the signer is anonymous and cannot
   * move their own pipeline stage.
   */
  prospectId?: string
  officeName: string
  ownerName: string
  logo?: string
  prospect: { name: string; email: string; phone: string }
}

/**
 * Send an agreement for signature.
 *
 * The token is generated by the database (`gen_random_uuid()`), not here — the
 * one credential to a document should not be minted by a client that could be
 * running anything.
 */
export async function raiseDocument(
  args: RaiseArgs,
): Promise<{ ok: true; send: ContractSend } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured for this site.' }

  // The office's own setup, read here rather than passed in, so every caller
  // raises the same document for the same office.
  const { data: oc } = await supabase
    .from('owner_contracts')
    .select('details,required_fields,custom_clauses,block_overrides')
    .eq('owner_id', args.officeId)
    .eq('contract_type', CONTRACT_TYPE)
    .maybeSingle()

  const fields = deriveDocumentFields({
    stored: (oc?.details as Record<string, unknown>) ?? {},
    officeName: args.officeName,
    ownerName: args.ownerName,
    logo: args.logo,
    prospect: args.prospect,
  })

  const { data, error } = await supabase
    .from('documents')
    .insert({
      owner_id: args.officeId,
      title: ICA_TEMPLATE.name,
      contract_type: CONTRACT_TYPE,
      recipient_name: args.prospect.name,
      recipient_email: args.prospect.email,
      recipient_phone: args.prospect.phone,
      // Written flat, in the platform's own vocabulary, so the document is
      // readable by both this console and the contract app.
      form_data: fields,
      // Any amendments the office has made travel with the document, frozen at
      // send time — three offices have block overrides.
      required_fields: oc?.required_fields ?? [],
      custom_clauses: oc?.custom_clauses ?? [],
      block_overrides: oc?.block_overrides ?? {},
      status: 'pending',
      sent_at: new Date().toISOString(),
    })
    .select(DOC_COLUMNS)
    .single()

  if (error) {
    console.error('raiseDocument', error.message)
    return { ok: false, error: error.message }
  }

  const row = data as unknown as DocumentRow
  if (args.prospectId) {
    // Not fatal if it fails — the document exists and its link works either
    // way; what is lost is the automatic stage move when they sign.
    const { error: linkError } = await supabase
      .from('prospects')
      .update({ document_id: row.id, stage: 'sent' })
      .eq('id', args.prospectId)
    if (linkError) console.error('raiseDocument link', linkError.message)
  }

  return { ok: true, send: toSend(row) }
}

/**
 * Record that a reminder went out.
 *
 * Written to the document itself, so the schedule survives a closed browser and
 * two consoles cannot chase the same person twice.
 */
export async function recordReminderSent(
  token: string,
  type: string,
  final: boolean,
): Promise<void> {
  if (!supabase) return
  const { data } = await supabase
    .from('documents')
    .select('reminders')
    .eq('token', token)
    .maybeSingle()

  const already = (data?.reminders as string[]) ?? []
  if (already.includes(type)) return

  const patch: Record<string, unknown> = {
    reminders: [...already, type],
    updated_at: new Date().toISOString(),
  }
  if (final) patch.reminders_stopped = true

  const { error } = await supabase.from('documents').update(patch).eq('token', token)
  if (error) console.error('recordReminderSent', error.message)
}

/** Record a decline, with the reason they gave. */
export async function declineDocument(
  token: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured for this site.' }
  const { error } = await supabase.rpc('decline_document', { p_token: token, p_reason: reason })
  if (error) {
    console.error('declineDocument', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/* ── Signing ─────────────────────────────────────────────── */

/**
 * Record a signature.
 *
 * `sign_document` replaces `form_data` wholesale, so the snapshot has to be
 * written back alongside the signer's answers — losing it would leave a signed
 * agreement that no longer knows what it said.
 */
export async function signDocument(
  send: ContractSend,
  signature: Signature,
  signerValues: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured for this site.' }

  const now = new Date()
  const name = signature.name.trim() || send.prospect.name
  const address = signerValues.preparer_address ?? ''
  const city = signerValues.preparer_city ?? ''

  // Merged into what the document already holds, never over it: the RPC
  // replaces `form_data` outright, so anything omitted here is destroyed.
  const form: Record<string, string> = {
    ...(send.raw ?? {}),
    contractor_name: name,
    contractor_place: address,
    notice_contractor_entity: name,
    notice_contractor_address: address,
    notice_contractor_city: city,
    notice_contractor_attn: name,
    sig_contractor_org: name,
    sig_contractor_by: signature.drawing ?? name,
    sig_contractor_print: name,
    sig_contractor_title: 'Independent Contractor',
    sig_contractor_date: `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`,
  }

  const { error } = await supabase.rpc('sign_document', {
    p_token: send.token,
    // A bare data URL or a typed name, as the platform stores it — not this
    // app's Signature object, which its renderer would not understand.
    p_signature: signature.drawing ?? signature.name,
    p_form: form,
  })
  if (error) {
    console.error('signDocument', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

/* ── The office's own contract setup ─────────────────────── */

export interface OwnerContract {
  details: ContractDetails
  requiredFields: string[]
  saved: boolean
}

/** One office's saved answers, from `owner_contracts`. */
export async function fetchOwnerContract(
  officeId: string,
  contractType = 'independent_contractor',
): Promise<OwnerContract | null> {
  if (!supabase || !officeId) return null
  const { data, error } = await supabase
    .from('owner_contracts')
    .select('hero_title,hero_subtitle,details,saved,required_fields')
    .eq('owner_id', officeId)
    .eq('contract_type', contractType)
    .maybeSingle()
  if (error) {
    console.error('fetchOwnerContract', error.message)
    return null
  }
  if (!data) return null

  const details = readDetails(data.details)
  return {
    details: {
      ...details,
      heroTitle: String(data.hero_title || details.heroTitle),
      heroSubtitle: String(data.hero_subtitle || details.heroSubtitle),
    },
    requiredFields: (data.required_fields as string[]) ?? [],
    saved: Boolean(data.saved),
  }
}

/** Save an office's answers. Upserts on (owner_id, contract_type). */
export async function saveOwnerContract(
  officeId: string,
  details: ContractDetails,
  contractType = 'independent_contractor',
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured for this site.' }
  const { error } = await supabase.from('owner_contracts').upsert(
    {
      owner_id: officeId,
      contract_type: contractType,
      hero_title: details.heroTitle,
      hero_subtitle: details.heroSubtitle,
      details: {
        entityName: details.entityName,
        businessAddress: details.businessAddress,
        cityStateZip: details.cityStateZip,
        governingState: details.governingState,
        agreementDate: details.agreementDate,
        termLength: details.termLength,
        values: details.values,
        signature: details.signature ? JSON.stringify(details.signature) : null,
      },
      saved: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'owner_id,contract_type' },
  )
  if (error) {
    console.error('saveOwnerContract', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
