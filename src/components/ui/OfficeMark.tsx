interface Props {
  /** Office name — drives the monogram and the accessible label. */
  name: string
  /** Two-letter monogram. Falls back to the first letters of the name. */
  initials?: string
  /** The office's uploaded logo, when they have one. */
  logo?: string
  size?: number
  /** Adds the glow + lift interaction. Off for static chrome. */
  interactive?: boolean
  className?: string
}

const initialsOf = (name: string) =>
  name
    .replace(/[^A-Za-z0-9& ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && w !== '&' && !['llc', 'the', 'and'].includes(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?'

/**
 * An office's mark in the app chrome — the white-label counterpart to the
 * Higher View logo.
 *
 * An office that has uploaded a logo gets it framed in the same gold crest;
 * everyone else gets a monogram cut from their business name, so a brand-new
 * tenant still looks finished on day one rather than showing a placeholder.
 *
 * The crest is deliberately identical across offices apart from the monogram —
 * the gold is the platform's signature, and tinting it per tenant would break
 * the one visual constant every office shares.
 */
export default function OfficeMark({
  name,
  initials,
  logo,
  size = 40,
  interactive = true,
  className = '',
}: Props) {
  const mono = (initials || initialsOf(name)).slice(0, 2)
  // Scoped so several crests can share a page without clashing gradient ids.
  const uid = `om-${mono}-${size}`

  // The crest outline: a bevelled shield, flat-topped and pointed at the base.
  const shield = 'M120 20 L206 62 V138 Q206 186 120 220 Q34 186 34 138 V62 Z'

  return (
    <div
      className={`office-mark ${interactive ? 'office-mark--live' : ''} relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span aria-hidden className="office-mark__aura" />
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        className="relative block"
        role="img"
        aria-label={name}
      >
        <defs>
          <linearGradient id={`${uid}-metal`} x1="18%" y1="0%" x2="82%" y2="100%">
            <stop offset="0%" stopColor="#8C6A1E" />
            <stop offset="24%" stopColor="#F5D98B" />
            <stop offset="46%" stopColor="#D4AF37" />
            <stop offset="72%" stopColor="#8C6A1E" />
            <stop offset="100%" stopColor="#F5D98B" />
          </linearGradient>
          <linearGradient id={`${uid}-sheen`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="50%" stopColor="#fff8e2" stopOpacity=".85" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-field`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#232329" />
            <stop offset="100%" stopColor="#131316" />
          </linearGradient>
          <clipPath id={`${uid}-clip`}>
            <path d={shield} />
          </clipPath>
          <mask id={`${uid}-mask`}>
            <path d={shield} fill="#fff" />
          </mask>
        </defs>

        {/* extrusion — depth beneath the polished face */}
        <path d={shield} transform="translate(0,5)" fill="none" stroke="#4a3810" strokeWidth={14} />

        {/* inner field */}
        <path d={shield} fill={`url(#${uid}-field)`} />

        {logo ? (
          // A real logo sits inside the crest, letterboxed to fit.
          <image
            href={logo}
            x="52"
            y="52"
            width="136"
            height="118"
            preserveAspectRatio="xMidYMid meet"
            clipPath={`url(#${uid}-clip)`}
          />
        ) : (
          <>
            <text
              x="120"
              y="132"
              textAnchor="middle"
              fontFamily="Cinzel, serif"
              fontSize={mono.length > 1 ? 74 : 92}
              fontWeight="700"
              letterSpacing="2"
              fill={`url(#${uid}-metal)`}
            >
              {mono}
            </text>
            {/* engraved rule under the monogram */}
            <path
              d="M76 156 H164"
              stroke={`url(#${uid}-metal)`}
              strokeWidth={6}
              opacity=".55"
              strokeLinecap="round"
            />
          </>
        )}

        {/* polished border, drawn last so it frames logo and monogram alike */}
        <path d={shield} fill="none" stroke={`url(#${uid}-metal)`} strokeWidth={14} />
        {/* top-edge highlight for the bevelled read */}
        <path
          d={shield}
          fill="none"
          stroke="#FDF3D2"
          strokeWidth={2.5}
          opacity=".45"
          transform="translate(0,-5)"
          mask={`url(#${uid}-mask)`}
        />

        {/* scan sweep, revealed only over the crest itself */}
        <g mask={`url(#${uid}-mask)`}>
          <rect
            className="office-mark__sweep"
            x="-140"
            y="0"
            width="120"
            height="240"
            fill={`url(#${uid}-sheen)`}
          />
        </g>
      </svg>
    </div>
  )
}
