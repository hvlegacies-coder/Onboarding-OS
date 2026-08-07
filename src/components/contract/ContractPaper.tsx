import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { mergeFields } from '../../lib/contractStore'
import type { ContractDetails, ContractTemplate, OfficeBranding, Signature } from '../../types'

interface Props {
  template: ContractTemplate
  details: ContractDetails
  branding: OfficeBranding
  /** Whose copy this is. Blank on the office's master copy. */
  preparerName?: string
  /** The preparer's signature, once they've signed. */
  counterSignature?: Signature
  /** Renders the document body only, for the in-panel preview. */
  compact?: boolean
  /** Turns every blank into a clickable field with a required/not-required toggle. */
  editing?: boolean
  onToggleRequired?: (key: string) => void
  /** Lets the signer type into any blank the office left empty. */
  fillable?: boolean
  signerValues?: Record<string, string>
  onSignerChange?: (key: string, value: string) => void
}

/** intro_day -> "Intro day" */
export const humanize = (key: string) =>
  key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

/** The contract as it will look to a preparer. */
export default function ContractPaper({
  template,
  details,
  branding,
  preparerName,
  counterSignature,
  compact,
  editing,
  onToggleRequired,
  fillable,
  signerValues,
  onSignerChange,
}: Props) {
  const merged = mergeFields(details, branding, preparerName)
  const optional = template.optionalFields ?? []

  /**
   * Which blank's required/not-required popover is open, as `sectionId:index`.
   * Held here rather than inside each chip so only one can ever be open — with
   * per-chip state they all stayed open at once and buried the document.
   */
  const [openField, setOpenField] = useState<string | null>(null)

  // Clicking anywhere else, or pressing Escape, dismisses it.
  useEffect(() => {
    if (!openField) return
    const close = () => setOpenField(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    // Capture phase, so a click on another chip still gets to open its own.
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [openField])

  return (
    <div
      className={`print-doc contract-prose ${
        compact ? '' : 'rounded-[12px] border border-[rgba(212,175,55,.14)] bg-[#0e0e11] px-8 py-9'
      }`}
    >
      {branding.logo && (
        <img
          src={branding.logo}
          alt=""
          className="mx-auto mb-7 max-h-[92px] max-w-[190px] object-contain"
        />
      )}

      <div className="space-y-5">
        {template.sections.map((s) => (
          <section key={s.id}>
            <h4 className="font-cinzel text-[13px] font-semibold leading-snug tracking-[0.04em] text-champagne">
              {s.heading}
            </h4>
            <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.9] text-ivory/85">
              <Body
                text={s.body}
                sectionId={s.id}
                values={merged}
                optional={optional}
                fields={template.fields}
                editing={editing}
                onToggleRequired={onToggleRequired}
                openField={openField}
                onOpenField={setOpenField}
                fillable={fillable}
                signerValues={signerValues}
                onSignerChange={onSignerChange}
              />
            </p>
          </section>
        ))}
      </div>

      {/*
        Execution block, mirroring the agreement's own layout. The "INTENDING
        TO BE LEGALLY BOUND" clause is NOT repeated here — it is already the
        template's final section, and printing it in both places duplicated the
        sentence across the last two pages.
      */}
      <div className="exec mt-9 grid gap-8 border-t border-[rgba(212,175,55,.16)] pt-7 sm:grid-cols-2">
        <SignatureBlock
          party="“COMPANY”"
          name={details.entityName || branding.businessName}
          title="Owner"
          signature={details.signature}
        />
        <SignatureBlock
          party="“CONTRACTOR”"
          name={preparerName ?? ''}
          title="Independent Contractor"
          signature={counterSignature}
        />
      </div>
    </div>
  )
}

/** Splits body text on {{merge_fields}} and renders each blank inline. */
function Body({
  text,
  sectionId,
  values,
  optional,
  fields,
  editing,
  onToggleRequired,
  openField,
  onOpenField,
  fillable,
  signerValues,
  onSignerChange,
}: {
  text: string
  sectionId?: string
  values: Record<string, string>
  optional: string[]
  fields: ContractTemplate['fields']
  editing?: boolean
  onToggleRequired?: (key: string) => void
  /** `sectionId:index` of the one open popover, or null. */
  openField?: string | null
  onOpenField?: (id: string | null) => void
  fillable?: boolean
  signerValues?: Record<string, string>
  onSignerChange?: (key: string, value: string) => void
}) {
  const parts = text.split(/(\{\{\s*\w+\s*\}\})/g)

  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{\s*(\w+)\s*\}\}$/)
        if (!m) return <span key={i}>{part}</span>

        const key = m[1]
        const value = values[key]?.trim()
        const label = fields.find((f) => f.key === key)?.label ?? humanize(key)
        const required = !optional.includes(key)

        if (editing) {
          const id = `${sectionId ?? 's'}:${i}`
          return (
            <FieldChip
              key={i}
              label={label}
              placeholder={label}
              value={value}
              required={required}
              open={openField === id}
              onOpenChange={(next) => onOpenField?.(next ? id : null)}
              onToggle={() => onToggleRequired?.(key)}
            />
          )
        }

        // Filled in. `print-field` gives it the blue form-field box on paper,
        // matching the source PDF; it carries no styling on screen.
        if (value)
          return (
            <span key={i} className="print-field text-ivory">
              {value}
            </span>
          )

        // The office left it blank, so it's the signer's to complete.
        if (fillable) {
          const typed = signerValues?.[key] ?? ''
          return (
            <input
              key={i}
              value={typed}
              placeholder={label}
              aria-label={label}
              data-fillable="true"
              data-field-id={key}
              onChange={(e) => onSignerChange?.(key, e.target.value)}
              style={{ width: `${Math.max(label.length, typed.length) + 3}ch` }}
              className={`mx-0.5 max-w-full rounded-[4px] border-b px-2 py-0.5 align-baseline text-[12.5px] outline-none transition-colors placeholder:italic placeholder:text-muted/70 ${
                typed
                  ? 'border-[rgba(212,175,55,.5)] bg-[rgba(212,175,55,.06)] text-ivory'
                  : required
                    ? 'border-champagne bg-[rgba(212,175,55,.1)] text-ivory focus:bg-[rgba(212,175,55,.16)]'
                    : 'border-dashed border-[rgba(212,175,55,.3)] bg-[rgba(255,255,255,.02)] text-ivory'
              }`}
            />
          )
        }

        // Empty blank, the way the prospect will see it. Prints as an empty
        // blue form field, exactly like the unfilled template.
        return (
          <span
            key={i}
            className={`print-field mx-0.5 inline-block min-w-[92px] rounded-[4px] border-b px-2 py-0.5 align-baseline text-[12px] italic ${
              required
                ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.06)] text-muted'
                : 'border-[rgba(212,175,55,.18)] bg-[rgba(255,255,255,.02)] text-muted/60'
            }`}
          >
            {label}
          </span>
        )
      })}
    </>
  )
}

