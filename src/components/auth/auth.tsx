import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase, supabaseReady } from '../../lib/supabase'

export type Role = 'admin' | 'owner'

export interface Session {
  /** Sign-in identity. Real accounts are keyed by email. */
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
  /** True until the stored session has been checked, so guards don't bounce. */
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

/**
 * Identity comes from Supabase Auth; the role and office come from
 * `user_roles`, read under RLS so a user can only ever see their own row.
 *
 * None of this is trusted from the client. The same values decide what the
 * database will hand back, whatever the UI happens to believe.
 */
async function loadSession(userId: string, email: string): Promise<Session | null> {
  if (!supabase) return null

  const { data: role } = await supabase
    .from('user_roles')
    .select('role, owner_id')
    .eq('user_id', userId)
    .maybeSingle()

  // An account with no role row can see nothing. Treat it as not signed in
  // rather than leaving a half-session every page has to defend against.
  if (!role) return null

  const isAdmin = role.role === 'admin'
  let officeName: string | undefined
  let name = email.split('@')[0]

  if (!isAdmin && role.owner_id) {
    const { data: office } = await supabase
      .from('owners')
      .select('name, company_name, owner_name')
      .eq('id', role.owner_id)
      .maybeSingle()
    if (office) {
      officeName = String(office.company_name || office.name || '')
      name = String(office.owner_name || office.name || name)
    }
  }

  return {
    email,
    role: isAdmin ? 'admin' : 'owner',
    name: isAdmin ? 'Platform Operator' : name,
    officeId: isAdmin ? undefined : (role.owner_id ?? undefined),
    officeName: isAdmin ? undefined : officeName,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      const s = u ? await loadSession(u.id, u.email ?? '') : null
      if (!cancelled) {
        setSession(s)
        setLoading(false)
      }
    })

    // Keeps other tabs in step and picks up token refreshes.
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      const u = next?.user
      const s = u ? await loadSession(u.id, u.email ?? '') : null
      if (!cancelled) setSession(s)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn: AuthCtx['signIn'] = async (email, password) => {
    if (!supabase) return { ok: false, error: 'Supabase is not configured for this site.' }
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return { ok: false, error: error.message }

    const s = data.user ? await loadSession(data.user.id, data.user.email ?? '') : null
    if (!s) {
      await supabase.auth.signOut()
      return { ok: false, error: 'That account is not linked to an office yet.' }
    }
    setSession(s)
    return { ok: true }
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    setSession(null)
  }

  return (
    <Ctx.Provider
      value={{
        session,
        authed: session !== null,
        isOwner: session?.role === 'owner',
        loading,
        signIn,
        signOut,
      }}
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

function Checking() {
  return (
    <div className="grid min-h-screen place-items-center">
      <span className="text-[13px] text-muted">Checking your session…</span>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { authed, loading } = useAuth()
  const loc = useLocation()
  // Without this, a reload would bounce a signed-in user to /login while the
  // stored session is still being read.
  if (loading) return <Checking />
  if (!authed) return <Navigate to="/login" state={{ from: loc }} replace />
  return <>{children}</>
}

/** Platform-operator-only areas. Owners get bounced to their own dashboard. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Checking />
  if (session?.role !== 'admin') return <Navigate to="/my-office" replace />
  return <>{children}</>
}

export { supabaseReady }
