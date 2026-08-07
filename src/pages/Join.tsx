import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Check, TriangleAlert } from 'lucide-react'
import { officeBySlug } from '../data/mock'
import { bookableSessions, useSessions } from '../lib/sessionStore'
import { registerProspect } from '../lib/prospectStore'
import { createSendForOffice, signUrl } from '../lib/contractStore'
import { sendRegistration } from '../lib/ghl'

/**
 * The one standardized invitation form (R1) — identical for every office.
 * No logos, no branding, and no office selector: the Office ID is resolved
 * from the link segment alone (R2).
 */
export default function Join() {
  const { officeSlug } = useParams()
  const office = officeBySlug(officeSlug)
  // Live catalog: a session added on the Sessions page shows up here at once.
  useSessions()
  const discovery = bookableSessions()

  const [session, setSession] = useState(discovery[0]?.id ?? '')
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))
  const chosenSession = discovery.find((s) => s.id === session)

  // Unknown slug: never guess an office — hold and let an admin sort it out.
  if (!office) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <TriangleAlert className="mx-auto text-warn" size={28} />
          <h1 className="mt-4 font-cinzel text-[22px] font-semibold text-ivory">This invitation link isn't valid</h1>
          <p className="mx-auto mt-3 max-w-[380px] text-[13.5px] leading-relaxed text-muted">
            We couldn't match this link to an office. Please ask the person who invited you to resend their
            link — an administrator has been alerted.
          </p>
        </div>
      </Shell>
    )
  }

  if (done) {
    const chosen = discovery.find((s) => s.id === session)
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <div className="gold-fill mx-auto grid h-14 w-14 place-items-center rounded-full text-[#241a04]">
            <Check size={26} strokeWidth={2.6} />
          </div>
          <h1 className="mt-5 font-cinzel text-[24px] font-semibold text-ivory">You're registered</h1>
          <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-relaxed text-muted">
            {form.name.split(' ')[0] || 'You'}, your seat is saved for the Discovery Session on{' '}
            <span className="text-champagne">{chosen?.date}</span> at{' '}
            <span className="text-champagne">{chosen?.time}</span>. A confirmation email and text are on the
            way, with a calendar invite and your meeting link.
          </p>
          <p className="mt-6 border-t border-[rgba(212,175,55,.14)] pt-5 text-[12px] text-muted">
            Reminders will reach you 24 hours, 2 hours, and 30 minutes before the session starts.
          </p>
        </div>
      </Shell>
    )
  }

  /*
   * Nothing on the calendar yet. Showing the form would let someone submit a
   * booking with no session attached, which is worse than saying so plainly —
   * an admin publishes a Discovery Session on the Sessions page and this comes
   * back on its own.
   */
  if (discovery.length === 0) {
    return (
      <Shell>
        <div className="bevel p-5 text-center sm:p-8">
          <CalendarDays className="mx-auto text-gold" size={28} />
          <h1 className="mt-4 font-cinzel text-[22px] font-semibold text-ivory">
            No sessions open right now
          </h1>
          <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-relaxed text-muted">
            There are no Discovery Sessions scheduled yet. Your link is valid — check back shortly, or
            let {office.owner || office.name} know you're ready to join the next one.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="bevel p-5 sm:p-8">
        <div className="eyebrow">Higher View</div>
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

            // Create the contact in the central account (R3) and book the session.
            registerProspect({
              officeId: office.id,
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
              sessionId: session,
            })

            // Their agreement goes out with the booking confirmation, so raise
            // the document now and hand its link to the workflow. Returns null
            // if this office hasn't finished its contract setup — the seat is
            // still reserved either way, and the payload says so with a blank
            // link rather than a broken one.
            const contract = createSendForOffice(office.id, {
              name: form.name.trim(),
              email: form.email.trim(),
              phone: form.phone.trim(),
            })

            // Hand off to GHL for the confirmation email/SMS and owner
            // notification. Deliberately not awaited: the seat is already
            // reserved above, so a slow or failing webhook must not hold up
            // the prospect's confirmation. Failures surface in the console,
            // where an owner can actually act on them.
            void sendRegistration({
              fullName: form.name.trim(),
              phone: form.phone.trim(),
              email: form.email.trim(),
              sessionChosen: chosenSession ? `${chosenSession.date} · ${chosenSession.time}` : '',
              // The link identifies the referrer — never typed by the prospect (R2).
              referredBy: office.owner || office.name,
              officeName: office.name,
              officeId: office.id,
              contractLink: contract ? signUrl(contract.token) : '',
              contractName: contract?.template.name ?? '',
              contractVersion: contract?.template.version ?? '',
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
              {discovery.map((s) => {
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
                            background: 'linear-gradient(#1c1a15,#1c1a15) padding-box, var(--goldgrad) border-box',
                            border: '1px solid transparent',
                          }
                        : undefined
                    }
                  >
                    <CalendarDays size={17} strokeWidth={1.7} className="flex-none" />
                    <span className="flex-1">
                      <span className="block text-[13.5px] font-semibold">{s.date}</span>
                      <span className="block text-[11.5px] text-muted">{s.time}</span>
                    </span>
                    {on && <Check size={16} className="flex-none text-gold" />}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn-gold w-full py-[14px] disabled:opacity-60">
            {busy ? 'Reserving…' : 'Reserve my seat'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-muted">
        By registering you'll receive session reminders by email and text. Standard message rates may apply.
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
