import { useState } from 'react'
import { Building2, FileText, GripVertical, Plus, Save, Trash2, TriangleAlert } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Chip from '../components/ui/Chip'
import ContractPaper from '../components/contract/ContractPaper'
import { offices } from '../data/mock'
import {
  assignTemplate,
  assignedTemplateId,
  blankDetails,
  deleteTemplate,
  newTemplateId,
  saveTemplate,
  useContracts,
} from '../lib/contractStore'
import { notify } from '../lib/toast'
import type { ContractTemplate } from '../types'

const blank = (): ContractTemplate => ({
  id: newTemplateId(),
  name: 'New agreement',
  version: '1.0',
  updatedAt: new Date().toISOString().slice(0, 10),
  fields: [],
  sections: [{ id: 's1', heading: '1. Section heading', body: 'Body text. Use {{office_name}} and {{preparer_name}} to merge in details.' }],
})

export default function Templates() {
  const store = useContracts()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const editing = store.templates.find((t) => t.id === editingId)

  if (editing) {
    return <Editor template={editing} onClose={() => setEditingId(null)} />
  }

  return (
    <>
      <PageHead eyebrow="Contracts" title="Templates">
        The agreements offices send. Wording is set here and is identical for every office that uses
        a template — each office only fills in its own blanks and countersigns.
      </PageHead>

      <div className="mb-5 flex justify-end">
        <button
          onClick={() => {
            const t = blank()
            saveTemplate(t)
            setEditingId(t.id)
          }}
          className="btn-gold flex items-center gap-2 px-4 py-2.5"
        >
          <Plus size={14} strokeWidth={2.4} /> New template
        </button>
      </div>

      <div className="space-y-3">
        {store.templates.map((t) => {
          const using = offices.filter((o) => assignedTemplateId(o.id) === t.id)
          return (
            <div key={t.id} className="panel panel-hover p-5">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-[11px] border border-[rgba(212,175,55,.16)] text-gold">
                  <FileText size={18} strokeWidth={1.7} />
                </div>
                <div className="min-w-[200px] flex-1">
                  <div className="text-[14.5px] font-semibold text-ivory">{t.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">
                    Version {t.version} · {t.sections.length} sections · {t.fields.length} office fields ·
                    updated {t.updatedAt}
                  </div>
                </div>
                <Chip tone={using.length ? 'good' : 'gold'}>
                  <Building2 size={11} />
                  {using.length ? `${using.length} ${using.length === 1 ? 'office' : 'offices'}` : 'Unassigned'}
                </Chip>
                <button
                  onClick={() => setEditingId(t.id)}
                  className="rounded-[9px] border border-[rgba(212,175,55,.2)] px-3.5 py-2 text-[12px] font-semibold text-champagne transition-colors hover:bg-[rgba(212,175,55,.08)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => setConfirmId(t.id)}
                  aria-label={`Delete ${t.name}`}
                  title="Delete this template"
                  className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-[rgba(212,175,55,.16)] text-muted transition-colors hover:border-[rgba(208,138,122,.5)] hover:text-bad"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/*
                Deleting is destructive in a way the card alone doesn't show:
                every office using this template is left with nothing to send.
                The confirm states the blast radius rather than asking "are you
                sure" about an unstated consequence.
              */}
              {confirmId === t.id && (
                <div className="mt-4 rounded-[11px] border border-[rgba(208,138,122,.35)] bg-[rgba(208,138,122,.06)] p-4">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-bad">
                    <TriangleAlert size={15} strokeWidth={2} />
                    Delete “{t.name}”?
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                    {using.length > 0 ? (
                      <>
                        <b className="text-bad">
                          {using.length} {using.length === 1 ? 'office' : 'offices'}
                        </b>{' '}
                        currently send this agreement. They will be left with no contract assigned, and
                        nothing will go out to their prospects until you assign another.
                      </>
                    ) : (
                      <>No office is using this template, so nothing will stop sending.</>
                    )}{' '}
                    Contracts already sent keep their own copy and are unaffected — including anything
                    already signed.
                  </p>
                  <div className="mt-3.5 flex gap-2.5">
                    <button
                      onClick={() => {
                        // Snapshot first so Undo can put it back exactly.
                        const restore = JSON.parse(JSON.stringify(t)) as ContractTemplate
                        const assigned = using.map((o) => o.id)
                        deleteTemplate(t.id)
                        setConfirmId(null)
                        notify(`“${t.name}” deleted`, 'bad', () => {
                          saveTemplate(restore)
                          assigned.forEach((id) => assignTemplate(id, restore.id))
                        })
                      }}
                      className="rounded-[9px] border border-[rgba(208,138,122,.5)] bg-[rgba(208,138,122,.12)] px-3.5 py-2 text-[12px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.2)]"
                    >
                      Delete template
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-3.5 py-2 text-[12px] text-muted transition-colors hover:text-ivory"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Which offices use it */}
              <div className="mt-4 border-t border-[rgba(212,175,55,.08)] pt-4">
                <div className="mb-2.5 text-[10.5px] uppercase tracking-[0.1em] text-muted">
                  Use this template for
                </div>
                <div className="flex flex-wrap gap-2">
                  {offices.map((o) => {
                    const assigned = assignedTemplateId(o.id)
                    const on = assigned === t.id
                    const elsewhere = assigned !== null && !on
                    return (
                      <button
                        key={o.id}
                        onClick={() => assignTemplate(o.id, on ? null : t.id)}
                        title={elsewhere ? 'Currently uses another template' : undefined}
                        className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                          on
                            ? 'border-[rgba(212,175,55,.5)] bg-[rgba(212,175,55,.1)] text-champagne'
                            : 'border-[rgba(212,175,55,.12)] text-muted hover:border-[rgba(212,175,55,.3)] hover:text-ivory'
                        }`}
                      >
                        {o.name}
                        {elsewhere && <span className="ml-1.5 text-muted/60">· other</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

/* ── Editor ──────────────────────────────────────────────── */

function Editor({ template, onClose }: { template: ContractTemplate; onClose: () => void }) {
  const [t, setT] = useState<ContractTemplate>(template)
  const [confirming, setConfirming] = useState(false)
  const inUse = offices.filter((o) => assignedTemplateId(o.id) === template.id).length
  const set = <K extends keyof ContractTemplate>(k: K, v: ContractTemplate[K]) =>
    setT((s) => ({ ...s, [k]: v }))

  const save = () => {
    saveTemplate({ ...t, updatedAt: new Date().toISOString().slice(0, 10) })
    onClose()
  }

  const preview = Object.fromEntries(t.fields.map((f) => [f.key, f.placeholder]))

  return (
    <>
      <PageHead eyebrow="Editing template" title={t.name}>
        Section wording applies to every office using this template. Office fields are the blanks
        each owner fills in for themselves.
      </PageHead>

      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={save} className="btn-gold flex items-center gap-2 px-4 py-2.5">
          <Save size={14} /> Save template
        </button>
        <button
          onClick={onClose}
          className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-4 py-2.5 text-[12px] text-muted transition-colors hover:text-ivory"
        >
          Cancel
        </button>
        <button
          onClick={() => setConfirming(true)}
          className="ml-auto flex items-center gap-1.5 rounded-[9px] border border-[rgba(208,138,122,.28)] px-3.5 py-2.5 text-[12px] text-bad transition-colors hover:bg-[rgba(208,138,122,.08)]"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {/* Same in-app confirmation as the list, rather than a browser dialog. */}
      {confirming && (
        <div className="mb-5 rounded-[11px] border border-[rgba(208,138,122,.35)] bg-[rgba(208,138,122,.06)] p-4">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-bad">
            <TriangleAlert size={15} strokeWidth={2} />
            Delete “{t.name}”?
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
            {inUse > 0 ? (
              <>
                <b className="text-bad">
                  {inUse} {inUse === 1 ? 'office' : 'offices'}
                </b>{' '}
                will be left with no contract assigned and nothing will send to their prospects.
              </>
            ) : (
              <>No office is using this template.</>
            )}{' '}
            Contracts already sent are unaffected.
          </p>
          <div className="mt-3.5 flex gap-2.5">
            <button
              onClick={() => {
                const restore = JSON.parse(JSON.stringify(t)) as ContractTemplate
                const assigned = offices.filter((o) => assignedTemplateId(o.id) === t.id).map((o) => o.id)
                deleteTemplate(t.id)
                notify(`“${t.name}” deleted`, 'bad', () => {
                  saveTemplate(restore)
                  assigned.forEach((id) => assignTemplate(id, restore.id))
                })
                onClose()
              }}
              className="rounded-[9px] border border-[rgba(208,138,122,.5)] bg-[rgba(208,138,122,.12)] px-3.5 py-2 text-[12px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.2)]"
            >
              Delete template
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-3.5 py-2 text-[12px] text-muted transition-colors hover:text-ivory"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="panel p-5">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <Field label="Template name" value={t.name} onChange={(v) => set('name', v)} />
              <Field label="Version" value={t.version} onChange={(v) => set('version', v)} />
            </div>
          </div>

          {/* Sections */}
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Sections</span>
              <button
                onClick={() =>
                  set('sections', [
                    ...t.sections,
                    { id: `s${Date.now().toString(36)}`, heading: `${t.sections.length + 1}. New section`, body: '' },
                  ])
                }
                className="flex items-center gap-1 text-[11.5px] text-gold hover:text-champagne"
              >
                <Plus size={12} /> Add
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              {t.sections.map((s, i) => (
                <div key={s.id} className="rounded-[10px] border border-[rgba(212,175,55,.1)] p-3">
                  <div className="flex items-center gap-2">
                    <GripVertical size={13} className="flex-none text-muted/50" />
                    <input
                      value={s.heading}
                      onChange={(e) =>
                        set('sections', t.sections.map((x) => (x.id === s.id ? { ...x, heading: e.target.value } : x)))
                      }
                      className="flex-1 bg-transparent text-[12.5px] font-semibold text-ivory outline-none"
                    />
                    <button
                      onClick={() => set('sections', t.sections.filter((x) => x.id !== s.id))}
                      className="text-muted transition-colors hover:text-bad"
                      aria-label={`Remove section ${i + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={s.body}
                    onChange={(e) =>
                      set('sections', t.sections.map((x) => (x.id === s.id ? { ...x, body: e.target.value } : x)))
                    }
                    className="mt-2 w-full resize-y rounded-[8px] border border-[rgba(212,175,55,.1)] bg-graphite px-3 py-2 text-[12px] leading-relaxed text-ivory/85 outline-none focus:border-[rgba(212,175,55,.4)]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Office fields */}
          <div className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Office fields</span>
              <button
                onClick={() =>
                  set('fields', [
                    ...t.fields,
                    { key: `field_${t.fields.length + 1}`, label: 'New field', placeholder: '' },
                  ])
                }
                className="flex items-center gap-1 text-[11.5px] text-gold hover:text-champagne"
              >
                <Plus size={12} /> Add
              </button>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
              Each field becomes a blank the owner fills in. Reference it in a section as{' '}
              <span className="font-mono text-champagne">{'{{key}}'}</span>.
            </p>

            <div className="mt-3.5 space-y-2">
              {t.fields.map((f, i) => (
                <div key={i} className="grid gap-2 rounded-[10px] border border-[rgba(212,175,55,.1)] p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <Field
                    label="Key"
                    value={f.key}
                    mono
                    onChange={(v) =>
                      set('fields', t.fields.map((x, j) => (j === i ? { ...x, key: v.replace(/\W/g, '_') } : x)))
                    }
                  />
                  <Field
                    label="Label"
                    value={f.label}
                    onChange={(v) => set('fields', t.fields.map((x, j) => (j === i ? { ...x, label: v } : x)))}
                  />
                  <button
                    onClick={() => set('fields', t.fields.filter((_, j) => j !== i))}
                    className="self-end pb-2 text-muted transition-colors hover:text-bad"
                    aria-label={`Remove field ${f.label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                  <div className="sm:col-span-3">
                    <Field
                      label="Placeholder / example"
                      value={f.placeholder}
                      onChange={(v) =>
                        set('fields', t.fields.map((x, j) => (j === i ? { ...x, placeholder: v } : x)))
                      }
                    />
                  </div>
                </div>
              ))}
              {t.fields.length === 0 && (
                <p className="py-3 text-center text-[12px] text-muted">
                  No office fields — every office sends identical wording.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Live preview with placeholders standing in for real answers */}
        <div className="lg:sticky lg:top-[124px]">
          <div className="mb-3 text-[11.5px] text-muted">Preview — using example values</div>
          <ContractPaper
            template={t}
            details={{ ...blankDetails(), entityName: 'KING J LLC', values: preview }}
            branding={{ businessName: 'KING J' }}
            preparerName="Jane Preparer"
          />
        </div>
      </div>
    </>
  )
}

function Field({
  label,
  value,
  onChange,
  mono,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.1em] text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[9px] border border-[rgba(212,175,55,.14)] bg-graphite px-3 py-2 text-[12.5px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.28)] focus:border-[rgba(212,175,55,.5)] ${
          mono ? 'font-mono text-[11.5px]' : ''
        }`}
      />
    </label>
  )
}
