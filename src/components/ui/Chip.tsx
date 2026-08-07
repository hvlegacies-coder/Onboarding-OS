import type { Tone } from '../../types'

const tones: Record<Tone, string> = {
  good: 'bg-[rgba(123,196,154,.10)] border-[rgba(123,196,154,.28)] text-good',
  gold: 'bg-[rgba(212,175,55,.08)] border-[rgba(212,175,55,.16)] text-champagne',
  warn: 'bg-[rgba(224,177,90,.10)] border-[rgba(224,177,90,.28)] text-warn',
  bad: 'bg-[rgba(208,138,122,.10)] border-[rgba(208,138,122,.28)] text-bad',
}

interface Props {
  children: React.ReactNode
  tone?: Tone
  className?: string
}

export default function Chip({ children, tone = 'gold', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
