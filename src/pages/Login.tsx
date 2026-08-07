import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { passwordFor } from '../lib/officeStore'
import {
  Building2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  LifeBuoy,
  Lock,
  Mail,
  Send,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useAuth, type Role } from '../components/auth/auth'
import { offices } from '../data/mock'
import Logo from '../components/ui/Logo'

/** Only operators and owners sign in — preparers arrive by invite link (R1/R2). */
const ROLES = [
  { id: 'admin', label: 'Admin', Icon: Shield },
  { id: 'owner', label: 'Office Owner', Icon: Building2 },
] as const

/** The Owner Promise — the only three things an owner ever has to do (§1.3). */
const PROMISE = [
  { Icon: Send, title: 'Invite', body: 'Share your unique link. The office is resolved from the link — never typed.' },
  { Icon: Sparkles, title: 'Build', body: 'Coach the relationship while scheduling, contracts, and follow-ups run themselves.' },
  { Icon: LifeBuoy, title: 'Support', body: 'Carry office-specific training once the preparer is onboarded.' },
]

export default function Login() {
  const phoneRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)
  const [role, setRole] = useState<Role>('owner')
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const clock = useEasternClock()
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !phoneRef.current) return
    const r = phoneRef.current.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    phoneRef.current.style.transform = `rotateY(${px * 9}deg) rotateX(${-py * 9}deg)`
    // Specular glare rides the opposite way, like light off real glass.
    glareRef.current?.style.setProperty('--gx', `${(0.5 - px) * 100}%`)
    glareRef.current?.style.setProperty('--gy', `${(0.5 - py) * 100}%`)
  }
  const reset = () => {
    if (phoneRef.current) phoneRef.current.style.transform = 'rotateY(0) rotateX(0)'
  }

  /** Cursor spotlight — written straight to the DOM on rAF, never through state. */
  const onPageMove = (e: React.MouseEvent) => {
    if (reduce || rafRef.current) return
    const { clientX, clientY } = e
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const el = spotRef.current
      if (!el) return
      const r = el.parentElement!.getBoundingClientRect()
      el.style.setProperty('--mx', `${clientX - r.left}px`)
      el.style.setProperty('--my', `${clientY - r.top}px`)
      el.style.opacity = '1'
    })
  }
  const onPageLeave = () => {
    if (spotRef.current) spotRef.current.style.opacity = '0'
  }

  const [busy, setBusy] = useState(false)

  const enter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    // The role picker is presentational now. Supabase decides what this account
    // actually is, and lands them on the right page — an owner who picks
    // "Admin" still ends up in their own office rather than being refused.
    const res = await signIn(email, password)
    setBusy(false)

    if (res.ok) navigate('/', { replace: true })
    else setError(res.error)
  }

  return (
    <div className="relative min-h-screen overflow-hidden" onMouseMove={onPageMove} onMouseLeave={onPageLeave}>
      {/* Cursor spotlight — lights the grid where the pointer is */}
      <div
        ref={spotRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{
          background:
            'radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(212,175,55,.13), transparent 70%)',
        }}
      />

      {/* Circuit grid + edge bloom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(212,175,55,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,.055) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          maskImage: 'radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 82%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full"
        style={{ left: '3%', background: 'var(--gold)', boxShadow: '0 0 120px 70px rgba(212,175,55,.22)' }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1180px] items-center gap-16 px-8 py-16 lg:grid-cols-[1fr_auto]">
        {/* ── Left: brand pitch ─────────────────────────────── */}
        <div className="max-w-[520px]">
          <div className="flex items-center gap-4">
            <Logo size={76} />
            <div>
              <div className="gold-text font-cinzel text-[26px] font-bold leading-none tracking-[0.14em]">
                HIGHERVIEW
              </div>
              <div className="eyebrow mt-1.5" style={{ letterSpacing: '0.42em' }}>
                Legacies
              </div>
            </div>
          </div>

          <div className="mt-9 flex items-center gap-3">
            <span className="eyebrow">Onboarding Platform</span>
            <span className="h-px w-8 bg-[rgba(212,175,55,.3)]" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Multi-tenant · White-label</span>
          </div>

          <h1 className="mt-4 font-cinzel text-[52px] font-semibold leading-[1.06] text-ivory">
            Log into
            <br />
            <span className="gold-text">your office</span>
          </h1>

          <p className="mt-6 max-w-[440px] text-[15px] leading-relaxed text-muted">
            One invite link starts it. Discovery scheduling, reminders, the correctly branded
            contract, two follow-ups, owner escalation, orientation, and Training Community
            access all run without you touching them.
          </p>

          <div className="mt-10 space-y-5 border-t border-[rgba(212,175,55,.14)] pt-7">
            {PROMISE.map(({ Icon, title, body }) => (
              <div key={title} className="group flex gap-4">
                <div
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-champagne transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_rgba(212,175,55,.35)]"
                  style={{
                    background: 'linear-gradient(#17161a,#17161a) padding-box, var(--goldgrad) border-box',
                    border: '1px solid transparent',
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} />
                </div>
                <div>
                  <div className="font-cinzel text-[15px] font-semibold tracking-[0.08em] text-ivory transition-colors group-hover:text-champagne">
                    {title}
                  </div>
                  <div className="mt-1 max-w-[380px] text-[13px] leading-relaxed text-muted transition-colors group-hover:text-ivory/75">
                    {body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-9 text-[11px] uppercase tracking-[0.16em] text-muted">
            One central account · One standardized form · One link per office
          </div>

          
        </div>

        {/* ── Right: handset ────────────────────────────────── */}
        <div style={{ perspective: 1600 }} onMouseMove={onMove} onMouseLeave={reset} className="justify-self-center">
          <div
            ref={phoneRef}
            className="relative w-[306px] transition-transform duration-150"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* side hardware */}
            <span className="absolute -left-[2px] top-[104px] h-[26px] w-[2px] rounded-l-sm bg-gradient-to-r from-[#3a3a40] to-[#17171a]" />
            <span className="absolute -left-[2px] top-[146px] h-[46px] w-[2px] rounded-l-sm bg-gradient-to-r from-[#3a3a40] to-[#17171a]" />
            <span className="absolute -left-[2px] top-[204px] h-[46px] w-[2px] rounded-l-sm bg-gradient-to-r from-[#3a3a40] to-[#17171a]" />
            <span className="absolute -right-[2px] top-[168px] h-[68px] w-[2px] rounded-r-sm bg-gradient-to-l from-[#3a3a40] to-[#17171a]" />

            {/* titanium band */}
            <div
              className="rounded-[46px] p-[3px]"
              style={{
                background:
                  'linear-gradient(150deg, #56514a 0%, #2a2823 22%, #6b6255 48%, #232227 72%, #4a463f 100%)',
                boxShadow:
                  '0 0 0 1px rgba(212,175,55,.22), 0 40px 90px rgba(0,0,0,.75), 0 2px 0 rgba(255,255,255,.06) inset',
              }}
            >
              {/* screen */}
              <div
                className="relative overflow-hidden rounded-[43px] px-6 pb-4 pt-2.5"
                style={{
                  background:
                    'radial-gradient(140% 80% at 20% 0%, rgba(212,175,55,.16), transparent 58%), linear-gradient(180deg, #16151a 0%, #0d0d10 55%, #100e0a 100%)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,.9) inset',
                }}
              >
                {/* glass glare tracking the cursor */}
                <div
                  ref={glareRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-10 rounded-[43px]"
                  style={{
                    background:
                      'radial-gradient(120% 70% at var(--gx, 50%) var(--gy, 0%), rgba(255,247,225,.09), transparent 62%)',
                  }}
                />

                {/* status bar */}
                <div className="relative flex h-[30px] items-center justify-between text-[11px] font-medium text-ivory/90">
                  <span className="pl-2 tabular-nums">{clock}</span>
                  <div className="absolute left-1/2 top-[3px] h-[26px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
                  <div className="flex items-center gap-1.5 pr-1">
                    <SignalBars />
                    <WifiGlyph />
                    <BatteryGlyph />
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-2.5">
                  <Logo size={30} interactive={false} />
                  <div className="leading-none">
                    <div className="font-cinzel text-[12px] font-bold tracking-[0.14em] text-ivory">HIGHERVIEW</div>
                    <div className="mt-1 text-[8px] uppercase tracking-[0.34em] text-gold">Legacies</div>
                  </div>
                </div>

                <h2 className="mt-5 font-cinzel text-[25px] font-semibold leading-tight text-ivory">
                  Log into
                  <br />
                  <span className="gold-text">your office</span>
                </h2>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
                  Track every prospect from invitation to onboarded.
                </p>

                {/* role selector */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {ROLES.map(({ id, label, Icon }) => {
                    const on = role === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-300 hover:-translate-y-px ${
                          on
                            ? 'text-champagne'
                            : 'border border-[rgba(212,175,55,.14)] text-muted hover:border-[rgba(212,175,55,.4)] hover:bg-[rgba(212,175,55,.05)] hover:text-ivory'
                        }`}
                        style={
                          on
                            ? {
                                background:
                                  'linear-gradient(#1c1a15,#1c1a15) padding-box, var(--goldgrad) border-box',
                                border: '1px solid transparent',
                                boxShadow: '0 0 16px rgba(212,175,55,.18)',
                              }
                            : undefined
                        }
                      >
                        <Icon size={14} strokeWidth={1.75} />
                        {label}
                      </button>
                    )
                  })}
                </div>

                {/* fields */}
                <form onSubmit={enter} noValidate>
                  <div className="mt-4 space-y-2.5">
                    {/* Owners sign in with a username; the platform operator
                        still uses an email address. */}
                    <PhoneField
                      Icon={Mail}
                      type="email"
                      placeholder="Work email"
                      autoComplete="username"
                      value={email}
                      onChange={setEmail}
                    />
                    <PhoneField
                      Icon={Lock}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="current-password"
                      value={password}
                      onChange={setPassword}
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPw((v) => !v)}
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                          className="text-muted transition-colors hover:text-gold"
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      }
                    />
                  </div>

                  {error && (
                    <p role="alert" className="mt-3 text-center text-[11px] text-bad">
                      {error}
                    </p>
                  )}

                  <button type="submit" className="btn-gold mt-6 w-full py-[13px]">
                    Log in
                  </button>
                </form>

                <div className="mt-4 text-center text-[11px] text-muted">
                  <a className="text-gold" href="#">Forgot access?</a>
                </div>

                <p className="mt-4 border-t border-[rgba(212,175,55,.1)] pt-3.5 text-center text-[10px] leading-relaxed text-muted">
                  Preparers don't sign in here — they join through their office owner's invite link.
                </p>

                {/* home indicator */}
                <div className="mx-auto mt-5 h-[5px] w-[112px] rounded-full bg-ivory/25" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhoneField({
  Icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  trailing,
}: {
  Icon: typeof Mail
  type: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  trailing?: React.ReactNode
}) {
  return (
    <div className="group flex items-center gap-2.5 rounded-xl border border-[rgba(212,175,55,.14)] bg-[rgba(255,255,255,.02)] px-3 py-2.5 transition-all duration-300 hover:border-[rgba(212,175,55,.32)] hover:bg-[rgba(255,255,255,.04)] focus-within:border-[rgba(212,175,55,.5)] focus-within:shadow-[0_0_18px_rgba(212,175,55,.16)]">
      <Icon size={14} strokeWidth={1.75} className="shrink-0 text-gold/70 transition-colors group-hover:text-champagne" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-0 bg-transparent text-[12px] text-ivory outline-none placeholder:text-[#615e57]"
      />
      {trailing}
    </div>
  )
}


/** Status-bar clock on Eastern time — the operating timezone. DST-aware. */
function useEasternClock() {
  const format = () =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(new Date())
      .replace(/\s?[AP]M$/i, '')

  const [time, setTime] = useState(format)

  useEffect(() => {
    // Tick on the minute boundary rather than drifting on a fixed interval.
    let timer: number
    const schedule = () => {
      timer = window.setTimeout(() => {
        setTime(format())
        schedule()
      }, 60_000 - (Date.now() % 60_000))
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [])

  return time
}

/* ── iOS-style status glyphs ─────────────────────────────── */

function SignalBars() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4} y={8 - i * 2.5} width="2.6" height={3 + i * 2.5} rx="0.8" opacity={i === 3 ? 0.4 : 1} />
      ))}
    </svg>
  )
}

function WifiGlyph() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
      <path d="M1 4.1a9 9 0 0 1 12 0" />
      <path d="M3.3 6.4a5.7 5.7 0 0 1 7.4 0" />
      <path d="M5.6 8.7a2.4 2.4 0 0 1 2.8 0" />
    </svg>
  )
}

function BatteryGlyph() {
  return (
    <svg width="24" height="11" viewBox="0 0 24 11" fill="none" aria-hidden>
      <rect x="0.6" y="0.6" width="19" height="9.8" rx="3" stroke="currentColor" strokeOpacity=".45" />
      <rect x="2.2" y="2.2" width="14" height="6.6" rx="1.8" fill="currentColor" />
      <path d="M21.4 4.1v2.8a1.9 1.9 0 0 0 0-2.8Z" fill="currentColor" fillOpacity=".45" />
    </svg>
  )
}
