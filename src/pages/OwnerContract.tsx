import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Check,
  ImageUp,
  PenLine,
  Pencil,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import ContractPaper from '../components/contract/ContractPaper'
import SignatureInput, { type SignatureDraft } from '../components/contract/SignatureInput'
import SentDocuments from '../components/contract/SentDocuments'
import { useAuth } from '../components/auth/auth'
import { officeById } from '../data/mock'
import {
  TERM_LENGTHS,
  blankDetails,
  contractDetails,
  officeBranding,
  saveBranding,
  saveDetails,
  saveTemplate,
  useContracts,
} from '../lib/contractStore'
import type { ContractDetails, ContractTemplate, OfficeBranding } from '../types'

type Tab = 'customize' | 'sent'

export default function OwnerContract() {
  const { session } = useAuth()
  const store = useContracts()
  const office = officeById(session?.officeId)
  const [tab, setTab] = useState<Tab>('customize')

  if (!office) return <Navigate to="/" replace />

  return (
    <>
      <PageHead eyebrow={office.name} title="Contracts">
        Customize the agreements your prospects receive, then send them out for signature.
      </PageHead>

      <div className="mb-5 inline-flex gap-1 rounded-[11px] border border-[rgba(212,175,55,.12)] p-1">
        {([
          { id: 'customize', label: 'Customize Templates' },
          { id: 'sent', label: 'Sent Documents' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-[8px] px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              tab === t.id
                ? 'bg-[rgba(212,175,55,.12)] text-champagne'
                : 'text-muted hover:text-ivory'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'customize' ? (
        <Customize office={office} templates={store.templates} />
      ) : (
        <SentDocuments officeId={office.id} />
      )}
    </>
  )
}

/* ── Customize ───────────────────────────────────────────── */

function Customize({
  office,
  templates,
}: {
  office: ReturnType<typeof officeById> & {}
  templates: ContractTemplate[]
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const template = templates.find((t) => t.id === templateId)

  const [branding, setBranding] = useState<OfficeBranding>(() => officeBranding(office.id))
  const [details, setDetails] = useState<ContractDetails>(() =>
    template ? contractDetails(office.id, template.id) : blankDetails(),
  )
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState('')

  // Swap in the selected contract's saved values.
  useEffect(() => {
    if (!template) return
    setBranding(officeBranding(office.id))
    setDetails(contractDetails(office.id, template.id))
    setDirty(false)
    setSavedAt('')
  }, [templateId, office.id])

  const editDetails = (patch: Partial<ContractDetails>) => {
    setDetails((d) => ({ ...d, ...patch }))
    setDirty(true)
  }
  const editBranding = (patch: Partial<OfficeBranding>) => {
    setBranding((b) => ({ ...b, ...patch }))
    setDirty(true)
  }

  const save = () => {
    if (!template) return
    saveBranding(office.id, branding)
    saveDetails(office.id, template.id, details)
    setDirty(false)
    setSavedAt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    )
  }

  if (!template) {
    return (
      <div className="panel p-10 text-center">
        <TriangleAlert size={24} className="mx-auto text-warn" />
        <h3 className="mt-3.5 text-[15px] font-semibold text-ivory">No contracts available yet</h3>
        <p className="mx-auto mt-2 max-w-[420px] text-[13px] leading-relaxed text-muted">
          Higher View hasn't published a contract template yet. Nothing will send until they do.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* ── Chooser ─────────────────────────────────────── */}
      <div className="panel mb-5 flex flex-wrap items-end gap-4 p-5">
        <label className="min-w-[240px] flex-1">
          <span className="mb-1.5 block text-[12px] text-ivory">Choose a contract to customize</span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full max-w-[320px] cursor-pointer rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.35)] focus:border-[rgba(212,175,55,.5)]"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </label>
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            dirty
              ? 'border-[rgba(224,177,90,.35)] bg-[rgba(224,177,90,.08)] text-warn'
              : savedAt
                ? 'border-[rgba(123,196,154,.3)] bg-[rgba(123,196,154,.08)] text-good'
                : 'border-[rgba(212,175,55,.16)] text-muted'
          }`}
        >
          {dirty ? 'Unsaved changes' : savedAt ? `Saved ${savedAt}` : 'Not saved yet'}
        </span>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <BrandingPanel
          template={template}
          branding={branding}
          details={details}
          dirty={dirty}
          onBranding={editBranding}
          onDetails={editDetails}
          onSave={save}
        />
        <PreviewPanel
          template={template}
          branding={branding}
          details={details}
          onTemplate={(t) => saveTemplate(t)}
        />
      </div>
    </>
  )
}

/* ── Left: branding & details ────────────────────────────── */

function BrandingPanel({
  template,
  branding,
  details,
  dirty,
  onBranding,
  onDetails,
  onSave,
}: {
  template: ContractTemplate
  branding: OfficeBranding
  details: ContractDetails
  dirty: boolean
  onBranding: (p: Partial<OfficeBranding>) => void
  onDetails: (p: Partial<ContractDetails>) => void
  onSave: () => void
}) {
  const [signing, setSigning] = useState(false)

  return (
    <div className="panel p-5">
      <h3 className="text-[14px] font-semibold text-ivory">
        Branding &amp; details — {template.shortName ?? template.name}
      </h3>

      <div className="mt-5 space-y-4">
        <LogoUpload value={branding.logo} onChange={(logo) => onBranding({ logo })} />

        <Text
          label="Business name (shared)"
          value={branding.businessName}
          onChange={(v) => onBranding({ businessName: v })}
        />
        <Text label="Hero title" value={details.heroTitle} onChange={(v) => onDetails({ heroTitle: v })} />
        <Text
          label="Hero subtitle"
          multiline
          value={details.heroSubtitle}
          onChange={(v) => onDetails({ heroSubtitle: v })}
        />
        <Text
          label="Company name (Entity Name)"
          placeholder="Your Company"
          value={details.entityName}
          onChange={(v) => onDetails({ entityName: v })}
        />
        <Text
          label="Business address"
          placeholder="Street address"
          value={details.businessAddress}
          onChange={(v) => onDetails({ businessAddress: v })}
        />
        <Text
          label="City, State, Zip"
          placeholder="City, State, Zip"
          value={details.cityStateZip}
          onChange={(v) => onDetails({ cityStateZip: v })}
        />
        <Text
          label="Governing law state"
          placeholder="Ohio"
          value={details.governingState}
          onChange={(v) => onDetails({ governingState: v })}
        />

        <div>
          <Text
            label="Agreement date"
            type="date"
            value={details.agreementDate}
            onChange={(v) => onDetails({ agreementDate: v })}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            Leave blank to date the agreement the day the client signs it. Setting a date also
            starts the term from that date.
          </p>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12px] text-ivory">Term length</span>
          <select
            value={details.termLength}
            onChange={(e) => onDetails({ termLength: e.target.value })}
            className="w-full cursor-pointer rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.35)] focus:border-[rgba(212,175,55,.5)]"
          >
            {TERM_LENGTHS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {/* Any extra blanks this template asks the office to supply */}
        {template.fields.map((f) => (
          <Text
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            multiline={f.multiline}
            value={details.values[f.key] ?? ''}
            onChange={(v) => onDetails({ values: { ...details.values, [f.key]: v } })}
          />
        ))}

        {/* Signature */}
        <div>
          <span className="mb-1.5 block text-[12px] text-ivory">
            Your signature (auto-applied to this contract)
          </span>
          {signing ? (
            <SignBlock
              defaultName={details.entityName || branding.businessName}
              onCancel={() => setSigning(false)}
              onSign={(sig) => {
                onDetails({ signature: sig })
                setSigning(false)
              }}
            />
          ) : (
            <div className="flex items-center gap-3">
              {/* Signatures read as ink on paper, so the swatch stays white. */}
              <div className="grid h-[62px] flex-1 place-items-center overflow-hidden rounded-[10px] border border-[rgba(212,175,55,.16)] bg-white px-3">
                {details.signature ? (
                  details.signature.drawing ? (
                    <img
                      src={details.signature.drawing}
                      alt="Your signature"
                      className="max-h-[52px] object-contain invert"
                    />
                  ) : (
                    <span className={`${details.signature.font ?? 'font-vibes'} text-[28px] text-[#1a1a1a]`}>
                      {details.signature.name}
                    </span>
                  )
                ) : (
                  <span className="text-[11.5px] text-[#9a958c]">No signature</span>
                )}
              </div>

              <button
                onClick={() => setSigning(true)}
                className="flex flex-none items-center gap-2 rounded-[9px] border border-[rgba(212,175,55,.2)] px-3.5 py-2.5 text-[12px] font-semibold text-champagne transition-colors hover:bg-[rgba(212,175,55,.07)]"
              >
                <PenLine size={14} /> {details.signature ? 'Replace' : 'Add signature'}
              </button>

              {details.signature && (
                <button
                  onClick={() => onDetails({ signature: undefined })}
                  className="flex-none text-muted transition-colors hover:text-bad"
                  aria-label="Remove signature"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onSave}
        disabled={!dirty}
        className="btn-gold mt-6 flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save size={14} /> Save {template.shortName ?? template.name}
      </button>
    </div>
  )
}

