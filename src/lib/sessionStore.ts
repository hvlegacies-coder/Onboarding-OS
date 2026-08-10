import { useEffect, useSyncExternalStore } from 'react'
import {
  deleteSession,
  fetchSessions,
  insertSession,
  supabaseReady,
  type SessionRow,
} from './supabase'
import type { Session } from '../types'

/**
 * The session calendar, read from and written to Supabase.
 *
 * This is the single catalog every surface reads: the Sessions page, and the
 * public invitation form behind every office's invite link. Adding a Discovery
 * Session here is what makes it selectable to prospects, with no per-office
 * step, because all offices share one calendar.
 *
 * The console used to keep its own copy in localStorage. That made this page a
 * private notepad — the invitation form has always read the database, so a
 * session published here reached nobody. One calendar, in one place.
 */

let store: Session[] = []
/** True once the calendar has been read from the database. */
let live = false
const listeners = new Set<() => void>()

function commit(next: Session[]) {
  store = next
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** "2026-08-09" -> "Sun · Aug 9" */
function displayDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
  const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${wd} · ${md}`
}

const defaultNote = (kind: string) =>
  kind === 'Discovery Session' ? 'open for registration' : 'signed preparers invited'

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  type: r.kind === 'New Preparer Orientation' ? 'New Preparer Orientation' : 'Discovery Session',
  dateIso: r.dateOn,
  date: displayDate(r.dateOn),
  time: r.timeLabel,
  registered: r.registered,
  note: r.note || defaultNote(r.kind),
})

let inFlight: Promise<void> | null = null

/** Pull the calendar. Safe to call from anywhere — concurrent calls share one request. */
export function hydrateSessions(): Promise<void> {
  if (!supabaseReady) return Promise.resolve()
  inFlight ??= (async () => {
    try {
      const rows = await fetchSessions()
      live = true
      commit(rows.map(toSession))
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

/** Every session, soonest first. Undated rows keep their original order. */
export function allSessions(): Session[] {
  return [...store].sort((a, b) => (a.dateIso ?? '9999').localeCompare(b.dateIso ?? '9999'))
}

export function useSessions() {
  useSyncExternalStore(subscribe, () => store, () => store)
  // Re-read on mount: another admin may have changed the calendar since this
  // tab last looked at it.
  useEffect(() => {
    void hydrateSessions()
  }, [])
  return { sessions: allSessions(), loading: supabaseReady && !live }
}

export const sessionById = (id: string | undefined) =>
  id ? allSessions().find((s) => s.id === id) : undefined

/** Discovery Sessions a prospect can still book — today onwards. */
export function bookableSessions(today = new Date().toISOString().slice(0, 10)): Session[] {
  return allSessions().filter(
    (s) => s.type === 'Discovery Session' && (!s.dateIso || s.dateIso >= today),
  )
}

/* ── Creating ────────────────────────────────────────────── */

export interface SessionInput {
  type: Session['type']
  /** yyyy-mm-dd from the date input. */
  dateIso: string
  /** HH:MM, 24-hour, from the time input. */
  time: string
  /** Where it happens — "Zoom", a room name, a dial-in. */
  place: string
  note: string
}

/** "18:00" -> "6:00 PM ET · Zoom" */
function displayTime(time: string, place: string) {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h)) return place ? `${time} · ${place}` : time
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  const clock = `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix} ET`
  return place ? `${clock} · ${place}` : clock
}

export async function createSession(
  input: SessionInput,
): Promise<{ ok: true; session: Session } | { ok: false; error: string }> {
  const res = await insertSession({
    kind: input.type,
    dateOn: input.dateIso,
    timeLabel: displayTime(input.time, input.place.trim()),
    note: input.note.trim(),
  })
  if (!res.ok) return res

  const session = toSession(res.row)
  commit([...store, session])
  return { ok: true, session }
}

export async function removeSession(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await deleteSession(id)
  if (!res.ok) return res
  commit(store.filter((s) => s.id !== id))
  return { ok: true }
}
