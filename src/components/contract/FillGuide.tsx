import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Pen } from 'lucide-react'

interface Props {
  /** The contract container whose [data-fillable] blanks we guide through. */
  containerRef: React.RefObject<HTMLElement | null>
  /** Re-scan trigger. */
  scanKey?: unknown
}

const ACTIVE = 'fill-field-active'

/** Walks the signer through every blank they still have to complete. */
export default function FillGuide({ containerRef, scanKey }: Props) {
  const [fields, setFields] = useState<HTMLElement[]>([])
  const [index, setIndex] = useState(-1) // -1 = not started
  const [, force] = useState(0)

  const scan = useCallback(() => {
    const root = containerRef.current
    if (!root) return [] as HTMLElement[]
    return Array.from(root.querySelectorAll<HTMLElement>("[data-fillable='true']")).filter(
      (el) => el.offsetParent !== null && (el as HTMLInputElement).value.trim() === '',
    )
  }, [containerRef])

  useEffect(() => {
    setFields(scan())
  }, [scan, scanKey])

  const clearHighlight = useCallback(() => {
    fields.forEach((el) => el.classList.remove(ACTIVE))
  }, [fields])

  const goTo = useCallback(
    (i: number) => {
      const list = scan()
      setFields(list)
      if (i < 0 || i >= list.length) return
      list.forEach((el) => el.classList.remove(ACTIVE))
      const el = list[i]
      el.classList.add(ACTIVE)
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setIndex(i)
      // Focus after the scroll settles, or the browser fights the animation.
      window.setTimeout(() => {
        el.focus?.()
        force((n) => n + 1)
      }, 350)
    },
    [scan],
  )

  // Keep the pointer glued to its field while the page moves.
  useEffect(() => {
    if (index < 0) return
    const handler = () => force((n) => n + 1)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [index])

  useEffect(() => () => clearHighlight(), [clearHighlight])

  if (fields.length === 0) return null

  const total = fields.length
  const current = index >= 0 ? fields[index] : null
  const rect = current?.getBoundingClientRect()

  const finish = () => {
    clearHighlight()
    setIndex(-1)
  }

  return (
    <>
      {rect && (
        <span
          className="fill-pointer"
          style={{ top: rect.top + rect.height / 2, left: Math.max(8, rect.left - 8) }}
        >
          <Pen size={11} strokeWidth={2.5} /> Fill in
        </span>
      )}

      <div className="fill-guide-bar">
        {index < 0 ? (
          <button onClick={() => goTo(0)} className="btn-gold flex items-center gap-1.5 px-4 py-2">
            <Pen size={13} strokeWidth={2.4} /> Start ({total})
          </button>
        ) : (
          <>
            <button
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
              aria-label="Previous field"
              className="grid h-8 w-8 place-items-center rounded-full border border-[rgba(212,175,55,.2)] text-muted transition-colors hover:text-gold disabled:opacity-35"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[12px] font-medium tabular-nums text-ivory">
              {index + 1} / {total}
            </span>
            {index < total - 1 ? (
              <button
                onClick={() => goTo(index + 1)}
                className="btn-gold flex items-center gap-1.5 px-3.5 py-2"
              >
                Next <ChevronRight size={13} strokeWidth={2.4} />
              </button>
            ) : (
              <button onClick={finish} className="btn-gold flex items-center gap-1.5 px-3.5 py-2">
                <Check size={13} strokeWidth={2.6} /> Done
              </button>
            )}
          </>
        )}
      </div>
    </>
  )
}
