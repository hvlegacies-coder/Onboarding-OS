import { useEffect, useMemo, useState } from 'react'
import { Check, Send, TriangleAlert } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Chip from '../components/ui/Chip'
import Avatar from '../components/ui/Avatar'
import { messages } from '../data/mock'
import { recordOnboardingSent, useDocuments } from '../lib/documents'
import { ghlOnboardingConfigured, sendOnboarding } from '../lib/ghl'
import type { ContractSend as Doc } from '../types'

export default function Messages() {
  return (
    <>
      <PageHead eyebrow="Message library" title="Messages">
        Every automated touchpoint, editable in one place. Merge fields populate from the preparer and their office.
      </PageHead>

      <SignedPreparers />

      <h3 className="mb-3 mt-9 font-cinzel text-[15px] font-semibold text-champagne">Templates</h3>
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        {messages.map((m) => (
          <div key={m.code} className="bevel p-5">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="font-cinzel text-[13px] tracking-[0.05em] text-gold">{m.code}</span>
              <span className="rounded-md border border-[rgba(212,175,55,.16)] bg-graphite2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
                {m.channel}
              </span>
              <Chip className="ml-auto">{m.audience}</Chip>
            </div>
            <h4 className="mb-2 text-[14px] font-semibold">{m.title}</h4>
            <div className="border-l-2 border-[rgba(212,175,55,.16)] pl-3 text-[12.5px] italic leading-relaxed text-muted">
              {m.body}
            </div>
            {m.note && <div className="mt-3 text-[11px] text-muted">{m.note}</div>}
          </div>
        ))}
      </div>
    </>
  )
}

/* ── Everyone who has signed, with a manual onboarding nudge ────────── */

type RowState = 'idle' | 'sending' | 'sent' | 'error'

type Tab = 'toSend' | 'sent'

