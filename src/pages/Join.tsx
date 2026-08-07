import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Check, TriangleAlert } from 'lucide-react'
import {
  fetchOfficeBySlug,
  fetchPublicSessions,
  formatSessionDate,
  registerProspect,
  supabaseReady,
  type Office,
  type PublicSession,
} from '../lib/supabase'
import { sendRegistration } from '../lib/ghl'

/**
 * The one standardized invitation form (R1) — identical for every office.
 * No logos, no branding, and no office selector.
 *
 * The office is resolved from the link segment alone (R2), and resolved twice:
 * here, to decide whether to show a form, and again inside the database when
 * the booking is written. The second one is what actually binds the prospect to
 * an office — this one only decides what to render.
 */
export default function Join() {
  const { officeSlug } = useParams()

  const [office, setOffice] = useState<Office | null>(null)
  const [sessions, setSessions] = useState<PublicSession[]>([])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [o, s] = await Promise.all([fetchOfficeBySlug(officeSlug ?? ''), fetchPublicSessions()])
      if (cancelled) return
      setOffice(o)
      setSessions(s)
      setSession(s[0]?.id ?? '')
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [officeSlug])

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const chosen = sessions.find((s) => s.id === session)
  const label = (s: PublicSession) => `${formatSessionDate(s.dateOn)} · ${s.timeLabel}`

  if (loading) {
    return (
      <Shell>
        <div className="bevel p-8 text-center text-[13px] text-muted">Loading…</div>
      </Shell>
    )
  }

  if (!supabaseReady) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <TriangleAlert className="mx-auto text-warn" size={28} />
          <h1 className="mt-4 font-cinzel text-[22px] font-semibold text-ivory">Not available</h1>
          <p className="mx-auto mt-3 max-w-[380px] text-[13.5px] leading-relaxed text-muted">
            This site isn't connected to its database yet. Please try again shortly.
          </p>
        </div>
      </Shell>
    )
  }

  // Unknown slug: never guess an office — hold and let an admin sort it out.
  if (!office) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <TriangleAlert className="mx-auto text-warn" size={28} />
          <h1 className="mt-4 font-cinzel text-[22px] font-semibold text-ivory">
            This invitation link isn't valid
          </h1>
          <p className="mx-auto mt-3 max-w-[380px] text-[13.5px] leading-relaxed text-muted">
            We couldn't match this link to an office. Please ask the person who invited you to resend
            their link.
          </p>
        </div>
      </Shell>
    )
  }

  if (sessions.length === 0) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <CalendarDays className="mx-auto text-gold" size={28} />
          <h1 className="mt-4 font-cinzel text-[22px] font-semibold text-ivory">
            No sessions open right now
          </h1>
          <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-relaxed text-muted">
            There are no Discovery Sessions scheduled yet. Your link is valid — check back shortly, or
            let {office.ownerName || 'your contact'} know you're ready to join the next one.
          </p>
        </div>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <div className="gold-fill mx-auto grid h-14 w-14 place-items-center rounded-full text-[#241a04]">
            <Check size={26} strokeWidth={2.6} />
          </div>
          <h1 className="mt-5 font-cinzel text-[24px] font-semibold text-ivory">You're registered</h1>
          <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-relaxed text-muted">
            {form.name.split(' ')[0] || 'You'}, your seat is saved for the Discovery Session on{' '}
            <span className="text-champagne">{chosen ? formatSessionDate(chosen.dateOn) : ''}</span> at{' '}
            <span className="text-champagne">{chosen?.timeLabel}</span>. A confirmation email and text
            are on the way, with a calendar invite and your meeting link.
          </p>
          <p className="mt-6 border-t border-[rgba(212,175,55,.14)] pt-5 text-[12px] text-muted">
            Reminders will reach you 24 hours, 2 hours, and 30 minutes before the session starts.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="bevel p-5 sm:p-8">
        {/*
          The office that owns the link, not the platform. Still no logo and no
          selector — the name is read from the slug the prospect arrived on, so
          it identifies who invited them without them ever choosing an office.
        */}
        <div className="eyebrow">{office.name}</div>
        <h1 className="mt-3 font-cinzel text-[27px] font-semibold leading-tight text-ivory">
          Join the Discovery Session
        </h1>
        <p className="mt-3 text-[13.5px] leading-relaxed text-muted">
          A live session covering the opportunity, compensation, expectations, and the contractor
          relationship — then time for your questions. Pick the date that works for you.
        </p>

        <form
          className="mt-7 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (busy) return
            setBusy(true)
            setError('')

            const res = await registerProspect({
              slug: officeSlug ?? '',
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              sessionId: session || null,
            })

            if (!res.ok) {
              setBusy(false)
              setError(
                /unknown invite link/i.test(res.error)
                  ? "This invitation link isn't valid any more. Please ask for a fresh one."
                  : `We couldn't save your seat: ${res.error}`,
              )
              return
            }

            // Hand off to GoHighLevel for the confirmation. Not awaited: the
            // seat is already saved, so a slow webhook must not hold up the
            // prospect's confirmation screen.
            void sendRegistration({
              fullName: form.name.trim(),
              phone: form.phone.trim(),
              email: form.email.trim(),
              sessionChosen: chosen ? label(chosen) : '',
              referredBy: office.ownerName || office.name,
              officeName: office.name,
              officeId: office.id,
              contractLink: '',
              contractName: '',
              contractVersion: '',
            })

            setDone(true)
          }}
        >
          <Field label="Full name" value={form.name} onChange={set('name')} required autoComplete="name" />
          <Field label="Phone number" value={form.phone} onChange={set('phone')} required type="tel" autoComplete="tel" />
          <Field label="Email address" value={form.email} onChange={set('email')} required type="email" autoComplete="email" />

          <div>
            <label className="mb-2.5 block text-[11px] uppercase tracking-[0.14em] text-muted">
              Choose your session
            </label>
            <div className="space-y-2">
              {sessions.map((s) => {
                const on = session === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSession(s.id)}
                    className={`flex w-full items-center gap-3 rounded-[11px] px-3.5 py-3 text-left transition-all ${
                      on
                        ? 'text-champagne'
                        : 'border border-[rgba(212,175,55,.16)] text-muted hover:border-[rgba(212,175,55,.4)] hover:text-ivory'
                    }`}
                    style={
                      on
                        ? {
                            background:
                              'linear-gradient(#1c1a15,#1c1a15) padding-box, var(--goldgrad) border-box',
                            border: '1px solid transparent',
                          }
                        : undefined
                    }
                  >
                    <CalendarDays size={17} strokeWidth={1.7} className="flex-none" />
                    <span className="flex-1">
                      <span className="block text-[13.5px] font-semibold">{formatSessionDate(s.dateOn)}</span>
                      <span className="block text-[11.5px] text-muted">{s.timeLabel}</span>
                    </span>
                    {on && <Check size={16} className="flex-none" />}
                  </button>
                )
              })}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[12.5px] leading-relaxed text-bad">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-gold w-full py-[15px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Saving your seat…' : 'Reserve my seat'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-muted">
        By registering you'll receive session reminders by email and text. Standard message rates may
        apply.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-8 sm:px-6 sm:py-14">
      <div className="w-full max-w-[480px]">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  autoComplete?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[11px] border border-[rgba(212,175,55,.16)] bg-graphite px-3.5 py-3 text-[14px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.32)] focus:border-[rgba(212,175,55,.55)]"
      />
    </div>
  )
}