/** A blank in edit mode: click it to set whether the signer must fill it in. */
function FieldChip({
  label,
  placeholder,
  value,
  required,
  open,
  onOpenChange,
  onToggle,
}: {
  label: string
  placeholder: string
  value?: string
  required: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onToggle: () => void
}) {
  return (
    // Stop clicks inside the chip reaching the document-level dismiss handler,
    // which would otherwise close the popover the moment it opened.
    <span
      className="relative mx-0.5 inline-block align-baseline"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        title={`${label} — ${required ? 'required' : 'not required'}`}
        className={`min-w-[92px] rounded-[4px] border-b px-2 py-0.5 text-[12px] italic transition-colors ${
          open
            ? 'border-champagne bg-[rgba(212,175,55,.16)] text-champagne'
            : required
              ? 'border-[rgba(212,175,55,.5)] bg-[rgba(212,175,55,.08)] text-muted hover:bg-[rgba(212,175,55,.14)]'
              : 'border-dashed border-[rgba(212,175,55,.28)] bg-[rgba(255,255,255,.02)] text-muted/60 hover:bg-[rgba(212,175,55,.08)]'
        }`}
      >
        {value || placeholder}
      </button>

      {open && (
        <span className="absolute bottom-[calc(100%+6px)] left-0 z-30 flex items-center gap-2 whitespace-nowrap rounded-[10px] border border-[rgba(212,175,55,.28)] bg-onyx px-2.5 py-2 shadow-[0_10px_30px_rgba(0,0,0,.6)]">
          <span className="text-[11.5px] not-italic text-muted">{label}</span>
          <button
            type="button"
            onClick={() => {
              onToggle()
              // Dismiss once the choice is made — that's the whole interaction.
              onOpenChange(false)
            }}
            className={`rounded-[7px] px-2.5 py-1.5 text-[11.5px] font-semibold not-italic transition-colors ${
              required
                ? 'bg-[rgba(212,175,55,.14)] text-champagne hover:bg-[rgba(212,175,55,.22)]'
                : 'bg-graphite2 text-muted hover:text-ivory'
            }`}
          >
            {required ? 'Required' : 'Not required'}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ivory"
          >
            <X size={13} />
          </button>
        </span>
      )}
    </span>
  )
}

function SignatureBlock({
  party,
  name,
  title,
  signature,
}: {
  party: string
  name: string
  title: string
  signature?: Signature
}) {
  const line =
    'exec-line flex items-baseline gap-2 border-b border-[rgba(212,175,55,.2)] py-1.5 text-[12px]'
  const label = 'exec-label w-[38px] flex-none text-muted'

  return (
    <div>
      <div className="exec-party mb-1 text-[12px] font-semibold text-ivory">{party}</div>
      <div className={line}>
        <span className="text-ivory">{name || '—'}</span>
      </div>

      {/* `exec-sign` is what the print stylesheet targets to ink the
          signature black on paper — see index.css. */}
      {/* items-center, not items-baseline: an image's baseline is its bottom
          edge, which dropped "By:" to the floor of a double-height row. */}
      <div className={`${line} exec-sign min-h-[24px] !items-center`}>
        <span className={label}>By:</span>
        {signature?.drawing ? (
          <img src={signature.drawing} alt="" className="max-h-[20px] object-contain object-left" />
        ) : signature ? (
          <span className={`${signature.font ?? 'font-vibes'} text-[22px] leading-none text-champagne`}>
            {signature.name}
          </span>
        ) : null}
      </div>

      <div className={line}>
        <span className={label}>Print:</span>
        <span className="text-ivory">{signature?.name || name || '—'}</span>
      </div>
      <div className={line}>
        <span className={label}>Title:</span>
        <span className="text-ivory">{title}</span>
      </div>
      <div className={line}>
        <span className={label}>Date:</span>
        <span className="text-ivory">{signature?.signedAt || '—'}</span>
      </div>
    </div>
  )
}
