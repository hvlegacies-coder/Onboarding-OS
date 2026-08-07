import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ExternalLink,
  Link as LinkIcon,
  Mail,
  Phone,
  Send,
  TriangleAlert,
  UserPlus,
} from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Chip from '../components/ui/Chip'
import Avatar from '../components/ui/Avatar'
import StagePill from '../components/ui/StagePill'
import { useAuth } from '../components/auth/auth'
import { inviteUrl, officeById } from '../data/mock'
import { preparersForOffice, useProspects } from '../lib/prospectStore'
import { CONTRACT_LABEL } from '../lib/contract'
import { statusOf } from '../lib/contractStore'
import { ghlConfigured, sendInvite, type InvitePayload } from '../lib/ghl'
import type { ContractStatus, Office, Preparer, Stage } from '../types'

/** The six milestones an owner cares about, in order. */
const JOURNEY: { stage: Stage; label: string }[] = [
  { stage: 'invited', label: 'Invited' },
  { stage: 'scheduled', label: 'Booked' },
  { stage: 'attended', label: 'Attended' },
  { stage: 'sent', label: 'Contract' },
  { stage: 'signed', label: 'Signed' },
  { stage: 'onboarded', label: 'Onboarded' },
]

/** Full stage order, used to work out how far along someone is. */
const ORDER: Stage[] = [
  'invited', 'scheduled', 'attended', 'sent', 'reminder1',
  'reminder2', 'followup', 'signed', 'orientation', 'onboarded',
]

const FILTERS: { id: ContractStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'not-sent', label: 'No contract yet' },
  { id: 'open', label: 'Awaiting signature' },
  { id: 'signed', label: 'Signed' },
  { id: 'stalled', label: 'Needs your call' },
]

const TONE_COLOR = { good: '#7BC49A', gold: '#D4AF37', warn: '#E0B15A', bad: '#D08A7A' }

