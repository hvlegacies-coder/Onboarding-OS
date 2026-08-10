import { createClient } from '@supabase/supabase-js'
import type { Preparer, Stage } from '../types'

/**
 * The Supabase client.
 *
 * Only the publishable key ever reaches the browser. Every table is behind Row
 * Level Security, so this key grants nothing on its own — what a caller can see
 * is decided by their signed-in identity, server-side.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** False when the environment isn't set, so the UI can say so plainly. */
export const supabaseReady = Boolean(url && key)

export const supabase = supabaseReady
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null

/** One office, as the app needs it. Mirrors the `owners` table. */
export interface Office {
  id: string
  name: string
  slug: string
  ownerName: string
  initials: string
  logoUrl: string | null
  email: string | null
  phone: string | null
}

const toOffice = (r: Record<string, unknown>): Office => ({
  id: String(r.id),
  // company_name is the trading name; `name` is whoever registered it.
  name: String(r.company_name || r.name || 'Untitled office'),
  slug: String(r.slug ?? ''),
  ownerName: String(r.owner_name || r.name || ''),
  initials: String(r.initials || '??'),
  logoUrl: (r.logo_url as string) ?? null,
  email: (r.email as string) ?? null,
  phone: (r.phone as string) ?? null,
})

const COLUMNS = 'id,name,company_name,slug,owner_name,initials,logo_url,email,phone'

/** Offices this viewer may see. RLS narrows it to one for an office owner. */
export async function fetchOffices(): Promise<Office[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('owners').select(COLUMNS).order('name')
  if (error) {
    console.error('fetchOffices', error.message)
    return []
  }
  return (data ?? []).map(toOffice)
}

/**
 * Resolve an office from an invite link.
 *
 * Public — a signed-out prospect calls this. RLS blocks anonymous reads of
 * `owners`, so this goes through the same slug lookup the server uses when
 * registering, keeping one source of truth for "which office is this link".
 */
export async function fetchOfficeBySlug(slug: string): Promise<Office | null> {
  if (!supabase || !slug) return null
  const { data, error } = await supabase.rpc('office_by_slug', { p_slug: slug.toLowerCase() })
  if (error) {
    console.error('fetchOfficeBySlug', error.message)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  return row ? toOffice(row) : null
}

export interface PublicSession {
  id: string
  kind: string
  dateOn: string
  timeLabel: string
}

/** Bookable Discovery Sessions, from today onwards. */
export async function fetchPublicSessions(): Promise<PublicSession[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('public_sessions')
  if (error) {
    console.error('fetchPublicSessions', error.message)
    return []
  }
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    kind: String(r.kind),
    dateOn: String(r.date_on),
    timeLabel: String(r.time_label),
  }))
}

/**
 * Book a seat. The office is resolved from the slug inside the database, so a
 * prospect cannot be attributed to an office they didn't come from (R2).
 */
