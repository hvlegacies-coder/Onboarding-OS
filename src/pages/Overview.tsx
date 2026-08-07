import { AlertTriangle, Building2, Users, FileSignature } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import KpiCard from '../components/ui/KpiCard'
import Card from '../components/ui/Card'
import { activity, offices } from '../data/mock'
import { useProspects } from '../lib/prospectStore'
import { statusOf } from '../lib/contractStore'
import type { Stage } from '../types'

const dot: Record<string, string> = { good: '#7BC49A', gold: '#D4AF37', warn: '#E0B15A', bad: '#D08A7A' }

/** Funnel steps, each counting everyone who reached that stage or beyond. */
const FUNNEL: { name: string; from: Stage }[] = [
  { name: 'Invited', from: 'invited' },
  { name: 'Registered', from: 'scheduled' },
  { name: 'Attended', from: 'attended' },
  { name: 'Contract sent', from: 'sent' },
  { name: 'Signed', from: 'signed' },
  { name: 'Onboarded', from: 'onboarded' },
]

const ORDER: Stage[] = [
  'invited', 'scheduled', 'attended', 'sent', 'reminder1',
  'reminder2', 'followup', 'signed', 'orientation', 'onboarded',
]

export default function Overview() {
  const { preparers, activity: live } = useProspects()

  const reached = (from: Stage) =>
    preparers.filter((p) => {
      // Anyone escalated still reached "contract sent", but never got past it.
      if (p.stage === 'followup') return ORDER.indexOf(from) <= ORDER.indexOf('sent')
      return ORDER.indexOf(p.stage) >= ORDER.indexOf(from)
    }).length

  const total = preparers.length
  const funnel = FUNNEL.map((f) => {
    const count = reached(f.from)
    return { ...f, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })

  const awaiting = preparers.filter((p) => statusOf(p) === 'open').length
  const followups = preparers.filter((p) => statusOf(p) === 'stalled').length
  const pendingBranding = offices.filter((o) => o.branding !== 'complete')
  // Real events first, then the demo samples behind them.
  const feed = [...live, ...activity].slice(0, 6)

  return (
    <>
      <PageHead eyebrow="Command center" title="Onboarding overview">
        Every prospect across all {offices.length} offices, tracked from invitation to coaching in one central pipeline.
      </PageHead>

      <div className="mb-[26px] flex items-start gap-3.5 rounded-2xl border border-[rgba(224,177,90,.3)] bg-gradient-to-r from-[rgba(224,177,90,.10)] to-[rgba(224,177,90,.02)] px-[18px] py-4">
        <AlertTriangle size={20} className="mt-px flex-none text-warn" />
        <p className="text-[13px] leading-relaxed">
          <b className="text-warn">
            {pendingBranding.length} offices are missing contract branding.
          </b>{' '}
          Contract automation can't send the correct agreement until every owner's contract and logo
          is on file.{' '}
          {/* Named individually only while the list is short — at 49 offices it
              was a wall of text that said less than the count already does. */}
          {pendingBranding.length <= 6
            ? `${pendingBranding.map((o) => o.name.split(' ')[0]).join(', ')} are pending — collect assets to unblock launch.`
            : 'Open Offices to see which, and collect their details to unblock launch.'}
        </p>
      </div>

      <div className="mb-[26px] grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        <KpiCard label="Active offices" value={offices.length} sub="Across the network" icon={<Building2 size={22} strokeWidth={1.5} />} />
        <KpiCard label="In pipeline" value={total} sub="Prospects and preparers" icon={<Users size={22} strokeWidth={1.5} />} />
        <KpiCard label="Awaiting signature" value={awaiting} sub="In reminder sequence" icon={<FileSignature size={22} strokeWidth={1.5} />} />
        <KpiCard label="Owner follow-ups" value={followups} sub="Need personal outreach" icon={<AlertTriangle size={22} strokeWidth={1.5} />} />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <Card title="Onboarding funnel" eyebrow="Last 30 days">
          {funnel.map((f) => (
            <div key={f.name} className="mb-[13px] flex items-center gap-3.5">
              <div className="w-[120px] flex-none text-[12.5px]">{f.name}</div>
              <div className="h-[26px] flex-1 overflow-hidden rounded-lg border border-[rgba(212,175,55,.08)] bg-graphite">
                <div
                  className="gold-fill flex h-full items-center justify-end rounded-lg pr-2.5 text-[11px] font-bold text-[#241a04] shadow-[0_1px_0_rgba(255,255,255,.3)_inset]"
                  style={{ width: `${f.pct}%` }}
                >
                  {f.count}
                </div>
              </div>
              <div className="w-11 flex-none text-right text-[12px] text-muted">{f.pct}%</div>
            </div>
          ))}
        </Card>

        <Card title="Recent activity" eyebrow="Live">
          {feed.length === 0 && (
            <p className="py-6 text-center text-[12.5px] text-muted">
              Nothing yet. Activity appears here as prospects register, sign and move through the pipeline.
            </p>
          )}
          {feed.map((a) => (
            <div key={a.id} className="flex gap-3.5 border-b border-[rgba(212,175,55,.16)] py-3 last:border-none">
              <span className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full" style={{ background: dot[a.tone] }} />
              <div>
                <div className="text-[13px] leading-normal [&_b]:font-semibold [&_b]:text-champagne" dangerouslySetInnerHTML={{ __html: a.text }} />
                <div className="mt-[3px] text-[11px] text-muted">{a.meta}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
