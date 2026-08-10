import { useMemo, useState } from 'react'
import { Send, TriangleAlert } from 'lucide-react'
import { useSessions } from '../../lib/sessionStore'
import { useProspects } from '../../lib/prospectStore'
import { hydrateDocuments, documentFor, raiseDocument, useDocuments } from '../../lib/documents'
import { sendContract, ghlContractConfigured } from '../../lib/ghl'
import { signUrl } from '../../lib/contractStore'
import { notify } from '../../lib/toast'
import { ICA_TEMPLATE } from '../../data/icaTemplate'
import type { Preparer } from '../../types'

/**
 * Send the agreement to everyone who booked one session.
 *
 * Sending forty-odd contracts one at a time through a form means forty-odd
 * chances to mistype an email. This raises them from the roster itself, so the
 * name and address on every document are the ones already on the record.
 *
 * Anyone who already has a document is skipped rather than sent a second one —
 * a duplicate agreement is not something you can take back.
 */
export default function BatchSend() {
  const { sessions } = useSessions()
  const { preparers } = useProspects()
  useDocuments()

  const discovery = sessions.filter((s) => s.type === 'Discovery Session')
  const [sessionId, setSessionId] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState<{ sent: number; failed: string[] } | null>(null)

  const chosen = discovery.find((s) => s.id === sessionId)

  /** Everyone on that session, split by whether they already have one. */
  const { toSend, already } = useMemo(() => {
    const booked = preparers.filter((p) => p.sessionId && p.sessionId === sessionId)
    const already: Preparer[] = []
    const toSend: Preparer[] = []
    for (const p of booked) (documentFor(p.email) ? already : toSend).push(p)
    return { toSend, already }
  }, [preparers, sessionId])

  const byOffice = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of toSend) m.set(p.office, (m.get(p.office) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [toSend])

  const run = async () => {
    setRunning(true)
    const failed: string[] = []
    let sent = 0

    // One at a time, deliberately. A burst of parallel writes against the same
    // table gains seconds and costs the ability to say where it stopped.
    for (const p of toSend) {
      const raised = await raiseDocument({
        officeId: p.officeId,
        prospectId: p.id,
        officeName: p.office,
        ownerName: '',
        prospect: { name: p.name, email: p.email, phone: p.phone },
      })
      if (!raised.ok) {
        failed.push(`${p.name} — ${raised.error}`)
        continue
      }
      sent++

      // The document exists either way; a webhook that fails leaves a link the
      // office can still copy out of the list.
      const res = await sendContract({
        officeName: p.office,
        officeId: p.officeId,
        name: p.name,
        email: p.email,
        phone: p.phone,
        signLink: signUrl(raised.send.token),
        contractName: ICA_TEMPLATE.name,
        contractVersion: ICA_TEMPLATE.version,
        sentBy: p.office,
      })
      if (!res.ok) failed.push(`${p.name} — document created, but GoHighLevel ${res.reason}`)
    }

    await hydrateDocuments()
    setRunning(false)
    setConfirming(false)
    setDone({ sent, failed })
    notify(
      failed.length === 0
        ? `${sent} contract${sent === 1 ? '' : 's'} sent`
        : `${sent} sent, ${failed.length} problem${failed.length === 1 ? '' : 's'}`,
      failed.length === 0 ? 'good' : 'warn',
    )
  }

  return (
    <div className="bevel mb-[26px] p-4 sm:p-[22px]">
      <div className="flex flex-wrap items-end gap-4">
        <label className="block min-w-[220px] flex-1">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">
            Send the agreement to a whole session
          </span>
          <select
            value={sessionId}
            onChange={(e) => {
              setSessionId(e.target.value)
              setConfirming(false)
              setDone(null)
            }}
            className="w-full cursor-pointer rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none focus:border-[rgba(212,175,55,.5)]"
          >
            <option value="">Choose a Discovery Session…</option>
            {discovery.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} · {s.time}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setConfirming(true)}
          disabled={!chosen || toSend.length === 0 || running}
          className="btn-gold flex items-center gap-2 px-4 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} strokeWidth={2.2} />
          {chosen ? `Send to ${toSend.length}` : 'Send contracts'}
        </button>
      </div>

      {chosen && !confirming && !done && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {toSend.length} to send
          {already.length > 0 && (
            <> · <b className="text-champagne">{already.length} already have a contract</b> and will be skipped</>
          )}
          {toSend.length === 0 && ' — nobody on this session is waiting for one.'}
        </p>
      )}

      {/* The confirm states the blast radius: how many, to which offices, and
          that it cannot be taken back. */}
      {confirming && chosen && (
        <div className="mt-4 rounded-[11px] border border-[rgba(212,175,55,.35)] bg-[rgba(212,175,55,.05)] p-4">
          <div className="text-[13px] font-semibold text-champagne">
            Send {toSend.length} agreement{toSend.length === 1 ? '' : 's'} for {chosen.date}?
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            Each person receives their own office's agreement by email and text. Documents cannot be
            unsent, and each one starts that person's signing link.
            {already.length > 0 && ` ${already.length} already have one and are skipped.`}
          </p>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-muted">
            {byOffice.map(([office, n]) => (
              <span key={office}>
                {office} <b className="text-ivory">{n}</b>
              </span>
            ))}
          </div>

          {!ghlContractConfigured && (
            <p className="mt-3 flex gap-2 text-[11.5px] leading-relaxed text-warn">
              <TriangleAlert size={14} className="mt-px flex-none" />
              GoHighLevel isn't connected, so no messages will go out. The documents are still
              created and their links can be copied from each office's list.
            </p>
          )}

          <div className="mt-4 flex gap-2.5">
            <button onClick={() => void run()} disabled={running} className="btn-gold px-4 py-2 disabled:opacity-60">
              {running ? `Sending… ` : `Yes, send ${toSend.length}`}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={running}
              className="px-3 py-2 text-[12px] text-muted transition-colors hover:text-ivory disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="mt-4 rounded-[11px] border border-[rgba(212,175,55,.2)] bg-[rgba(212,175,55,.04)] p-4">
          <div className="text-[13px] font-semibold text-ivory">
            {done.sent} sent{done.failed.length > 0 && `, ${done.failed.length} needing attention`}
          </div>
          {done.failed.length > 0 && (
            <ul className="mt-2 space-y-1 text-[11.5px] text-bad">
              {done.failed.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
