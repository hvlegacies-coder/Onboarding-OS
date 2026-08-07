import { createClient } from '@supabase/supabase-js'

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
