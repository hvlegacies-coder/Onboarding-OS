import { useState } from 'react'
import PageHead from '../components/ui/PageHead'
import KpiCard from '../components/ui/KpiCard'
import PreparerDrawer from '../components/preparer/PreparerDrawer'
import Avatar from '../components/ui/Avatar'
import Chip from '../components/ui/Chip'
import StagePill from '../components/ui/StagePill'
import { offices } from '../data/mock'
import { preparerById, useProspects } from '../lib/prospectStore'
import { DOC_LABEL, docStatus, statusOf } from '../lib/contractStore'
import { useDocuments } from '../lib/documents'
import BatchSend from '../components/contract/BatchSend'
import type { Preparer, Stage } from '../types'

/** What happens next for someone at this stage, in plain language. */
const NEXT: Record<Stage, { text: string; danger?: boolean }> = {
  invited: { text: 'Awaiting session registration' },
  scheduled: { text: 'Reminders scheduled before the session' },
  attended: { text: 'Contract sends ~45 min after the session' },
  sent: { text: 'Reminder #1 in 24h if unsigned' },
  reminder1: { text: 'Reminder #2 in 24h' },
  reminder2: { text: 'Escalate in 24h if unsigned' },
  followup: { text: 'Owner to reach out personally', danger: true },
  signed: { text: 'Training access granted' },
  orientation: { text: 'Orientation scheduled' },
  onboarded: { text: 'Coaching with the owner' },
}

export default function Contracts() {
  const { preparers } = useProspects()
  // Document status comes from the database; without this the page renders
  // before the cache lands and every row reads "not sent".
  useDocuments()
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = preparerById(openId ?? undefined)

  // Only people who have reached the contract step belong on this page.
  const rows = preparers.filter((p) => statusOf(p) !== 'not-sent')
  const sent = rows.length
  const signed = rows.filter((p) => statusOf(p) === 'signed').length
  const open = rows.filter((p) => statusOf(p) === 'open').length
  const escalated = rows.filter((p) => statusOf(p) === 'stalled').length
  const pct = sent ? Math.round((signed / sent) * 100) : 0

  return (
    <>
      <PageHead eyebrow="Automation" title="Contracts">
        The correct branded agreement sends ~45 minutes after each Discovery Session. Two reminders, then automation
        stops and the owner takes over.
      </PageHead>

      <BatchSend />

      <div className="mb-[26px] grid grid-cols-2 gap-3 sm:gap-[18px] lg:grid-cols-4">
        <KpiCard label="Sent" value={sent} sub="All time" />
        <KpiCard
          label="Signed"
          value={signed}
          sub={<><i className="not-italic text-good">{pct}%</i> conversion</>}
        />
        <KpiCard label="In reminders" value={open} sub="Awaiting signature" />
        <KpiCard label="Escalated" value={escalated} sub="Owner follow-up" />
      </div>

      <div className="bevel overflow-x-auto px-2 pb-0 pt-2">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              {['Preparer', 'Office contract', 'Stage', 'Document', 'Next step'].map((h) => (
                <th key={h} className="border-b border-[rgba(212,175,55,.16)] px-3.5 pb-3.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <Row key={p.id} p={p} onOpen={() => setOpenId(p.id)} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3.5 py-10 text-center text-[13px] text-muted">
                  No contracts have gone out yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <PreparerDrawer preparer={selected} canAct onClose={() => setOpenId(null)} />
      )}
    </>
  )
}

function Row({ p, onOpen }: { p: Preparer; onOpen: () => void }) {
  // Keyed off the contract status, not the raw stage: telling someone who has
  // already signed that "reminders are scheduled before the session" is worse
  // than saying nothing.
  const status = statusOf(p)
  const next =
    status === 'signed'
      ? NEXT.signed
      : status === 'stalled'
        ? NEXT.followup
        : NEXT[p.stage]
  const doc = DOC_LABEL[docStatus(p.email)]
  // An office with incomplete branding can't send a correct contract (R4).
  const office = offices.find((o) => o.id === p.officeId)
  const pending = office && office.branding !== 'complete'

  return (
    <tr
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="cursor-pointer [&:hover_td]:bg-[rgba(212,175,55,.03)]"
    >
      <td className="border-b border-[rgba(212,175,55,.07)] px-3.5 py-[15px]">
        <div className="flex items-center gap-[11px]">
          <Avatar initials={p.initials} />
          <div>
            <div className="text-[13px] font-semibold">{p.name}</div>
            <div className="text-[11px] text-muted">{p.email}</div>
          </div>
        </div>
      </td>
      <td className="border-b border-[rgba(212,175,55,.07)] px-3.5 py-[15px]">
        <Chip tone={pending ? 'warn' : 'gold'}>
          {pending ? `${p.office} — pending branding` : `${p.office} agreement`}
        </Chip>
      </td>
      <td className="border-b border-[rgba(212,175,55,.07)] px-3.5 py-[15px]">
        <StagePill stage={p.stage} />
      </td>
      {/* What the document itself reports — sent but unopened is invisible
          from the pipeline stage alone. */}
      <td className="border-b border-[rgba(212,175,55,.07)] px-3.5 py-[15px]">
        <Chip tone={doc.tone} className="whitespace-nowrap" >{doc.label}</Chip>
      </td>
      <td
        className={`border-b border-[rgba(212,175,55,.07)] px-3.5 py-[15px] text-[13px] ${
          next.danger ? 'text-bad' : 'text-muted'
        }`}
      >
        {next.text}
      </td>
    </tr>
  )
}
