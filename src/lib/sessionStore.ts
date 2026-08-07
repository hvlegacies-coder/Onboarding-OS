import { useSyncExternalStore } from 'react'
import { sessions as seedSessions } from '../data/mock'
import type { Session } from '../types'

/**
 * The session calendar — the seeded samples plus anything an admin adds.
 *
 * This is the single catalog every surface reads: the Sessions page, and the
 * public invitation form behind every office's invite link. Adding a Discovery
 * Session here is what makes it selectable to prospects, with no per-office
 * step, because all 49 offices share one calendar.
 *
 * Persisted to localStorage, like the other stores — swap read/commit for API
 * calls when the real calendar is wired up.
 */

const KEY = 'hv_sessions_v1'

interface SessionStore {
  /** Sessions created in the console. */
  created: Session[]
  /** Seeded ids that have been removed, so they stay removed across reloads. */
  hidden: string[]
}

const EMPTY: SessionStore = { created: [], hidden: [] }

function read(): SessionStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as SessionStore
    p.created ??= []
    p.hidden ??= []
    return p
  } catch {
    return EMPTY
  }
}

let store = read()
const listeners = new Set<() => void>()

function commit(next: SessionStore) {
  store = next
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
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

/** Every session, soonest first. Undated seeds keep their original order. */
export function allSessions(): Session[] {
  return [...store.created, ...seedSessions]
    .filter((s) => !store.hidden.includes(s.id))
    .sort((a, b) => (a.dateIso ?? '9999').localeCompare(b.dateIso ?? '9999'))
}

export function useSessions() {
  useSyncExternalStore(subscribe, () => store, () => store)
  return { sessions: allSessions(), isCustom: (id: string) => store.created.some((s) => s.id === id) }
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

/** "2026-08-09" -> "Sun · Aug 9" */
function displayDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  const wd = d.toLocaleDateString('en-US', { weekday: 'short' })
  const md = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${wd} · ${md}`
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

export function createSession(input: SessionInput): Session {
  const session: Session = {
    id: `ses-${Date.now().toString(36)}`,
    type: input.type,
    dateIso: input.dateIso,
    date: displayDate(input.dateIso),
    time: displayTime(input.time, input.place.trim()),
    // Real registrations accrue from the invitation form; nothing is invented.
    registered: 0,
    note:
      input.note.trim() ||
      (input.type === 'Discovery Session' ? 'open for registration' : 'signed preparers invited'),
  }
  commit({ ...store, created: [session, ...store.created] })
  return session
}

export function removeSession(id: string) {
  commit({
    created: store.created.filter((s) => s.id !== id),
    hidden: store.created.some((s) => s.id === id) ? store.hidden : [...store.hidden, id],
  })
}