export default function MyOffice() {
  const { session } = useAuth()
  const office = officeById(session?.officeId)
  const [filter, setFilter] = useState<ContractStatus | 'all'>('all')

  useProspects() // re-render when someone registers
  const people = useMemo(() => (office ? preparersForOffice(office.id) : []), [office])
  const counts = useMemo(() => {
    const c: Record<ContractStatus, number> = { 'not-sent': 0, open: 0, signed: 0, stalled: 0 }
    people.forEach((p) => c[statusOf(p)]++)
    return c
  }, [people])

  // A platform operator has no single office — send them to the full funnel.
  if (!office) return <Navigate to="/" replace />

  const shown = filter === 'all' ? people : people.filter((p) => statusOf(p) === filter)
  const needsCall = people.filter((p) => statusOf(p) === 'stalled')

  return (
    <>
      <PageHead eyebrow={office.name} title="My office">
        Everything happening with the people you invited. Scheduling, contracts, reminders, and
        follow-ups run automatically — this page shows you where each person stands.
      </PageHead>

      <div className="grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
        <InviteCard office={office} url={inviteUrl(office)} />
        <StatusStrip counts={counts} total={people.length} />
      </div>

      {needsCall.length > 0 && <NeedsCall people={needsCall} />}

      <div className="mt-9 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const on = filter === f.id
          const n = f.id === 'all' ? people.length : counts[f.id]
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                on
                  ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.1)] text-champagne'
                  : 'border-[rgba(212,175,55,.12)] text-muted hover:border-[rgba(212,175,55,.3)] hover:text-ivory'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${on ? 'text-gold' : 'text-muted/70'}`}>{n}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 space-y-2.5">
        {shown.map((p) => (
          <ProspectRow key={p.id} p={p} />
        ))}
        {shown.length === 0 && (
          <div className="panel p-10 text-center text-[13px] text-muted">Nobody in this group right now.</div>
        )}
      </div>
    </>
  )
}

/* ── Invite link ─────────────────────────────────────────── */

function InviteCard({ office, url }: { office: Office; url: string }) {
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="bevel p-5">
      <div className="eyebrow">Your invite link</div>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        Anyone who signs up through this link is tied to your office automatically, and gets your
        contract.
      </p>
      <div className="mt-3.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-[9px] border border-[rgba(212,175,55,.12)] bg-graphite px-3 py-2.5 font-mono text-[12px] text-ivory">
          {url.replace(/^https?:\/\//, '')}
        </span>
        <button onClick={copy} className="flex-none rounded-[9px] border border-[rgba(212,175,55,.16)] px-3.5 py-2.5 text-[12px] font-semibold text-gold transition-colors hover:border-[rgba(212,175,55,.4)] hover:text-champagne">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="grid h-[40px] w-[40px] flex-none place-items-center rounded-[9px] border border-[rgba(212,175,55,.12)] text-muted transition-colors hover:border-[rgba(212,175,55,.35)] hover:text-gold"
          title="Preview what a prospect sees"
          aria-label="Preview what a prospect sees"
        >
          <ExternalLink size={15} />
        </a>
      </div>

      <button
        onClick={() => setInviting((v) => !v)}
        className="btn-gold mt-3 flex w-full items-center justify-center gap-2 py-[11px]"
      >
        <UserPlus size={14} strokeWidth={2.2} />
        {inviting ? 'Close' : 'Invite someone'}
      </button>

      {inviting && <InviteForm office={office} url={url} onDone={() => setInviting(false)} />}
    </div>
  )
}

/**
 * One invitation, sent once. The details are posted to GoHighLevel, which owns
 * the actual email and text. The prospect still only enters the pipeline when
 * they register through the link (R2).
 */
function InviteForm({
  office,
  url,
  onDone,
}: {
  office: Office
  url: string
  onDone: () => void
}) {
  const [f, setF] = useState({ name: '', email: '', phone: '', notes: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [detail, setDetail] = useState('')
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }))

  const payload: InvitePayload = {
    officeName: office.name,
    officeId: office.id,
    inviteLink: url,
    name: f.name.trim(),
    email: f.email.trim(),
    phone: f.phone.trim(),
    notes: f.notes.trim(),
  }

  // Either channel is enough to reach them; GHL decides which to use.
  const ready = payload.name !== '' && (payload.email !== '' || payload.phone !== '')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setState('sending')
    const res = await sendInvite(payload)
    if (res.ok) {
      setState('sent')
      setTimeout(onDone, 2200)
    } else {
      setState('error')
      setDetail(
        res.reason === 'not-configured'
          ? 'No GoHighLevel webhook is connected yet, so nothing was sent.'
          : res.reason === 'timeout'
            ? "GoHighLevel didn't respond in time. The invitation may not have gone out — try again in a moment."
            : res.reason === 'network'
              ? "Couldn't reach GoHighLevel. Check the webhook URL and that it allows requests from this site."
              : `GoHighLevel rejected the request — ${res.detail}.`,
      )
    }
  }

  if (state === 'sent') {
    return (
      <div className="mt-3 rounded-[11px] border border-[rgba(123,196,154,.28)] bg-[rgba(123,196,154,.07)] p-4 text-center">
        <div className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-[rgba(123,196,154,.15)] text-good">
          <Check size={18} strokeWidth={2.6} />
        </div>
        <div className="mt-2.5 text-[13px] font-semibold text-ivory">Invitation sent</div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          {payload.name} will get it by email and text. They'll appear on this page once they
          register.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={send} className="mt-3 rounded-[11px] border border-[rgba(212,175,55,.14)] bg-[rgba(255,255,255,.02)] p-4">
      <div className="grid gap-2.5 sm:grid-cols-2">
        <InviteField label="Name" value={f.name} onChange={set('name')} autoComplete="name" required />
        <InviteField label="Email" value={f.email} onChange={set('email')} type="email" autoComplete="email" />
        <InviteField label="Phone" value={f.phone} onChange={set('phone')} type="tel" autoComplete="tel" />
        <InviteField label="Notes" value={f.notes} onChange={set('notes')} placeholder="Optional" />
      </div>

      {/* The link that goes out with it — fixed, so it can't be sent wrong. */}
      <div className="mt-2.5">
        <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.1em] text-muted">
          Invitation link
        </span>
        <div className="flex items-center gap-2 rounded-[9px] border border-[rgba(212,175,55,.1)] bg-[rgba(255,255,255,.02)] px-3 py-2">
          <LinkIcon size={12} className="flex-none text-gold/70" />
          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11.5px] text-muted">
            {url.replace(/^https?:\/\//, '')}
          </span>
          <span className="flex-none text-[10px] uppercase tracking-[0.1em] text-muted/70">
            {office.name}
          </span>
        </div>
      </div>

      {state === 'error' && (
        <p role="alert" className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-bad">
          <TriangleAlert size={14} className="mt-px flex-none" />
          {detail}
        </p>
      )}

      <button
        type="submit"
        disabled={!ready || state === 'sending'}
        className="btn-gold mt-3 flex w-full items-center justify-center gap-2 py-[11px] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send size={13} strokeWidth={2.2} />
        {state === 'sending' ? 'Sending…' : 'Send invitation'}
      </button>

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        Sends the email and text through GoHighLevel under {office.name}.
        {!ghlConfigured && ' Not connected yet — set VITE_GHL_INVITE_WEBHOOK to go live.'}
      </p>
    </form>
  )
}

function InviteField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.1em] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[9px] border border-[rgba(212,175,55,.14)] bg-graphite px-3 py-2 text-[12.5px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.28)] focus:border-[rgba(212,175,55,.5)] placeholder:text-[#5f5c55]"
      />
    </label>
  )
}

/* ── Counts, as one strip rather than four big cards ─────── */

function StatusStrip({ counts, total }: { counts: Record<ContractStatus, number>; total: number }) {
  const rows: { id: ContractStatus; label: string; tone: keyof typeof TONE_COLOR }[] = [
    { id: 'not-sent', label: 'No contract yet', tone: 'gold' },
    { id: 'open', label: 'Awaiting signature', tone: 'warn' },
    { id: 'signed', label: 'Signed', tone: 'good' },
    { id: 'stalled', label: 'Needs your call', tone: 'bad' },
  ]
  return (
    <div className="panel flex flex-col justify-center p-5">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Your prospects</span>
        <span className="font-cormorant text-[26px] font-semibold leading-none">{total}</span>
      </div>
      <div className="mt-3.5 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: TONE_COLOR[r.tone] }} />
            <span className="flex-1 text-[12.5px] text-muted">{r.label}</span>
            <span className="w-6 text-right text-[13px] font-semibold tabular-nums text-ivory">
              {counts[r.id]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Escalations ─────────────────────────────────────────── */

function NeedsCall({ people }: { people: Preparer[] }) {
  return (
    <div className="mt-4 rounded-[14px] border border-[rgba(208,138,122,.26)] bg-[rgba(208,138,122,.06)] p-5">
      <div className="flex items-center gap-2 text-bad">
        <TriangleAlert size={16} strokeWidth={1.9} />
        <span className="text-[13px] font-semibold">
          {people.length === 1 ? '1 person needs' : `${people.length} people need`} a personal call from you
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
        They didn't sign after the final reminder, so automated messages have stopped.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((p) => (
          <span
            key={p.id}
            className="flex items-center gap-2 rounded-full border border-[rgba(208,138,122,.24)] py-1 pl-1 pr-2.5 text-[12px]"
          >
            <Avatar initials={p.initials} size={20} />
            <span className="font-medium text-ivory">{p.name}</span>
            <a href={`tel:${p.phone.replace(/\D/g, '')}`} className="text-bad hover:text-ivory" title={p.phone}>
              <Phone size={12} />
            </a>
            <a href={`mailto:${p.email}`} className="text-bad hover:text-ivory" title={p.email}>
              <Mail size={12} />
            </a>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── One prospect ────────────────────────────────────────── */

function ProspectRow({ p }: { p: Preparer }) {
  const [open, setOpen] = useState(false)
  const status = statusOf(p)
  const meta = CONTRACT_LABEL[status]
  const step = ORDER.indexOf(p.stage)

  return (
    <div className={`panel ${open ? 'border-[rgba(212,175,55,.26)]' : 'panel-hover'}`}>
      {/* Collapsed: just who they are and where they stand. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4 py-3 text-left"
      >
        <Avatar initials={p.initials} size={32} />
        {/* On a phone the two status chips can't share a line with the name,
            so they sit beneath it; from sm they return to one row. */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold text-ivory">{p.name}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:hidden">
            <StagePill stage={p.stage} />
            <Chip tone={meta.tone}>{meta.label}</Chip>
          </span>
        </span>
        <span className="hidden flex-none items-center gap-2 sm:flex">
          <StagePill stage={p.stage} />
          <Chip tone={meta.tone}>{meta.label}</Chip>
        </span>
        <ChevronDown
          size={15}
          className={`flex-none text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded: everything else. */}
      {open && (
        <div className="border-t border-[rgba(212,175,55,.1)] px-4 pb-4 pt-4">
          <div className="flex flex-wrap gap-x-8 gap-y-3 text-[12px]">
            <Detail label="Email">
              <a href={`mailto:${p.email}`} className="text-ivory hover:text-gold">{p.email}</a>
            </Detail>
            <Detail label="Phone">
              <a href={`tel:${p.phone.replace(/\D/g, '')}`} className="text-ivory hover:text-gold">{p.phone}</a>
            </Detail>
            <Detail label="Discovery Session">{p.session}</Detail>
            <Detail label="Invited">{p.invited}</Detail>
            {p.signedOn && <Detail label="Signed">{p.signedOn}</Detail>}
          </div>

          {/* Scrolls inside its own row rather than widening the page. */}
          <div className="-mx-1 mt-5 overflow-x-auto px-1">
            <Stepper step={step} />
          </div>

          <p className="mt-4 border-t border-[rgba(212,175,55,.08)] pt-3 text-[12px] leading-relaxed text-muted">
            {meta.help}
          </p>
        </div>
      )}
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 text-ivory">{children}</div>
    </div>
  )
}

/** Compact milestone track — fixed width so it never stretches across the page. */
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex w-full min-w-[400px] max-w-[440px] items-center">
      {JOURNEY.map((j, i) => {
        const reached = step >= ORDER.indexOf(j.stage)
        return (
          <div key={j.stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`grid h-[15px] w-[15px] place-items-center rounded-full border transition-colors ${
                  reached
                    ? 'border-transparent text-[#241a04]'
                    : 'border-[rgba(212,175,55,.2)] bg-graphite2'
                }`}
                style={reached ? { background: 'var(--goldgrad)' } : undefined}
              >
                {reached && <Check size={9} strokeWidth={3.5} />}
              </span>
              <span
                className={`whitespace-nowrap text-[9.5px] uppercase tracking-[0.06em] ${
                  reached ? 'text-champagne' : 'text-muted/60'
                }`}
              >
                {j.label}
              </span>
            </div>
            {i < JOURNEY.length - 1 && (
              <span
                className={`-mt-[18px] h-px flex-1 ${reached ? 'bg-[rgba(212,175,55,.5)]' : 'bg-[rgba(212,175,55,.13)]'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
