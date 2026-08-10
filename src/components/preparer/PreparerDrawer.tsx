import { useEffect, useState } from 'react'
import { Check, ExternalLink, Mail, Phone, Trash2, X } from 'lucide-react'
import Avatar from '../ui/Avatar'
import Chip from '../ui/Chip'
import StagePill from '../ui/StagePill'
import { messages as messageCatalog, officeById } from '../../data/mock'
import { actionsFor, journeyFor, messagesSent } from '../../lib/journey'
import { contractStatus, CONTRACT_LABEL } from '../../lib/contract'
import {
  DOC_LABEL,
  docStatus,
  hasSendTo,
  latestSendTo,
  signUrl,
  useContracts,
} from '../../lib/contractStore'
import { eventsFor, moveStage, removePreparer, useProspects } from '../../lib/prospectStore'
import { notify } from '../../lib/toast'
import { useDocuments } from '../../lib/documents'
import type { JourneyEntry } from '../../lib/journey'
import type { Preparer } from '../../types'

/**
 * Everything the platform knows about one preparer, in one panel: where they
 * are, how they got there, what has been sent, and what can be done by hand.
 *
 * Read-only for the owner — only Higher View admins get the manual actions and
 * the removal, since a stage move overrides automation for everyone watching
 * and a removal takes the contact out of the central account entirely.
 */
