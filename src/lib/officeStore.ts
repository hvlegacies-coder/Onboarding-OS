import { useSyncExternalStore } from 'react'
import { offices } from '../data/mock'
import type { Office } from '../types'

/**
 * Owner sign-in overrides.
 *
 * `mock.ts` ships a seed password per office; anything changed in the console
 * is kept here instead, so the seed file stays read-only and a reset is just a
 * matter of clearing this key.
 *
 * PROTOTYPE ONLY — these are readable by anyone with devtools, exactly like the
 * seeds. This exists so an operator can rotate a demo credential, not to be a
 * real password system. It goes away with proper auth.
 */

const KEY = 'hv_office_creds_v1'

interface CredStore {
  /** officeId -> replacement password. */
  passwords: Record<string, string>
}

const EMPTY: CredStore = { passwords: {} }

function read(): CredStore {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const p = JSON.parse(raw) as CredStore
    p.passwords ??= {}
    return p
  } catch {
    return EMPTY
  }
}

let store = read()
const listeners = new Set<() => void>()

function commit(next: CredStore) {
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

export function useOfficeCreds() {
  return useSyncExternalStore(subscribe, () => store, () => store)
}

/** The password that actually signs this office in right now. */
export const passwordFor = (office: Office) => store.passwords[office.id] ?? office.ownerPassword

export const isPasswordChanged = (office: Office) => office.id in store.passwords

export function setPassword(officeId: string, password: string) {
  commit({ passwords: { ...store.passwords, [officeId]: password } })
}

/** Drops the override, putting the seeded password back. */
export function resetPassword(officeId: string) {
  const passwords = { ...store.passwords }
  delete passwords[officeId]
  commit({ passwords })
}

/**
 * Match an office owner's sign-in. Replaces the seed-only check in `mock.ts`
 * so a changed password takes effect immediately.
 */
export const officeByCredentials = (username: string, password: string) =>
  offices.find(
    (o) =>
      o.ownerUsername.toLowerCase() === username.trim().toLowerCase() &&
      passwordFor(o) === password,
  )
