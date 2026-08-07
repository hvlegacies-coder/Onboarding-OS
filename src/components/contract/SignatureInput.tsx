import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine, Type, Upload, X } from 'lucide-react'
import type { SignatureMode } from '../../types'

export interface SignatureDraft {
  mode: SignatureMode
  /** Data URL for draw and upload. Undefined when typed. */
  drawing?: string
  /** Font class when typed. */
  font?: string
}

/** The typefaces offered when someone types their signature. */
export const SIGNATURE_FONTS = [
  { id: 'font-vibes', label: 'Formal' },
  { id: 'font-dancing', label: 'Flowing' },
  { id: 'font-cormorant italic', label: 'Classic' },
]

const MODES: { id: SignatureMode; label: string; Icon: typeof PenLine }[] = [
  { id: 'draw', label: 'Draw', Icon: PenLine },
  { id: 'type', label: 'Write', Icon: Type },
  { id: 'upload', label: 'Upload', Icon: Upload },
]

interface Props {
  /** The name typed into the signing form — used for the "Write" preview. */
  name: string
  onChange: (draft: SignatureDraft | null) => void
}

export default function SignatureInput({ name, onChange }: Props) {
  const [mode, setMode] = useState<SignatureMode>('draw')
  const [font, setFont] = useState(SIGNATURE_FONTS[0].id)
  const [uploaded, setUploaded] = useState<string | null>(null)
  const [drawn, setDrawn] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Report whatever the current mode holds, so the parent always has the truth.
  useEffect(() => {
    if (mode === 'draw') onChange(drawn ? { mode: 'draw', drawing: drawn } : null)
    else if (mode === 'upload') onChange(uploaded ? { mode: 'upload', drawing: uploaded } : null)
    else onChange(name.trim() ? { mode: 'type', font } : null)
  }, [mode, drawn, uploaded, font, name])

  return (
    <div>
      <div className="mb-2.5 grid grid-cols-3 gap-1.5">
        {MODES.map(({ id, label, Icon }) => {
          const on = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={`flex items-center justify-center gap-1.5 rounded-[9px] border py-2 text-[11.5px] font-semibold transition-colors ${
                on
                  ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.1)] text-champagne'
                  : 'border-[rgba(212,175,55,.12)] text-muted hover:border-[rgba(212,175,55,.3)] hover:text-ivory'
              }`}
            >
              <Icon size={13} strokeWidth={1.9} />
              {label}
            </button>
          )
        })}
      </div>

      {mode === 'draw' && <DrawPad onChange={setDrawn} />}

      {mode === 'type' && (
        <div>
          <div className="grid h-[110px] place-items-center rounded-[10px] border border-[rgba(212,175,55,.18)] bg-[rgba(255,255,255,.02)] px-4">
            {name.trim() ? (
              <span className={`${font} text-[34px] leading-tight text-champagne`}>{name}</span>
            ) : (
              <span className="text-[12px] text-muted">Type your name above to preview it</span>
            )}
          </div>
          <div className="mt-2 flex gap-1.5">
            {SIGNATURE_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                className={`flex-1 rounded-[8px] border py-1.5 text-[10.5px] transition-colors ${
                  font === f.id
                    ? 'border-[rgba(212,175,55,.45)] text-champagne'
                    : 'border-[rgba(212,175,55,.12)] text-muted hover:text-ivory'
                }`}
              >
                <span className={f.id}>{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'upload' && (
        <UploadPad
          value={uploaded}
          error={error}
          onError={setError}
          onChange={(v) => {
            setUploaded(v)
            setError('')
          }}
        />
      )}
    </div>
  )
}

/* ── Draw ────────────────────────────────────────────────── */

function DrawPad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // Match the backing store to the display size so strokes aren't blurry.
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * dpr
    c.height = rect.height * dpr
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    // A signature should read as pen, not marker — keep the stroke fine.
    ctx.lineWidth = 1.3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#F5D98B'
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const start = (e: React.PointerEvent) => {
    const ctx = ref.current!.getContext('2d')!
    const { x, y } = pos(e)
    drawing.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
    ref.current!.setPointerCapture(e.pointerId)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = ref.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!dirty) setDirty(true)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(ref.current!.toDataURL('image/png'))
  }

  const clear = () => {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setDirty(false)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-[10px] border border-[rgba(212,175,55,.18)] bg-[rgba(255,255,255,.02)]">
        <canvas
          ref={ref}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-[110px] w-full cursor-crosshair touch-none"
        />
        {!dirty && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center text-[12px] text-muted">
            Draw your signature here
          </span>
        )}
        <span className="pointer-events-none absolute bottom-[26px] left-6 right-6 border-b border-[rgba(212,175,55,.16)]" />
      </div>
      {dirty && (
        <button
          type="button"
          onClick={clear}
          className="mt-2 flex items-center gap-1.5 text-[11.5px] text-muted transition-colors hover:text-gold"
        >
          <Eraser size={12} /> Clear
        </button>
      )}
    </div>
  )
}

/* ── Upload ──────────────────────────────────────────────── */

const MAX_BYTES = 2 * 1024 * 1024

function UploadPad({
  value,
  error,
  onChange,
  onError,
}: {
  value: string | null
  error: string
  onChange: (v: string | null) => void
  onError: (e: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  const take = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return onError('That file isn\'t an image. Use a PNG or JPG.')
    if (file.size > MAX_BYTES) return onError('That image is over 2MB. Try a smaller one.')
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.onerror = () => onError("Couldn't read that file.")
    reader.readAsDataURL(file)
  }

  if (value) {
    return (
      <div>
        <div className="relative grid h-[110px] place-items-center rounded-[10px] border border-[rgba(212,175,55,.18)] bg-[rgba(255,255,255,.02)] p-3">
          <img src={value} alt="Uploaded signature" className="max-h-[86px] max-w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove uploaded signature"
            className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border border-[rgba(212,175,55,.2)] bg-obsidian text-muted transition-colors hover:text-bad"
          >
            <X size={12} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          A transparent PNG works best — a photo with a white background will show its box.
        </p>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          take(e.dataTransfer.files[0])
        }}
        className="grid h-[110px] w-full place-items-center rounded-[10px] border border-dashed border-[rgba(212,175,55,.28)] bg-[rgba(255,255,255,.02)] transition-colors hover:border-[rgba(212,175,55,.5)]"
      >
        <span className="text-center">
          <Upload size={17} className="mx-auto text-gold" />
          <span className="mt-1.5 block text-[12px] text-ivory">Choose an image or drop it here</span>
          <span className="mt-0.5 block text-[10.5px] text-muted">PNG or JPG, up to 2MB</span>
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(e) => take(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-[11.5px] text-bad">{error}</p>}
    </div>
  )
}
