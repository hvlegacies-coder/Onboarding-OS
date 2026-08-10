import { useState } from 'react'
import { CalendarPlus, Link as LinkIcon, Trash2, X } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Card from '../components/ui/Card'
import Chip from '../components/ui/Chip'
import { requiredModules } from '../data/mock'
import { createSession, removeSession, useSessions, type SessionInput } from '../lib/sessionStore'
import { notify } from '../lib/toast'
import type { Session } from '../types'

const TYPES: Session['type'][] = ['Discovery Session', 'New Preparer Orientation']

export default function Sessions() {
  const { sessions, loading } = useSessions()
  const [adding, setAdding] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const bookable = sessions.filter((s) => s.type === 'Discovery Session').length

  const remove = async (s: Session) => {
    setRemoving(true)
    const res = await removeSession(s.id)
    setRemoving(false)
    setConfirmId(null)
    notify(
      res.ok ? `${s.type} on ${s.date} removed` : `Couldn't remove it — ${res.error}`,
      'bad',
    )
  }

  return (
    <>
      <PageHead eyebrow="Scheduling" title="Sessions">
        One shared calendar drives both the initial Discovery Sessions and the post-contract New Preparer
        Orientation. Any Discovery Session added here appears on every office's invite link straight away —
        {' '}{bookable} currently open for registration.
      </PageHead>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setAdding((v) => !v)}
          className="btn-gold flex items-center gap-2 px-4 py-2.5"
        >
          {adding ? <X size={14} /> : <CalendarPlus size={14} strokeWidth={2.2} />}
          {adding ? 'Cancel' : 'Add session'}
        </button>
      </div>

      {adding && <AddSession onDone={() => setAdding(false)} />}

      <div className="mb-[26px] grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((s) => (
          <div key={s.id} className="bevel group relative p-4 sm:p-[22px] transition-transform duration-200 hover:-translate-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{s.type}</div>
            </div>
            <div className="mt-3 font-cormorant text-[30px] font-semibold leading-none">{s.date}</div>
            <div className="mt-1.5 text-[13px]">{s.time}</div>

            <div className="mt-[18px] flex items-center gap-2.5 border-t border-[rgba(212,175,55,.16)] pt-4">
              <div className="gold-text font-cormorant text-[24px] font-bold">{s.registered}</div>
              <div className="text-[11px] leading-tight text-muted">{s.note}</div>
            </div>

            {s.type === 'Discovery Session' && (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                <LinkIcon size={11} className="flex-none text-gold" />
                Bookable on every office invite link
              </div>
            )}

            <button
              onClick={() => setConfirmId(s.id)}
              title="Remove from the calendar"
              aria-label={`Remove ${s.type} on ${s.date}`}
              className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:text-bad focus-visible:opacity-100 group-hover:opacity-100"
            >
              <Trash2 size={13} />
            </button>

            {/* Removing a Discovery Session pulls it from every invite link,
                so it asks first and says what that means. */}
            {confirmId === s.id && (
              <div className="mt-4 rounded-[11px] border border-[rgba(208,138,122,.35)] bg-[rgba(208,138,122,.06)] p-3.5">
                <div className="text-[12.5px] font-semibold text-bad">Remove this session?</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                  {s.type === 'Discovery Session'
                    ? 'It disappears from every office invite link and can no longer be booked.'
                    : 'It is removed from the calendar.'}
                  {s.registered > 0 && (
                    <>
                      {' '}
                      <b className="text-bad">{s.registered} already booked on it</b> — they keep
                      their place in the pipeline, but their session goes blank and they have to be
                      re-booked by hand.
                    </>
                  )}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => void remove(s)}
                    disabled={removing}
                    className="rounded-[8px] border border-[rgba(208,138,122,.5)] bg-[rgba(208,138,122,.12)] px-3 py-1.5 text-[11.5px] font-semibold text-bad transition-colors hover:bg-[rgba(208,138,122,.2)] disabled:opacity-60"
                  >
                    {removing ? 'Removing…' : 'Remove'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    disabled={removing}
                    className="px-2 py-1.5 text-[11.5px] text-muted transition-colors hover:text-ivory disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="panel col-span-full p-10 text-center text-[13px] text-muted">
            {loading
              ? 'Reading the calendar…'
              : 'No sessions on the calendar. Prospects cannot book until one is added.'}
          </div>
        )}
      </div>

      <Card title="Required modules" eyebrow="Assigned on training access">
        <p className="mb-4 text-[13px] text-muted">
          Every brand-new preparer is auto-assigned these on entering the Training Community.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {requiredModules.map((m) => (
            <Chip key={m}>{m}</Chip>
          ))}
        </div>
      </Card>
    </>
  )
}

/** New session. A Discovery Session becomes bookable the moment it is saved. */
function AddSession({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState<SessionInput>({
    type: 'Discovery Session',
    dateIso: '',
    time: '18:00',
    place: 'Zoom',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof SessionInput) => (v: string) => setF((s) => ({ ...s, [k]: v }))
  const ready = f.dateIso !== '' && f.time !== ''

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!ready || saving) return
        setSaving(true)
        setError(null)
        const res = await createSession(f)
        if (!res.ok) {
          // The form stays open with what they typed — retyping a session
          // because the save failed is worse than the failure.
          setSaving(false)
          setError(res.error)
          return
        }
        onDone()
        notify(`${res.session.type} on ${res.session.date} published`, 'good')
      }}
      className="bevel mb-[22px] p-4 sm:p-[22px]"
    >
      <h3 className="font-cormorant text-[22px] font-semibold">Add a session</h3>
      <p className="mt-1.5 text-[12.5px] text-muted">
        Discovery Sessions publish to the shared invitation form used by all offices. Orientations are
        for preparers who have already signed.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">Type</span>
          <select
            value={f.type}
            onChange={(e) => setF((s) => ({ ...s, type: e.target.value as Session['type'] }))}
            className="w-full cursor-pointer rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none focus:border-[rgba(212,175,55,.5)]"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <Field label="Date" type="date" value={f.dateIso} onChange={set('dateIso')} required />
        <Field label="Start time (ET)" type="time" value={f.time} onChange={set('time')} required />
        <Field label="Where" value={f.place} onChange={set('place')} placeholder="Zoom" />
      </div>

      <div className="mt-4">
        <Field
          label="Note (optional)"
          value={f.note}
          onChange={set('note')}
          placeholder="Shown under the registration count"
        />
      </div>

      {error && <p className="mt-4 text-[12px] leading-relaxed text-bad">{error}</p>}

      <div className="mt-5 flex gap-2.5">
        <button
          type="submit"
          disabled={!ready || saving}
          className="btn-gold px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Publishing…' : 'Publish session'}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="rounded-[9px] border border-[rgba(212,175,55,.16)] px-4 py-2.5 text-[12px] text-muted transition-colors hover:text-ivory disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.12em] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[9px] border border-[rgba(212,175,55,.16)] bg-graphite px-3 py-2.5 text-[13px] text-ivory outline-none transition-colors focus:border-[rgba(212,175,55,.5)] placeholder:text-muted"
      />
    </label>
  )
}