export async function registerProspect(input: {
  slug: string
  name: string
  email: string
  phone: string
  sessionId: string | null
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.rpc('register_prospect', {
    p_slug: input.slug.toLowerCase(),
    p_name: input.name,
    p_email: input.email,
    p_phone: input.phone,
    p_session: input.sessionId,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: String(data) }
}

/** Formats '2026-09-06' as 'Sun · Sep 6'. */
export function formatSessionDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} · ${d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`
}

/* ── Prospects ───────────────────────────────────────────── */

/**
 * Everyone the signed-in user is allowed to see. There is no office filter
 * here on purpose: RLS decides the scope, so an admin gets every office and an
 * owner gets only their own. Filtering here as well would only hide a policy
 * mistake rather than prevent one.
 */
export async function fetchProspects(): Promise<{
  people: Preparer[]
  events: Record<string, PreparerEventRow[]>
}> {
  if (!supabase) return { people: [], events: {} }

  const { data, error } = await supabase
    .from('prospects')
    .select(
      'id,name,email,phone,stage,invited_on,signed_on,referred_by,owner_id,' +
        'owners(name,company_name),sessions(date_on,time_label)',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('fetchProspects', error.message)
    return { people: [], events: {} }
  }

  // The client is untyped, so PostgREST can't infer the shape of an embedded
  // select. This describes what the query above actually returns.
  const rows = (data ?? []) as unknown as ProspectRow[]

  const people: Preparer[] = rows.map((r) => {
    const office = one(r.owners)
    const session = one(r.sessions)
    return {
      id: String(r.id),
      name: String(r.name),
      email: String(r.email),
      phone: String(r.phone ?? ''),
      initials: initialsOf(String(r.name)),
      officeId: String(r.owner_id),
      office: String(office?.company_name || office?.name || 'Unknown office'),
      stage: r.stage as Stage,
      session: session ? `${formatSessionDate(session.date_on)} · ${session.time_label}` : '—',
      invited: shortDate(String(r.invited_on)),
      referredBy: (r.referred_by as string) || undefined,
      signedOn: r.signed_on ? shortDate(String(r.signed_on)) : undefined,
    }
  })

  const ids = people.map((p) => p.id)
  const events: Record<string, PreparerEventRow[]> = {}
  if (ids.length) {
    const { data: evs } = await supabase
      .from('prospect_events')
      .select('id,prospect_id,actor,body,stage,created_at')
      .in('prospect_id', ids)
      .order('created_at', { ascending: false })
    for (const e of (evs ?? []) as unknown as EventRow[]) {
      ;(events[String(e.prospect_id)] ??= []).push({
        id: String(e.id),
        actor: e.actor === 'manual' ? 'manual' : 'automation',
        text: String(e.body),
        at: stamp(String(e.created_at)),
        stage: (e.stage as Stage) ?? undefined,
      })
    }
  }

  return { people, events }
}

interface ProspectRow {
  id: string
  name: string
  email: string
  phone: string | null
  stage: Stage
  invited_on: string
  signed_on: string | null
  referred_by: string | null
  owner_id: string
  owners: { name: string | null; company_name: string | null } | null
  sessions: { date_on: string; time_label: string } | null
}

interface EventRow {
  id: string
  prospect_id: string
  actor: string
  body: string
  stage: Stage | null
  created_at: string
}

export interface PreparerEventRow {
  id: string
  actor: 'automation' | 'manual'
  text: string
  at: string
  stage?: Stage
}

/** Move someone along the pipeline. Signing is what stamps a date (R5). */
export async function updateProspectStage(id: string, stage: Stage) {
  if (!supabase) return
  const patch: Record<string, unknown> = { stage }
  if (stage === 'signed') patch.signed_on = new Date().toISOString().slice(0, 10)
  const { error } = await supabase.from('prospects').update(patch).eq('id', id)
  if (error) console.error('updateProspectStage', error.message)
}

/**
 * Delete a prospect outright. Their events cascade with them.
 *
 * A document raised for them is deliberately left alone: `document_id` points
 * from the prospect at the document, so nothing breaks, and a signed agreement
 * is a record in its own right that outlives the pipeline row.
 *
 * RLS decides who may do this — an owner can only reach their own office's
 * rows, whatever the UI happens to offer.
 */
export async function deleteProspect(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: true }
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) {
    console.error('deleteProspect', error.message)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function insertProspectEvent(
  prospectId: string,
  body: string,
  actor: 'automation' | 'manual',
  stage?: Stage,
) {
  if (!supabase) return
  const { error } = await supabase
    .from('prospect_events')
    .insert({ prospect_id: prospectId, body, actor, stage: stage ?? null })
  if (error) console.error('insertProspectEvent', error.message)
}

/** PostgREST types an embedded row as an array; at most one comes back here. */
const one = <T>(v: T | T[] | null): T | undefined =>
  (Array.isArray(v) ? v[0] : v) ?? undefined

const initialsOf = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

const shortDate = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const stamp = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

/**
 * The chosen session as a timestamp GoHighLevel can parse, e.g.
 * `2026-08-09 06:00 PM`. GHL accepts `YYYY-MM-DD HH:MM A` and reads it in the
 * location's own timezone, so this emits local wall time with no offset.
 *
 * `timeLabel` is a display string ("6:00 PM ET · Zoom"), so the clock time is
 * pulled out of it. If it ever stops carrying one, the date alone goes out
 * rather than an invented time.
 */
export function sessionDateTime(dateOn: string, timeLabel: string): string {
  const date = dateOn.slice(0, 10)
  const m = timeLabel.match(/(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]/)
  if (!m) return date
  return `${date} ${m[1].padStart(2, '0')}:${m[2]} ${m[3].toUpperCase()}M`
}

/**
 * Sessions are quoted in Eastern time. This is the IANA zone, not a fixed
 * "EST": Eastern is EST (UTC-5) only from November to March and EDT (UTC-4)
 * the rest of the year, so pinning EST would put every summer session an hour
 * out. Anything consuming these values should use the zone, not the label.
 */
export const SESSION_TZ = 'America/New_York'

/** The zone's offset in minutes at a given instant, DST included. */
function zoneOffsetMinutes(instant: Date, tz: string): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' })
      .formatToParts(instant)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00'
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

/** Wall-clock parts of a session, or null when the label carries no time. */
function sessionParts(dateOn: string, timeLabel: string) {
  const [y, mo, d] = dateOn.slice(0, 10).split('-').map(Number)
  const m = timeLabel.match(/(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]/)
  if (!m || !y || !mo || !d) return null
  let h = Number(m[1]) % 12
  if (m[3].toUpperCase() === 'P') h += 12
  return { y, mo, d, h, mi: Number(m[2]) }
}

/**
 * The session as an unambiguous instant, e.g. `2026-08-09T18:00:00-04:00`.
 * Carries the real offset for that date, so a consumer cannot land on the
 * wrong hour whatever its own timezone setting happens to be.
 */
export function sessionIso(dateOn: string, timeLabel: string): string {
  const p = sessionParts(dateOn, timeLabel)
  if (!p) return ''
  const guess = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi)
  // The offset depends on the instant and the instant on the offset; re-read
  // the zone once the first correction is applied so DST changeovers settle.
  let off = zoneOffsetMinutes(new Date(guess), SESSION_TZ)
  off = zoneOffsetMinutes(new Date(guess - off * 60000), SESSION_TZ)
  const a = Math.abs(off)
  const label = `${off < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateOn.slice(0, 10)}T${pad(p.h)}:${pad(p.mi)}:00${label}`
}
