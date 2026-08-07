import { useSyncExternalStore } from 'react'
import { offices, preparers as seedPreparers } from '../data/mock'
import { sessionById } from './sessionStore'
import type { Activity, Preparer, Stage } from '../types'

/**
 * Everyone who has registered through an invite link, on top of the seeded
 * sample data. Persisted to localStorage so a registration is still there after
 * a reload and is visible to both the office owner and the Higher View admin.
 *
 * Replace read/commit with API calls when the central GHL account is wired up.
 */

// Bumped when the stored shape changes, so old copies are discarded.
const KEY = 'hv_prospects_v2'

/** One thing that happened to one preparer, newest first within a person. */
export interface PreparerEvent {
  id: string
  /** Who or what did it — automation, or the person taking manual action. */
  actor: 'automation' | 'manual'
  text: string
  at: string
  stage?: Stage
}

interface ProspectStore {
  /** Registrations captured by the public form, newest first. */
  registered: Preparer[]
  /** Feed entries generated as things happen. */
  activity: Activity[]
  /**
   * Manual stage moves, keyed by preparer id. Seeded samples are immutable, so
   * an override is the only way their stage can change — real data will carry
   * the stage on the record itself.
   */
  stages: Record<string, Stage>
  /** Per-preparer history of manual actions, keyed by preparer id. */
  events: Record<string, PreparerEvent[]>
}

const EMPTY: ProspectStore = { registered: [], activity: [], stages: {}, events: {} }

function read(): ProspectStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as ProspectStore
    p.registered ??= []
    p.activity ??= []
    p.stages ??= {}
    p.events ??= {}
    return p
  } catch {
    return EMPTY
  }
}

let store = read()
const listeners = new Set<() => void>()

function commit(next: ProspectStore) {
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

/** Registrations first, then the seeded samples, with manual moves applied. */
export function allPreparers(): Preparer[] {
  return [...store.registered, ...seedPreparers].map((p) => {
    const moved = store.stages[p.id]
    if (!moved || moved === p.stage) return p
    // Signing is the only transition that stamps a date on the record.
    const signedOn = p.signedOn ?? (SIGNED_STAGES.includes(moved) ? shortDate() : undefined)
    return { ...p, stage: moved, signedOn }
  })
}

const SIGNED_STAGES: Stage[] = ['signed', 'orientation', 'onboarded']

export function useProspects() {
  useSyncExternalStore(subscribe, () => store, () => store)
  return { preparers: allPreparers(), activity: [...store.activity, ...[]] }
}

export const preparerById = (id: string | undefined) =>
  id ? allPreparers().find((p) => p.id === id) : undefined

/** Manual actions taken on one preparer, newest first. */
export const eventsFor = (id: string): PreparerEvent[] => store.events[id] ?? []

/** Live list scoped to one office. */
export const preparersForOffice = (officeId: string) =>
  allPreparers().filter((p) => p.officeId === officeId)

export const isRegistered = (id: string) => store.registered.some((p) => p.id === id)

/* ── Registration ────────────────────────────────────────── */

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?'

const shortDate = () =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  }).format(new Date())

export interface RegistrationInput {
  officeId: string
  name: string
  email: string
  phone: string
  /** Session id from the published catalog. */
  sessionId: string
}

/**
 * Creates the contact in the central account and books them onto their chosen
 * session — pipeline stage `scheduled`, per Phase 2 of the blueprint.
 */
export function registerProspect(input: RegistrationInput): Preparer {
  const office = offices.find((o) => o.id === input.officeId)
  const session = sessionById(input.sessionId)

  const person: Preparer = {
    id: `reg-${Date.now().toString(36)}`,
    name: input.name,
    email: input.email,
    phone: input.phone,
    initials: initialsOf(input.name),
    officeId: input.officeId,
    office: office?.name ?? 'Unknown office',
    stage: 'scheduled',
    session: session ? `${session.date.replace(/^\w+ · /, '')} · ${session.time.split(' ET')[0]}` : '—',
    invited: shortDate(),
    // The owner of the link is the referrer, by definition. Offices whose
    // owner name hasn't been collected are credited by business name.
    referredBy: office?.owner || office?.name,
  }

  const entry: Activity = {
    id: `act-${person.id}`,
    tone: 'good',
    text: `<b>${person.name}</b> registered for the ${person.session} Discovery Session`,
    meta: `${person.office} · just now`,
  }

  commit({
    ...store,
    registered: [person, ...store.registered],
    activity: [entry, ...store.activity].slice(0, 40),
  })
  return person
}

const timeStamp = () =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())

/** Record something that happened to one preparer. Shows in their drawer. */
export function logEvent(id: string, text: string, actor: PreparerEvent['actor'], stage?: Stage) {
  const event: PreparerEvent = {
    id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    text,
    at: timeStamp(),
    stage,
  }
  commit({ ...store, events: { ...store.events, [id]: [event, ...(store.events[id] ?? [])] } })
}

/**
 * Advance someone's stage — used when a contract is signed, and by the manual
 * actions in the preparer drawer. Registered prospects are edited in place;
 * seeded samples get an override, since `mock.ts` is read-only.
 */
export function setStage(id: string, stage: Stage) {
  commit({
    ...store,
    registered: store.registered.map((p) => (p.id === id ? { ...p, stage } : p)),
    stages: { ...store.stages, [id]: stage },
  })
}

/**
 * A stage move taken by hand from the drawer. Logs it against the preparer and
 * puts it in the shared activity feed, so a manual override is never silent.
 */
export function moveStage(p: Preparer, stage: Stage, label: string) {
  setStage(p.id, stage)
  logEvent(p.id, label, 'manual', stage)
  const entry: Activity = {
    id: `act-${p.id}-${Date.now().toString(36)}`,
    tone: stage === 'followup' ? 'bad' : stage === 'onboarded' || stage === 'signed' ? 'good' : 'gold',
    text: `<b>${p.name}</b> — ${label.toLowerCase()} (manual)`,
    meta: `${p.office} · just now`,
  }
  commit({ ...store, activity: [entry, ...store.activity].slice(0, 40) })
}

/** Match a registered prospect by email, so signing can move the right person. */
export const findByEmail = (email: string) =>
  allPreparers().find((p) => p.email.toLowerCase() === email.trim().toLowerCase())