function SignedPreparers() {
  const { documents, loading } = useDocuments()
  const [tab, setTab] = useState<Tab>('toSend')
  const [state, setState] = useState<Record<string, RowState>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSending, setBulkSending] = useState(false)

  const signed = useMemo(
    () =>
      documents
        .filter((d) => d.status === 'signed')
        .sort((a, b) => (b.signedAt ?? '').localeCompare(a.signedAt ?? '')),
    [documents],
  )

  // A send just recorded is enough to move a row — no need to wait on the
  // onboardingSentAt round trip too.
  const toSend = useMemo(
    () => signed.filter((d) => !d.onboardingSentAt && state[d.token] !== 'sent'),
    [signed, state],
  )
  const alreadySent = useMemo(
    () =>
      signed
        .filter((d) => d.onboardingSentAt || state[d.token] === 'sent')
        .sort((a, b) => (b.onboardingSentAt ?? '').localeCompare(a.onboardingSentAt ?? '')),
    [signed, state],
  )
  const shown = tab === 'toSend' ? toSend : alreadySent

  // Drop selections for anyone who is no longer in the "to send" list.
  useEffect(() => {
    const tokens = new Set(toSend.map((d) => d.token))
    setSelected((s) => {
      const next = new Set([...s].filter((t) => tokens.has(t)))
      return next.size === s.size ? s : next
    })
  }, [toSend])

  const allSelected = toSend.length > 0 && selected.size === toSend.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(toSend.map((d) => d.token)))
  }

  const toggleOne = (token: string) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(token)) next.delete(token)
      else next.add(token)
      return next
    })
  }

  const sendOne = async (d: Doc) => {
    setState((s) => ({ ...s, [d.token]: 'sending' }))
    const res = await sendOnboarding({
      name: d.prospect.name,
      email: d.prospect.email,
      phone: d.prospect.phone,
      officeName: d.officeName,
      officeId: d.officeId,
    })
    if (res.ok) await recordOnboardingSent(d.token)
    setState((s) => ({ ...s, [d.token]: res.ok ? 'sent' : 'error' }))
  }

  const sendSelected = async () => {
    const targets = toSend.filter((d) => selected.has(d.token))
    if (targets.length === 0) return
    setBulkSending(true)
    // One at a time — a burst of parallel posts is more likely to trip the
    // webhook's own rate limiting than to save anyone meaningful time here.
    for (const d of targets) {
      await sendOne(d)
    }
    setBulkSending(false)
  }

  return (
    <div className="mt-6 bevel p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="eyebrow">Signed contracts</div>
        <Chip>{signed.length}</Chip>
      </div>
      <p className="mb-4 text-[12.5px] leading-relaxed text-muted">
        Everyone with an executed agreement. Select all or pick individuals, then send the
        onboarding message by hand — to re-send, or for anyone the automatic one missed. Once
        sent, a preparer moves to "Already sent" so they can't be messaged twice by accident.
      </p>

      {!ghlOnboardingConfigured && (
        <p className="mb-3 flex items-center gap-2 text-[11.5px] text-muted">
          <TriangleAlert size={13} className="flex-none text-gold/70" />
          No onboarding webhook connected yet — set VITE_GHL_ONBOARDING_WEBHOOK to enable sending.
        </p>
      )}

      <div className="mb-4 flex gap-2 border-b border-[rgba(212,175,55,.1)]">
        {(
          [
            ['toSend', 'To send', toSend.length],
            ['sent', 'Already sent', alreadySent.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-1 pb-2.5 text-[12.5px] font-semibold transition-colors ${
              tab === id ? 'text-champagne' : 'text-muted hover:text-ivory'
            }`}
          >
            {label} <span className={tab === id ? 'text-gold' : 'text-muted/70'}>{count}</span>
            {tab === id && (
              <span className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full bg-[var(--goldgrad)]" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-muted">Loading…</div>
      ) : signed.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-muted">No signed contracts yet.</div>
      ) : shown.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-muted">
          {tab === 'toSend' ? 'Everyone signed has been messaged.' : 'Nobody sent yet.'}
        </div>
      ) : (
        <>
          {tab === 'toSend' && (
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-[rgba(212,175,55,.1)] pb-3">
              <label className="flex items-center gap-2 text-[12px] font-medium text-muted">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleAll}
                  className="h-[15px] w-[15px] cursor-pointer accent-[#D4AF37]"
                />
                {allSelected ? 'All selected' : selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </label>
              <button
                onClick={() => void sendSelected()}
                disabled={!ghlOnboardingConfigured || selected.size === 0 || bulkSending}
                className="btn-gold flex items-center gap-2 px-3.5 py-2 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={13} strokeWidth={2.2} />
                {bulkSending ? 'Sending…' : `Send onboarding message${selected.size > 1 ? ` (${selected.size})` : ''}`}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {shown.map((d) => {
              const rowState = state[d.token] ?? 'idle'
              const checked = selected.has(d.token)
              return (
                <div
                  key={d.token}
                  className={`flex flex-wrap items-center gap-3 rounded-[11px] border px-3.5 py-2.5 transition-colors ${
                    checked ? 'border-[rgba(212,175,55,.32)] bg-[rgba(212,175,55,.05)]' : 'border-[rgba(212,175,55,.1)]'
                  }`}
                >
                  {tab === 'toSend' && (
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOne(d.token)}
                      className="h-[15px] w-[15px] flex-none cursor-pointer accent-[#D4AF37]"
                    />
                  )}
                  <Avatar initials={d.prospect.name.slice(0, 2).toUpperCase()} size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ivory">
                      {d.prospect.name}
                    </span>
                    <span className="block truncate text-[11.5px] text-muted">
                      {d.officeName} · signed {d.signedAt}
                    </span>
                  </span>
                  {tab === 'toSend' ? (
                    <button
                      onClick={() => void sendOne(d)}
                      disabled={!ghlOnboardingConfigured || rowState === 'sending' || bulkSending}
                      className="flex-none rounded-[9px] border border-[rgba(212,175,55,.16)] px-3 py-1.5 text-[11.5px] font-semibold text-gold transition-colors hover:border-[rgba(212,175,55,.4)] hover:text-champagne disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {rowState === 'sending' ? (
                        'Sending…'
                      ) : rowState === 'error' ? (
                        <span className="flex items-center gap-1.5 text-bad">
                          <TriangleAlert size={13} /> Failed — retry
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <Send size={12} strokeWidth={2.2} /> Send
                        </span>
                      )}
                    </button>
                  ) : (
                    <span className="flex flex-none items-center gap-1.5 text-[11.5px] font-medium text-good">
                      <Check size={13} strokeWidth={2.6} />
                      Sent{d.onboardingSentAt ? ` ${new Date(d.onboardingSentAt).toLocaleDateString()}` : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
