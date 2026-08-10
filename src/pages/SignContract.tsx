import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react'
import ContractPaper, { humanize } from '../components/contract/ContractPaper'
import SignatureInput, { type SignatureDraft } from '../components/contract/SignatureInput'
import FillGuide from '../components/contract/FillGuide'
import {
  effectiveDetails,
  mergeFields,
  missingRequired,
  signUrl,
} from '../lib/contractStore'
import { declineDocument, fetchDocumentByToken, signDocument } from '../lib/documents'
import { sendSigned } from '../lib/ghl'
import type { ContractSend, Signature } from '../types'

/**
 * The prospect's copy of their contract. Public — the token in the URL is the
 * only credential, so the database mints it and it is never listed.
 *
 * The document is read from the database, not from this browser's storage. It
 * used to come from localStorage, which meant the link only ever resolved on
 * the machine that created it: everyone who was actually sent one saw "Link not
 * valid". Fetching it by token is what makes a signing link work anywhere.
 */
export default function SignContract() {
  const { token } = useParams()
  const [send, setSend] = useState<ContractSend | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [signerValues, setSignerValues] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<SignatureDraft | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [declining, setDeclining] = useState(false)
  /** True while the signature or decline is in flight, so it can't double-fire. */
  const [signing, setSigning] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const contractRef = useRef<HTMLDivElement>(null)

  // `get_document` stamps first_accessed_at and flips pending → viewed, so
  // simply opening the link is what records that they opened it.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void fetchDocumentByToken(token ?? '').then((doc) => {
      if (cancelled) return
      setSend(doc)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  /*
   * `?copy=signed` is the link handed to GoHighLevel when a contract is
   * executed. It opens the signed agreement and goes straight to the print
   * dialog, so "save as PDF" is one step for whoever follows it. Only fires on
   * a signed document, and only once.
   */
  const printed = useRef(false)
  const wantsCopy = new URLSearchParams(useLocation().search).get('copy') === 'signed'
  useEffect(() => {
    if (!wantsCopy || printed.current) return
    if (send?.status !== 'signed') return
    printed.current = true
    const id = setTimeout(() => window.print(), 700)
    return () => clearTimeout(id)
  }, [wantsCopy, send?.status])

  useEffect(() => {
    if (send && !name) setName(send.prospect.name)
  }, [send?.token])

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(new Date()),
    [],
  )

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <span className="text-[13px] text-muted">Opening your agreement…</span>
      </div>
    )
  }

  if (!send) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="font-cinzel text-[22px] font-semibold text-ivory">Link not valid</h1>
        <p className="max-w-[380px] text-[13px] leading-relaxed text-muted">
          This signing link is invalid or has been removed. Ask whoever sent it to you for a fresh
          one.
        </p>
      </div>
    )
  }

  const signed = send.status === 'signed'
  const details = effectiveDetails(send)
  const branding = { businessName: send.officeName, logo: send.logo }
  const merged = mergeFields(details, branding, send.prospect.name)
  const missing = missingRequired(send.template, merged, signerValues)
  const canSubmit = agreed && name.trim().length > 1 && draft !== null && missing.length === 0

  /** Marks empty required blanks in red and scrolls to the first. */
  const flagMissing = () => {
    const root = contractRef.current
    if (!root) return
    root.querySelectorAll('.field-invalid').forEach((el) => el.classList.remove('field-invalid'))
    let first: HTMLElement | null = null
    for (const id of missing) {
      const el = root.querySelector<HTMLElement>(`[data-field-id="${id}"]`)
      if (!el) continue
      el.classList.add('field-invalid')
      first ??= el
    }
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const submit = async () => {
    if (missing.length > 0) {
      flagMissing()
      setError(`Still needed: ${missing.map(humanize).join(', ')}.`)
      return
    }
    if (!canSubmit) {
      setError('Add your signature and agree to the terms to sign.')
      return
    }
    if (!token || !send || signing) return

    const signature: Signature = {
      name: name.trim(),
      mode: draft!.mode,
      drawing: draft!.drawing,
      font: draft!.font,
      signedAt: today,
    }

    // The database is what makes this real, so nothing is claimed until it
    // answers. A signature reported as saved and then lost would be the worst
    // failure this page could have.
    setSigning(true)
    const res = await signDocument(send, signature, signerValues)
    setSigning(false)
    if (!res.ok) {
      setError(`Your signature couldn't be saved — ${res.error}. Nothing was submitted.`)
      return
    }

    // Their pipeline stage moves inside `sign_document`: the signer is
    // anonymous and RLS will not let them update their own prospect record.
    setSend({ ...send, status: 'signed', signature, signerValues, signedAt: today })

    // Tell GHL it's executed, with a link to the signed copy. Not awaited: the
    // signature is already recorded, so a slow webhook must not hold up the
    // signer's confirmation. `?signed` opens the document in print view.
    void sendSigned({
      fullName: send.prospect.name,
      phone: send.prospect.phone,
      email: send.prospect.email,
      signedContractLink: `${signUrl(token)}?copy=signed`,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const decline = async () => {
    if (!token || !send || signing) return
    setSigning(true)
    const res = await declineDocument(token, reason.trim())
    setSigning(false)
    if (!res.ok) {
      setError(`That couldn't be recorded — ${res.error}.`)
      return
    }
    setSend({ ...send, status: 'declined', declineReason: reason.trim() })
  }

  if (send.status === 'declined') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="font-cinzel text-[22px] font-semibold text-ivory">Agreement declined</h1>
        <p className="max-w-[400px] text-[13px] leading-relaxed text-muted">
          You've let {send.officeName} know you're not moving forward. If that was a mistake, get in
          touch with them directly.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="no-print border-b border-[rgba(212,175,55,.16)] bg-[rgba(19,19,22,.7)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* No logo means no logo. Falling back to the Higher View mark put
                the platform's brand on another office's agreement, which is
                exactly what a white-label contract must not do (R3). */}
            {send.logo && <img src={send.logo} alt="" className="h-9 w-9 object-contain" />}
            <span className="gold-text font-cinzel text-[15px] font-semibold">
              {send.officeName}
            </span>
          </div>

          {signed ? (
            <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-good">
              <CheckCircle2 size={15} /> Signed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
              <ShieldCheck size={15} /> Secure signing
            </span>
          )}
        </div>
      </header>

      {/* ── Status bar ─────────────────────────────────── */}
      {signed ? (
        <div className="no-print mx-auto mt-6 max-w-3xl px-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[rgba(212,175,55,.3)] bg-[rgba(212,175,55,.07)] px-5 py-4">
            <CheckCircle2 size={22} className="text-gold" />
            {/* No download here on purpose: the signer is told their copy is
                coming rather than being asked to save one themselves. The
                office completes any remaining details after signature, so the
                copy that matters is the one sent afterwards, not this view. */}
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-ivory">
                This agreement has been signed.
              </p>
              <p className="text-[12px] text-muted">
                Signed by {send.signature?.name} on {send.signedAt}. A copy of the completed
                agreement will be sent to you at {send.prospect.email || 'your email address'}.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-print mx-auto mt-6 max-w-3xl px-4">
          <div className="rounded-[12px] border border-[rgba(212,175,55,.16)] bg-[rgba(255,255,255,.02)] px-5 py-4">
            <p className="text-[12.5px] leading-relaxed text-muted">
              Please review the agreement below, fill in the highlighted fields, then type your name
              to sign at the bottom.
            </p>
          </div>
        </div>
      )}

      <main className="mx-auto mt-6 max-w-3xl px-4">
        <div ref={contractRef}>
          <ContractPaper
            template={send.template}
            details={details}
            branding={branding}
            preparerName={signed ? send.signature?.name : send.prospect.name}
            counterSignature={send.signature}
            fillable={!signed}
            signerValues={signerValues}
            onSignerChange={(k, v) => {
              setSignerValues((s) => ({ ...s, [k]: v }))
              setError('')
              // Clear the red flag the moment the blank is filled.
              contractRef.current
                ?.querySelector(`[data-field-id="${k}"]`)
                ?.classList.remove('field-invalid')
            }}
          />
        </div>

        {!signed && <FillGuide containerRef={contractRef} scanKey={signerValues} />}

        {/* ── Sign ─────────────────────────────────────── */}
        {!signed && !declining && (
          <div className="no-print bevel mt-6 p-6">
            <h2 className="font-cinzel text-[17px] font-semibold text-ivory">Sign this agreement</h2>

            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] text-ivory">
                  Type your full legal name as your signature
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3.5 py-2.5 font-cormorant text-[19px] italic text-ivory outline-none transition-colors focus:border-[rgba(212,175,55,.5)] placeholder:not-italic placeholder:font-sans placeholder:text-[13px] placeholder:text-[#5f5c55]"
                />
              </label>

              <div>
                <span className="mb-1.5 block text-[12.5px] text-ivory">Your signature</span>
                <SignatureInput name={name} onChange={setDraft} />
              </div>

              <label className="flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-muted">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-none accent-[#D4AF37]"
                />
                <span>
                  I have read and agree to the terms of this {send.template.name}, and I intend my
                  signature to be my legal electronic signature. Dated {today}.
                </span>
              </label>

              {error && (
                <p role="alert" className="flex gap-2 text-[12px] leading-relaxed text-bad">
                  <TriangleAlert size={14} className="mt-px flex-none" />
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button onClick={submit} className="btn-gold px-6 py-3">
                  Sign &amp; Submit
                </button>
                <button
                  onClick={() => setDeclining(true)}
                  className="text-[12px] text-muted transition-colors hover:text-bad"
                >
                  I'd rather not sign
                </button>
              </div>
            </div>
          </div>
        )}

        {declining && (
          <div className="mt-6 rounded-[12px] border border-[rgba(208,138,122,.28)] p-5">
            <div className="text-[13.5px] font-semibold text-ivory">Decline this agreement?</div>
            <p className="mt-1 text-[12px] text-muted">
              {send.officeName} will be told. You can add a reason if you'd like.
            </p>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="mt-3 w-full rounded-[9px] border border-[rgba(212,175,55,.14)] bg-graphite px-3 py-2 text-[12.5px] text-ivory outline-none focus:border-[rgba(212,175,55,.4)] placeholder:text-[#5f5c55]"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void decline()}
                disabled={signing}
                className="rounded-[9px] border border-[rgba(208,138,122,.4)] px-4 py-2 text-[12px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.08)]"
              >
                Confirm decline
              </button>
              <button
                onClick={() => setDeclining(false)}
                className="px-3 py-2 text-[12px] text-muted hover:text-ivory"
              >
                Go back
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