export default function PreparerDrawer({
  preparer,
  onClose,
  canAct = false,
}: {
  preparer: Preparer
  onClose: () => void
  canAct?: boolean
}) {
  // Re-render when a manual action moves them, or a contract comes back signed.
  useProspects()
  useContracts()
  useDocuments()

  const [confirming, setConfirming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  const p = preparer
  const journey = journeyFor(p)
  const sentCodes = messagesSent(p)
  const status = contractStatus(p.stage, hasSendTo(p.email))
  const contract = CONTRACT_LABEL[status]
  const send = latestSendTo(p.email)
  const doc = DOC_LABEL[docStatus(p.email)]
  const office = officeById(p.officeId)
  const events = eventsFor(p.id)
  const actions = canAct ? actionsFor(p) : []

  const remove = async () => {
    setRemoving(true)
    setError(null)
    const res = await removePreparer(p)
    if (!res.ok) {
      setRemoving(false)
      setError(res.error)
      return
    }
    notify(`${p.name} removed from ${p.office}`, 'bad')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="drawer-scrim absolute inset-0 bg-[rgba(6,6,8,.72)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${p.name} — preparer detail`}
        className="drawer-panel relative flex h-full w-full max-w-[460px] flex-col border-l border-[rgba(212,175,55,.16)] bg-onyx shadow-[0_0_60px_rgba(0,0,0,.7)]"
      >
        <header className="flex items-start gap-3.5 border-b border-[rgba(212,175,55,.16)] p-5">
          <Avatar initials={p.initials} size={44} />
          <div className="min-w-0 flex-1">
            <h2 className="font-cormorant text-[24px] font-semibold leading-tight">{p.name}</h2>
            <div className="mt-0.5 truncate text-[11.5px] text-muted">{p.email}</div>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <StagePill stage={p.stage} />
              <Chip>{p.office}</Chip>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-[rgba(212,175,55,.16)] text-muted transition-colors hover:border-gold hover:text-champagne"
          >
            <X size={15} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section className="grid grid-cols-2 gap-2.5">
            <a
              href={`mailto:${p.email}`}
              className="panel panel-hover flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold text-champagne"
            >
              <Mail size={13} /> Email
            </a>
            <a
              href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}
              className="panel panel-hover flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold text-champagne"
            >
              <Phone size={13} /> {p.phone}
            </a>
          </section>

          <Facts p={p} />

          <Section title="Contract" eyebrow={contract.label}>
            {/* Document state sits above the pipeline commentary — whether they
                have actually opened it is the more actionable fact. */}
            {send && (
              <div className="mb-2.5">
                <Chip tone={doc.tone}>{doc.label}</Chip>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">{doc.help}</p>
              </div>
            )}
            <p className={`text-[12px] leading-relaxed ${status === 'stalled' ? 'text-bad' : 'text-muted'}`}>
              {contract.help}
            </p>
            {office && office.branding !== 'complete' && (
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-warn">
                {office.name} hasn't finished its branding — the agreement can't send until it has.
              </p>
            )}
            {send && (
              <a
                href={signUrl(send.token)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-gold hover:text-champagne"
              >
                <ExternalLink size={12} />
                {send.status === 'signed' ? 'View signed copy' : 'Open their document'}
              </a>
            )}
          </Section>

          <Section title="Journey" eyebrow={`${journey.filter((s) => s.state === 'done').length} of ${journey.length} complete`}>
            <ol className="timeline-rail relative space-y-4 pl-6">
              {journey.map((step) => (
                <TimelineRow key={step.stage} step={step} p={p} />
              ))}
            </ol>
          </Section>

          <Section title="Messages sent" eyebrow={`${sentCodes.length} total`}>
            {sentCodes.length === 0 ? (
              <p className="text-[12px] text-muted">Nothing has gone out yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {sentCodes.map((code, i) => {
                  const m = messageCatalog.find((x) => x.code === code)
                  if (!m) return null
                  return (
                    <li key={`${code}-${i}`} className="panel p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-cinzel text-[11px] tracking-[0.05em] text-gold">{m.code}</span>
                        <span className="text-[12.5px] font-semibold">{m.title}</span>
                        <span className="ml-auto text-[10px] uppercase tracking-[0.1em] text-muted">
                          {m.channel}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{m.audience}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>

          {events.length > 0 && (
            <Section title="Manual history" eyebrow="This account">
              <ul className="space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-baseline gap-2.5 text-[12px]">
                    <span className="flex-1 text-ivory">{e.text}</span>
                    <span className="flex-none text-[11px] text-muted">{e.at}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {canAct && (
          <footer className="border-t border-[rgba(212,175,55,.16)] p-5">
            {actions.length > 0 && (
              <>
                <div className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Move them by hand
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {actions.map((a) => (
                    <button
                      key={a.stage}
                      onClick={() => moveStage(p, a.stage, a.label)}
                      className={
                        a.danger
                          ? 'rounded-[11px] border border-[rgba(208,138,122,.4)] px-3.5 py-2.5 text-[12px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.1)]'
                          : 'btn-gold px-3.5 py-2.5'
                      }
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
                  A manual move overrides automation and is logged against this preparer.
                </p>
              </>
            )}

            {/* Removal is the one action here that cannot be taken back, so it
                sits apart from the stage moves and states what it destroys
                rather than asking "are you sure". */}
            {confirming ? (
              <div
                className={`rounded-[11px] border border-[rgba(208,138,122,.35)] bg-[rgba(208,138,122,.06)] p-3.5 ${
                  actions.length > 0 ? 'mt-4' : ''
                }`}
              >
                <div className="text-[12.5px] font-semibold text-bad">Remove {p.name}?</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                  They are deleted from the central account along with their journey history, and
                  drop out of {p.office}'s pipeline. Any agreement already sent to them is kept.
                  This cannot be undone.
                </p>
                {error && <p className="mt-2 text-[11.5px] leading-relaxed text-bad">{error}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={remove}
                    disabled={removing}
                    className="rounded-[8px] border border-[rgba(208,138,122,.5)] bg-[rgba(208,138,122,.12)] px-3 py-1.5 text-[11.5px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.2)] disabled:opacity-60"
                  >
                    {removing ? 'Removing…' : 'Remove preparer'}
                  </button>
                  <button
                    onClick={() => {
                      setConfirming(false)
                      setError(null)
                    }}
                    disabled={removing}
                    className="px-2 py-1.5 text-[11.5px] text-muted transition-colors hover:text-ivory disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-bad ${
                  actions.length > 0 ? 'mt-4' : ''
                }`}
              >
                <Trash2 size={12} /> Remove preparer
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  )
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-cormorant text-[19px] font-semibold">{title}</h3>
        {eyebrow && <span className="text-[10.5px] uppercase tracking-[0.12em] text-muted">{eyebrow}</span>}
      </div>
      {children}
    </section>
  )
}

function Facts({ p }: { p: Preparer }) {
  const rows: [string, string][] = [
    ['Office', p.office],
    ['Invited', p.invited],
    ['Session', p.session],
  ]
  if (p.referredBy) rows.push(['Referred by', p.referredBy])
  if (p.signedOn) rows.push(['Signed', p.signedOn])

  return (
    <dl className="panel divide-y divide-[rgba(212,175,55,.07)] px-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className="text-[11px] uppercase tracking-[0.1em] text-muted">{label}</dt>
          <dd className="text-right text-[12.5px]">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function TimelineRow({ step, p }: { step: JourneyEntry; p: Preparer }) {
  const done = step.state === 'done'
  const current = step.state === 'current'
  const danger = step.tone === 'bad'

  return (
    <li className="relative">
      <span
        className={`absolute -left-6 top-1 grid h-[13px] w-[13px] place-items-center rounded-full border ${
          done
            ? 'gold-fill border-transparent'
            : current
              ? danger
                ? 'border-bad bg-[rgba(208,138,122,.25)]'
                : 'border-gold bg-[rgba(212,175,55,.25)]'
              : 'border-[rgba(212,175,55,.16)] bg-onyx'
        }`}
      >
        {done && <Check size={9} strokeWidth={3.5} className="text-[#241a04]" />}
      </span>

      <div className={`text-[12.5px] font-semibold ${
        current ? (danger ? 'text-bad' : 'text-champagne') : done ? 'text-ivory' : 'text-muted'
      }`}>
        {step.title}
        {current && (
          <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.1em] text-gold">Now</span>
        )}
      </div>
      <p className={`mt-1 text-[11.5px] leading-relaxed ${step.state === 'pending' ? 'text-[#605c55]' : 'text-muted'}`}>
        {step.detail}
      </p>
      {/* The session date is the only concrete timestamp the record carries. */}
      {step.stage === 'scheduled' && step.state !== 'pending' && p.session !== '—' && (
        <p className="mt-1 text-[11.5px] text-gold">{p.session}</p>
      )}
      {step.stage === 'signed' && p.signedOn && (
        <p className="mt-1 text-[11.5px] text-gold">{p.signedOn}</p>
      )}
    </li>
  )
}