function LogoUpload({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const take = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return setError('That file isn\'t an image.')
    if (file.size > 2 * 1024 * 1024) return setError('That image is over 2MB.')
    const r = new FileReader()
    r.onload = () => {
      onChange(r.result as string)
      setError('')
    }
    r.readAsDataURL(file)
  }

  return (
    <div>
      <span className="mb-1.5 block text-[12px] text-ivory">Logo (shared across all contracts)</span>
      <div className="flex items-center gap-3">
        <div className="grid h-[58px] w-[58px] flex-none place-items-center overflow-hidden rounded-[10px] border border-[rgba(212,175,55,.16)] bg-[rgba(255,255,255,.02)]">
          {value ? (
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-muted">No logo</span>
          )}
        </div>
        <button
          onClick={() => input.current?.click()}
          className="flex items-center gap-2 rounded-[9px] border border-[rgba(212,175,55,.2)] px-3.5 py-2.5 text-[12px] font-semibold text-champagne transition-colors hover:bg-[rgba(212,175,55,.07)]"
        >
          <ImageUp size={14} /> Upload logo
        </button>
        {value && (
          <button
            onClick={() => onChange(undefined)}
            className="text-muted transition-colors hover:text-bad"
            aria-label="Remove logo"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error && <p className="mt-1.5 text-[11px] text-bad">{error}</p>}
    </div>
  )
}

function SignBlock({
  defaultName,
  onSign,
  onCancel,
}: {
  defaultName: string
  onSign: (s: ContractDetails['signature']) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(defaultName)
  const [draft, setDraft] = useState<SignatureDraft | null>(null)
  const today = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="rounded-[10px] border border-[rgba(212,175,55,.16)] p-3">
      <Text label="Full legal name" value={name} onChange={setName} />
      <div className="mt-3">
        <SignatureInput name={name} onChange={setDraft} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() =>
            draft &&
            onSign({ name: name.trim(), mode: draft.mode, drawing: draft.drawing, font: draft.font, signedAt: today })
          }
          disabled={!name.trim() || !draft}
          className="btn-gold flex-1 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Adopt and sign
        </button>
        <button
          onClick={onCancel}
          className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-3.5 py-2.5 text-[12px] text-muted hover:text-ivory"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ── Right: preview & inline template editing ────────────── */

function PreviewPanel({
  template,
  branding,
  details,
  onTemplate,
}: {
  template: ContractTemplate
  branding: OfficeBranding
  details: ContractDetails
  onTemplate: (t: ContractTemplate) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(template)

  useEffect(() => {
    setDraft(template)
    setEditing(false)
  }, [template.id])

  return (
    <div className="panel p-5 lg:sticky lg:top-[124px]">
      <h3 className="text-[14px] font-semibold text-ivory">Preview &amp; fill the template</h3>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
        Anything you fill in here (company name, signature, notice address, etc.) is saved and
        auto-populated into every document you send from this template.
      </p>

      <div className="mt-4 rounded-[12px] border border-[rgba(212,175,55,.12)] bg-[#0e0e11] p-5">
        <div className="text-[12.5px] font-semibold text-gold">
          {branding.businessName || 'Your business'}
        </div>
        <h2 className="mt-1.5 font-cinzel text-[19px] font-semibold leading-tight text-ivory">
          {details.heroTitle || template.name}
        </h2>
        {details.heroSubtitle && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{details.heroSubtitle}</p>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setEditing((v) => !v)}
            className={`flex items-center gap-1.5 rounded-[8px] border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
              editing
                ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.1)] text-champagne'
                : 'border-[rgba(212,175,55,.16)] text-muted hover:text-ivory'
            }`}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => setDraft(template)}
            disabled={!editing}
            className="flex items-center gap-1.5 rounded-[8px] border border-[rgba(212,175,55,.16)] px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:text-ivory disabled:opacity-40"
          >
            <RotateCcw size={12} /> Undo
          </button>
          <button
            onClick={() => {
              onTemplate({ ...draft, updatedAt: new Date().toISOString().slice(0, 10) })
              setEditing(false)
            }}
            disabled={!editing}
            className="flex items-center gap-1.5 rounded-[8px] border border-[rgba(123,196,154,.3)] px-3 py-1.5 text-[11.5px] font-semibold text-good transition-colors hover:bg-[rgba(123,196,154,.08)] disabled:opacity-40"
          >
            <Check size={12} /> Save
          </button>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
          {editing
            ? 'Click any blank in the document to set whether the signer must fill it in.'
            : 'Turn on Edit to change which fields are required.'}
        </p>

        {/* document */}
        <div className="mt-4 max-h-[520px] overflow-y-auto rounded-[10px] border border-[rgba(212,175,55,.1)] bg-obsidian p-5">
          <ContractPaper
            template={editing ? draft : template}
            details={details}
            branding={branding}
            compact
            editing={editing}
            onToggleRequired={(key) =>
              setDraft((d) => {
                const optional = d.optionalFields ?? []
                return {
                  ...d,
                  optionalFields: optional.includes(key)
                    ? optional.filter((k) => k !== key)
                    : [...optional, key],
                }
              })
            }
          />
        </div>
      </div>
    </div>
  )
}

/* ── Shared field ────────────────────────────────────────── */

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  multiline?: boolean
}) {
  const cls =
    'w-full rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.3)] focus:border-[rgba(212,175,55,.5)] placeholder:text-[#5f5c55]'
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] text-ivory">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${cls} resize-y leading-relaxed`}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  )
}
