import { Check, RotateCcw, TriangleAlert, X } from 'lucide-react'
import { dismiss, useToasts } from '../../lib/toast'
import type { Tone } from '../../types'

const TONE: Record<Tone, { border: string; text: string }> = {
  good: { border: 'rgba(123,196,154,.4)', text: 'text-good' },
  gold: { border: 'rgba(212,175,55,.4)', text: 'text-champagne' },
  warn: { border: 'rgba(224,177,90,.4)', text: 'text-warn' },
  bad: { border: 'rgba(208,138,122,.45)', text: 'text-bad' },
}

/** Outcome notifications. Mounted once, in the app shell. */
export default function Toasts() {
  const toasts = useToasts()
  if (toasts.length === 0) return null

  return (
    <div
      // Announced to screen readers, but never traps focus or blocks the page.
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[340px] flex-col gap-2.5"
    >
      {toasts.map((t) => {
        const tone = TONE[t.tone]
        return (
          <div
            key={t.id}
            className="toast-in pointer-events-auto flex items-start gap-2.5 rounded-[12px] border bg-[rgba(19,19,22,.97)] px-3.5 py-3 shadow-[0_14px_40px_rgba(0,0,0,.65)] backdrop-blur-sm"
            style={{ borderColor: tone.border }}
          >
            <span className={`mt-px flex-none ${tone.text}`}>
              {t.tone === 'bad' || t.tone === 'warn' ? (
                <TriangleAlert size={15} strokeWidth={2} />
              ) : (
                <Check size={15} strokeWidth={2.4} />
              )}
            </span>
            <span className="flex-1 text-[12.5px] leading-snug text-ivory">{t.text}</span>
            {t.onUndo && (
              <button
                onClick={() => {
                  t.onUndo?.()
                  dismiss(t.id)
                }}
                className="flex flex-none items-center gap-1 text-[11.5px] font-semibold text-gold transition-colors hover:text-champagne"
              >
                <RotateCcw size={11} /> Undo
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="flex-none text-muted transition-colors hover:text-ivory"
            >
              <X size={13} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
