import PageHead from '../components/ui/PageHead'
import Toggle from '../components/ui/Toggle'

function Cadence({ steps }: { steps: string[] }) {
  return (
    <div className="flex gap-2">
      {steps.map((s) => (
        <span key={s} className="rounded-lg border border-[rgba(212,175,55,.16)] bg-graphite px-[11px] py-[5px] text-[11px] font-semibold text-champagne">
          {s}
        </span>
      ))}
    </div>
  )
}

function Row({ title, desc, right }: { title: string; desc: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[rgba(212,175,55,.16)] py-[15px] last:border-none">
      <div>
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="mt-[3px] text-[11.5px] text-muted">{desc}</div>
      </div>
      {right}
    </div>
  )
}

export default function SettingsPage() {
  return (
    <>
      <PageHead eyebrow="Configuration" title="Settings">
        Tune the automation without rebuilding a single workflow — the core of what makes this resellable.
      </PageHead>

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
        <div className="bevel p-6">
          <h3 className="mb-4 font-cormorant text-[22px] font-semibold">Reminder cadence</h3>
          <Row title="Session reminders" desc="Before each Discovery Session" right={<Cadence steps={['24h', '2h', '30m']} />} />
          <Row title="Contract reminders" desc="After the agreement is sent" right={<Cadence steps={['24h', '48h']} />} />
          <Row title="Contract send delay" desc="After the session ends" right={<Cadence steps={['45 min']} />} />
        </div>

        <div className="bevel p-6">
          <h3 className="mb-4 font-cormorant text-[22px] font-semibold">Automation</h3>
          <Row title="Auto-grant training access on signature" desc="Removes the manual upload step" right={<Toggle />} />
          <Row title="Notify owner on registration" desc="When a prospect books a session" right={<Toggle />} />
          <Row title="Stop after final reminder" desc="Escalate unsigned to the owner" right={<Toggle />} />
          <Row title="Auto re-invite no-shows" desc="Roll missed prospects to next session" right={<Toggle defaultOn={false} />} />
        </div>
      </div>

      <div className="bevel mt-[18px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-cormorant text-[22px] font-semibold">Add an office</h3>
          <span className="eyebrow" style={{ fontSize: '9.5px' }}>Self-serve tenant</span>
        </div>
        <p className="text-[13px] text-muted">
          Enter a business name, upload a logo and contract, and Higher View generates the unique invite link
          automatically — no workflow duplication.
        </p>
        <button className="btn-gold mt-4 px-[26px] py-3">New office</button>
      </div>
    </>
  )
}
