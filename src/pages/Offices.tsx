import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  RotateCcw,
} from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Chip from '../components/ui/Chip'
import OfficeMark from '../components/ui/OfficeMark'
import { offices, inviteUrl } from '../data/mock'
import {
  assignTemplate,
  assignedTemplateId,
  contractDetails,
  officeBranding,
  useContracts,
} from '../lib/contractStore'
import { useProspects } from '../lib/prospectStore'
import type { BrandingStatus, Office } from '../types'

const brand: Record<BrandingStatus, { label: string; tone: 'good' | 'warn' }> = {
  complete: { label: 'Branding complete', tone: 'good' },
  'contract-pending': { label: 'Contract pending', tone: 'warn' },
  'logo-pending': { label: 'Logo pending', tone: 'warn' },
}

export default function Offices() {
  const { preparers } = useProspects()
  // Only one office is open at a time — the point is a scannable index.
  const [openId, setOpenId] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const counts = preparers.reduce<Record<string, number>>((acc, p) => {
    acc[p.officeId] = (acc[p.officeId] ?? 0) + 1
    return acc
  }, {})

  const term = q.trim().toLowerCase()
  const shown = term
    ? offices.filter((o) => o.name.toLowerCase().includes(term) || o.owner.toLowerCase().includes(term))
    : offices

  return (
    <>
      <PageHead eyebrow="Tenants" title="Offices">
        {offices.length} white-label tenants, each with its own invite link, contract, and branding. Open an
        office for its link, contract and sign-in.
      </PageHead>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter offices…"
        aria-label="Filter offices"
        className="mb-4 w-full max-w-[320px] rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3.5 py-2.5 text-[13px] text-ivory outline-none transition-colors focus:border-[rgba(212,175,55,.5)] placeholder:text-muted"
      />

      <div className="space-y-2.5">
        {shown.map((o) => (
          <OfficeRow
            key={o.id}
            office={o}
            count={counts[o.id] ?? 0}
            open={openId === o.id}
            onToggle={() => setOpenId((cur) => (cur === o.id ? null : o.id))}
          />
        ))}
        {shown.length === 0 && (
          <div className="panel p-10 text-center text-[13px] text-muted">No office matches “{q}”.</div>
        )}
      </div>
    </>
  )
}

/** Collapsed: the office name alone. Open: everything about that tenant. */
function OfficeRow({
  office,
  count,
  open,
  onToggle,
}: {
  office: Office
  count: number
  open: boolean
  onToggle: () => void
}) {
  const logo = officeBranding(office.id).logo

  return (
    <div className={`panel ${open ? 'border-[rgba(212,175,55,.3)]' : 'panel-hover'}`}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3.5 px-4 py-3 text-left"
      >
        <OfficeMark name={office.name} initials={office.initials} logo={logo} size={30} interactive={false} />
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ivory">{office.name}</span>
        <span className="hidden flex-none text-[11.5px] text-muted sm:block">
          {count} {count === 1 ? 'preparer' : 'preparers'}
        </span>
        <Chip tone={brand[office.branding].tone}>{brand[office.branding].label}</Chip>
        <ChevronDown
          size={15}
          className={`flex-none text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-[rgba(212,175,55,.1)] px-4 pb-4 pt-4">
          <div className="mb-3 text-[12px] text-muted">
            {office.owner ? `Owner · ${office.owner}` : 'Owner name not collected yet'}
          </div>
          <LinkRow url={inviteUrl(office)} />
          <TemplatePicker officeId={office.id} />
        </div>
      )}
    </div>
  )
}

function LinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="flex items-center gap-2 rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-[11px] py-[9px]">
      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ivory">
        {url.replace(/^https?:\/\//, '')}
      </span>
      <button onClick={copy} className="flex flex-none items-center gap-1 text-[11px] text-gold hover:text-champagne">
        {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        title="Preview what a prospect sees"
        className="flex-none text-muted transition-colors hover:text-gold"
      >
        <ExternalLink size={13} />
      </a>
    </div>
  )
}

/** Which contract this office sends. Nothing sends while it's unassigned (R4). */
function TemplatePicker({ officeId }: { officeId: string }) {
  const store = useContracts()
  const current = assignedTemplateId(officeId)
  const signed = Boolean(current && contractDetails(officeId, current).signature)

  return (
    <div className="mt-2 rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-[11px] py-[9px]">
      <div className="flex items-center gap-2">
        <FileText size={12} className="flex-none text-gold" />
        <span className="flex-1 text-[10.5px] uppercase tracking-[0.12em] text-muted">Contract</span>
        {current && (
          <span className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${signed ? 'text-good' : 'text-warn'}`}>
            {signed ? 'Countersigned' : 'Unsigned'}
          </span>
        )}
      </div>
      <select
        value={current ?? ''}
        onChange={(e) => assignTemplate(officeId, e.target.value || null)}
        className="mt-1.5 w-full cursor-pointer rounded-[7px] border border-[rgba(212,175,55,.12)] bg-obsidian px-2 py-1.5 text-[11.5px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.32)] focus:border-[rgba(212,175,55,.5)]"
      >
        <option value="">Not assigned — nothing will send</option>
        {store.templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} · v{t.version}
          </option>
        ))}
      </select>
    </div>
  )
}

