import { createContext, useContext, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { officeByCredentials } from '../../lib/officeStore'

export type Role = 'admin' | 'owner'

export interface Session {
  email: string
  role: Role
  /** Display name for the signed-in person. */
  name: string
  /** Set for owners only — scopes every view to this office. */
  officeId?: string
  officeName?: string
}

interface AuthCtx {
  session: Session | null
  authed: boolean
  isOwner: boolean
  signIn: (email: string, password: string, role: Role) => boolean
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)
const KEY = 'hv_session'

/**
 * PROTOTYPE ONLY — the seed platform-operator credential.
 *
 * This ships inside the browser bundle, so anyone who opens devtools can read it.
 * It exists so the console has a real login before a backend exists; replace the
 * whole check with a server-side auth call before this touches real data.
 * Office-owner credentials live alongside their office record in `data/mock.ts`.
 */
const SEED = {
  email: 'hvlegacies@gmail.com',
  password: 'Hello2026!',
  name: 'Quianna B.',
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const start = (next: Session) => {
    localStorage.setItem(KEY, JSON.stringify(next))
    setSession(next)
    return true
  }

  const signIn = (email: string, password: string, role: Role) => {
    if (role === 'admin') {
      if (email.trim().toLowerCase() !== SEED.email || password !== SEED.password) return false
      return start({ email: SEED.email, role: 'admin', name: SEED.name })
    }

    const office = officeByCredentials(email, password)
    if (!office) return false
    return start({
      email: office.ownerUsername,
      role: 'owner',
      name: office.owner,
      officeId: office.id,
      officeName: office.name,
    })
  }

  const signOut = () => {
    localStorage.removeItem(KEY)
    setSession(null)
  }

  return (
    <Ctx.Provider
      value={{ session, authed: session !== null, isOwner: session?.role === 'owner', signIn, signOut }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authed } = useAuth()
  const loc = useLocation()
  if (!authed) return <Navigate to="/login" state={{ from: loc }} replace />
  return <>{children}</>
}

/** Platform-operator-only areas. Owners get bounced to their own dashboard. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  if (session?.role !== 'admin') return <Navigate to="/my-office" replace />
  return <>{children}</>
}
