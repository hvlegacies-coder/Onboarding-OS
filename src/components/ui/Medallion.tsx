interface Props {
  size?: number
  className?: string
}

/** Embossed metallic gold "HV" medallion — the brand mark. */
export default function Medallion({ size = 96, className = '' }: Props) {
  return (
    <div
      className={`grid place-items-center rounded-full font-cinzel font-bold ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.31,
        color: '#2a2008',
        background:
          'radial-gradient(circle at 34% 28%, #FBEEC0 0%, #D4AF37 34%, #8C6A1E 72%, #5f4712 100%)',
        boxShadow:
          '0 2px 3px rgba(255,244,200,.4) inset, 0 -6px 12px rgba(60,42,8,.7) inset, 0 10px 26px rgba(0,0,0,.6), 0 0 0 6px rgba(212,175,55,.08)',
        textShadow: '0 1px 0 rgba(255,255,255,.35)',
      }}
    >
      HV
    </div>
  )
}
