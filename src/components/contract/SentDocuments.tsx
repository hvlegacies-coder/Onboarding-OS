import { useState } from 'react'
import { Check, Copy, ExternalLink, Send, TriangleAlert, UserPlus } from 'lucide-react'
import Chip from '../ui/Chip'
import { officeById } from '../../data/mock'
import {
  contractDetails,
  createSend,
  missingOfficeDetails,
  officeBranding,
  sendsForOffice,
  signUrl,
  useContracts,
} from '../../lib/contractStore'
import { ghlContractConfigured, sendContract } from '../../lib/ghl'
import type { ContractSend, SendStatus } from '../../types'

const STATUS: Record<SendStatus, { label: string; tone: 'good' | 'gold' | 'warn' | 'bad' }> = {
  sent: { label: 'Sent', tone: 'gold' },
  viewed: { label: 'Opened', tone: 'warn' },
  signed: { label: 'Signed', tone: 'good' },
  declined: { label: 'Declined', tone: 'bad' },
}

export default function SentDocuments({ officeId }: { officeId: string }) {
  const store = useContracts()
  const office = officeById(officeId)!
  const sends = sendsForOffice(officeId)
  const [open, setOpen] = useState(false)

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[380px_1fr]">
      <div className="panel p-5">
        <h3 className="text-[14px] font-semibold text-ivory">Send a contract</h3>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
          Sends a personal signing link by email and text through GoHighLevel.
        </p>

        {open ? (
          <SendForm officeId={officeId} templates={store.templates} onClose={() => setOpen(false)} />
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
  officeId,
  templates,
  onClose,
}: {
  officeId: string
  templates: ReturnType<typeof useContracts>['templates']
  onClose: () => void
}) {
  const office = officeById(officeId)!
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const [f, setF] = useState({ name: '', email: '', phone: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [detail, setDetail] = useState('')

  const template = templates.find((t) => t.id === templateId)
  const details = template ? contractDetails(officeId, template.id) : null
  const branding = officeBranding(officeId)

  // Having the agreement assigned isn't the same as being able to send it —
  // the office's own blanks have to be filled in first.
  const missing = template ? missingOfficeDetails(officeId, template.id) : []
  const ready =
    f.name.trim() !== '' &&
    (f.email.trim() !== '' || f.phone.trim() !== '') &&
    Boolean(template) &&
    missing.length === 0
  const unsigned = details && !details.signature

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || !template || !details) return
    setState('sending')

    // Everything below runs while the button reads "Sending…". If any of it
    // throws and we don't catch it, the button is stranded there with no error
    // and no way back — so the whole body is guarded.
    let send: ReturnType<typeof createSend>
    try {
      // Create the document first — the link has to exist before we announce it.
      send = createSend({
        officeId,
        officeName: branding.businessName || office.name,
        ownerName: office.owner,
        template,
        details,
        logo: branding.logo,
        prospect: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
      })
    } catch (err) {
      setState('error')
      setDetail(
        `The document couldn't be created (${err instanceof Error ? err.message : String(err)}). Nothing was sent.`,
      )
      return
    }

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
        sentBy: office.owner,
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
        <p className="flex gap-2 text-[11.5px] leading-relaxed text-bad">
          <TriangleAlert size={14} className="mt-px flex-none" />
          Fill in your contract details before sending — still missing: {missing.join(', ')}.
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
