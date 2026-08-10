import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, ExternalLink, Send, TriangleAlert, UserPlus } from 'lucide-react'
import Chip from '../ui/Chip'
import type { Office } from '../../lib/supabase'
import {
  contractDetails,
  missingIn,
  officeBranding,
  signUrl,
  useContracts,
} from '../../lib/contractStore'
import { fetchDocuments, fetchOwnerContract, raiseDocument } from '../../lib/documents'
import { ghlContractConfigured, sendContract } from '../../lib/ghl'
import type { ContractDetails, ContractSend, SendStatus } from '../../types'

const STATUS: Record<SendStatus, { label: string; tone: 'good' | 'gold' | 'warn' | 'bad' }> = {
  sent: { label: 'Sent', tone: 'gold' },
  viewed: { label: 'Opened', tone: 'warn' },
  signed: { label: 'Signed', tone: 'good' },
  declined: { label: 'Declined', tone: 'bad' },
}

/**
 * The office is passed in whole rather than looked up by id. The prototype's
 * `mock.ts` index is keyed by slug — real offices carry a Supabase UUID, so
 * that lookup found nothing and this screen crashed on the office's name for
 * every tenant that has actually been migrated.
 */
export default function SentDocuments({ office }: { office: Office }) {
  const store = useContracts()
  const [sends, setSends] = useState<ContractSend[]>([])
  const [open, setOpen] = useState(false)

  // Documents come from the database, so this list is the same on every device
  // — it used to read localStorage and showed only what this browser had sent.
  const reload = useCallback(() => {
    void fetchDocuments().then((all) => setSends(all.filter((s) => s.officeId === office.id)))
  }, [office.id])
  useEffect(reload, [reload])

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
      <div className="panel p-5">
        <h3 className="text-[14px] font-semibold text-ivory">Send a contract</h3>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          Sends a personal signing link by email and text through GoHighLevel.
        </p>

        {open ? (
          <SendForm
            office={office}
            templates={store.templates}
            onClose={() => setOpen(false)}
            onSent={reload}
          />
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="btn-gold mt-4 flex w-full items-center justify-center gap-2 py-2.5"
          >
            <UserPlus size={14} strokeWidth={2.2} /> Send to a prospect
          </button>
        )}

        {!ghlContractConfigured && !open && (
          <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
            GoHighLevel isn't connected yet — links are still created and you can copy them from the
            list.
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        {sends.length === 0 ? (
          <div className="panel p-10 text-center text-[13px] text-muted">
            Nothing sent yet. Contracts you send to {office.name}'s prospects appear here with their
            status.
          </div>
        ) : (
          sends.map((s) => <SentRow key={s.token} send={s} />)
        )}
      </div>
    </div>
  )
}

function SendForm({
  office,
  templates,
  onClose,
  onSent,
}: {
  office: Office
  templates: ReturnType<typeof useContracts>['templates']
  onClose: () => void
  onSent: () => void
}) {
  const officeId = office.id
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [f, setF] = useState({ name: '', email: '', phone: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [detail, setDetail] = useState('')
  const [saved, setSaved] = useState<ContractDetails | null>(null)

  // The office's answers live in `owner_contracts`. The localStorage copy is
  // only a fallback for a browser that filled them in before they were stored
  // centrally — otherwise an owner's setup was invisible to everyone else.
  useEffect(() => {
    void fetchOwnerContract(officeId).then((c) => c && setSaved(c.details))
  }, [officeId])

  const template = templates.find((t) => t.id === templateId)
  const details = saved ?? (template ? contractDetails(officeId, template.id) : null)
  const branding = officeBranding(officeId)
  const businessName = branding.businessName || office.name

  // Having the agreement assigned isn't the same as being able to send it —
  // the office's own blanks have to be filled in first.
  const missing = details ? missingIn(details, businessName) : []
  // Missing office details no longer block a send. Getting the agreement in
  // front of the prospect is what matters; the office completes the rest after
  // signature. The warning below still says what is unfilled.
  const ready =
    f.name.trim() !== '' && (f.email.trim() !== '' || f.phone.trim() !== '') && Boolean(template)
  const unsigned = details && !details.signature

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || !template || !details) return
    setState('sending')

    // Everything below runs while the button reads "Sending…". If any of it
    // throws and we don't catch it, the button is stranded there with no error
    // and no way back — so the whole body is guarded.
    // Create the document first — the link has to exist before we announce it.
    // It is written to the database, so the token resolves on the recipient's
    // device rather than only on this one.
    const raised = await raiseDocument({
      officeId,
      officeName: businessName,
      ownerName: office.ownerName,
      logo: branding.logo || office.logoUrl || undefined,
      template,
      details,
      prospect: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
    })
    if (!raised.ok) {
      setState('error')
      setDetail(`The document couldn't be created (${raised.error}). Nothing was sent.`)
      return
    }
    const send = raised.send
    onSent()

    let res: Awaited<ReturnType<typeof sendContract>>
    try {
      res = await sendContract({
        officeName: branding.businessName || office.name,
        officeId,
        name: send.prospect.name,
        email: send.prospect.email,
        phone: send.prospect.phone,
        signLink: signUrl(send.token),
        contractName: template.name,
        contractVersion: template.version,
        sentBy: office.ownerName,
      })
    } catch (err) {
      setState('error')
      setDetail(
        `The document was created but the hand-off to GoHighLevel failed (${err instanceof Error ? err.message : String(err)}). Copy its link from the list and send it yourself.`,
      )
      return
    }

    if (res.ok) {
      onClose()
    } else {
      // The document exists either way — the owner can copy the link manually.
      setState('error')
      setDetail(
        res.reason === 'not-configured'
          ? "GoHighLevel isn't connected, so no message was sent. The link is in the list — copy it and send it yourself."
          : res.reason === 'timeout'
            ? "GoHighLevel didn't respond in time, so the message may not have gone out. The document was created — copy its link from the list and send it yourself."
            : res.reason === 'network'
              ? "Couldn't reach GoHighLevel. The link is in the list — copy it and send it yourself."
              : `GoHighLevel rejected the request (${res.detail}). The link is in the list.`,
      )
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2.5">
      <label className="block">
        <span className="mb-1.5 block text-[12px] text-ivory">Contract</span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full cursor-pointer rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none focus:border-[rgba(212,175,55,.5)]"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </label>

      <Field label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} autoComplete="name" />
      <Field label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} type="email" autoComplete="email" />
      <Field label="Phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} type="tel" autoComplete="tel" />

      {missing.length > 0 && (
        <p className="flex gap-2 text-[11.5px] leading-relaxed text-warn">
          <TriangleAlert size={14} className="mt-px flex-none" />
          These are still blank and will send blank: {missing.join(', ')}. You can complete them
          on the agreement after it is signed.
        </p>
      )}

      {unsigned && missing.length === 0 && (
        <p className="flex gap-2 text-[11.5px] leading-relaxed text-warn">
          <TriangleAlert size={14} className="mt-px flex-none" />
          You haven't signed this contract yet — it will go out without your signature.
        </p>
      )}

      {state === 'error' && (
        <p role="alert" className="flex gap-2 text-[11.5px] leading-relaxed text-warn">
          <TriangleAlert size={14} className="mt-px flex-none" />
          {detail}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!ready || state === 'sending'}
          className="btn-gold flex flex-1 items-center justify-center gap-2 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={13} strokeWidth={2.2} />
          {state === 'sending' ? 'Sending…' : 'Send contract'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-3.5 py-2.5 text-[12px] text-muted transition-colors hover:text-ivory"
        >
          {state === 'error' ? 'Done' : 'Cancel'}
        </button>
      </div>
    </form>
  )
}

function SentRow({ send }: { send: ContractSend }) {
  const [copied, setCopied] = useState(false)
  const url = signUrl(send.token)
  const s = STATUS[send.status]
  const done = send.status === 'signed' || send.status === 'declined'

  return (
    <div className="panel panel-hover p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[160px] flex-1">
          <div className="text-[13.5px] font-semibold text-ivory">{send.prospect.name}</div>
          <div className="mt-0.5 text-[11.5px] text-muted">
            {[send.prospect.email, send.prospect.phone].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div className="text-right text-[11px] leading-tight text-muted">
          <div>{send.template.name}</div>
          <div className="mt-0.5">
            {send.status === 'signed'
              ? `Signed ${send.signedAt}`
              : send.status === 'viewed'
                ? `Opened ${send.viewedAt}`
                : send.status === 'declined'
                  ? send.declineReason || 'Declined'
                  : `Sent ${send.sentAt}`}
          </div>
        </div>
        <Chip tone={s.tone}>{s.label}</Chip>
      </div>

      <div className="mt-3 flex items-center gap-4 border-t border-[rgba(212,175,55,.08)] pt-3">
        {!done && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(url)
              setCopied(true)
              setTimeout(() => setCopied(false), 1400)
            }}
            className="flex items-center gap-1.5 text-[11.5px] text-gold transition-colors hover:text-champagne"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy signing link'}
          </button>
        )}
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-gold"
        >
          <ExternalLink size={12} /> {done ? 'View document' : 'Open'}
        </a>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] text-ivory">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none transition-colors hover:border-[rgba(212,175,55,.3)] focus:border-[rgba(212,175,55,.5)]"
      />
    </label>
  )
}
