import PageHead from '../components/ui/PageHead'
import Chip from '../components/ui/Chip'
import { messages } from '../data/mock'

export default function Messages() {
  return (
    <>
      <PageHead eyebrow="Message library" title="Messages">
        Every automated touchpoint, editable in one place. Merge fields populate from the preparer and their office.
      </PageHead>

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
