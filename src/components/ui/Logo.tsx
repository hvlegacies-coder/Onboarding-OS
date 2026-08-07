interface Props {
  size?: number
  className?: string
  /** Adds the glow + lift interaction. Off for static chrome like the sidebar. */
  interactive?: boolean
}

/**
 * HIGHERVIEW LEGACIES mark — ascending arrow inside a circuit diamond.
 * Drawn twice: a bronze extrusion underneath, the polished gradient on top.
 */
export default function Logo({ size = 96, className = '', interactive = true }: Props) {
  const uid = 'hv'

  const marks = (
    <>
      {/* arrowhead */}
      <path d="M52 92 L120 26 L188 92" />
      {/* lower V — closes the diamond */}
      <path d="M44 132 L120 208 L196 132" />
      {/* circuit traces — left (the node rides the upper one) */}
      <path d="M37 100 H56 L104 148" strokeWidth={10} />
      <path d="M32 122 H56 L100 166" strokeWidth={10} />
      {/* circuit traces — right, unringed */}
      <path d="M203 100 H184 L136 148" strokeWidth={10} />
      <path d="M208 122 H184 L140 166" strokeWidth={10} />
    </>
  )

  const stem = <path d="M110 34 H130 V124 L120 140 L110 124 Z" strokeWidth={0} />

  return (
    <div
      className={`hv-logo ${interactive ? 'hv-logo--live' : ''} relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span aria-hidden className="hv-logo__aura" />
      <svg viewBox="0 0 240 240" width={size} height={size} className="relative block" role="img" aria-label="HigherView Legacies">
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
          <mask id={`${uid}-mask`}>
            <g fill="none" stroke="#fff" strokeWidth={16} strokeLinecap="butt" strokeLinejoin="miter">
              {marks}
            </g>
            <g fill="#fff">{stem}</g>
          </mask>
        </defs>

        {/* extrusion — the depth under the polished face */}
        <g transform="translate(0,4)" opacity=".85">
          <g fill="none" stroke="#4a3810" strokeWidth={16} strokeLinecap="butt" strokeLinejoin="miter">
            {marks}
          </g>
          <g fill="#4a3810">{stem}</g>
        </g>

        {/* polished face */}
        <g fill="none" stroke={`url(#${uid}-metal)`} strokeWidth={16} strokeLinecap="butt" strokeLinejoin="miter">
          {marks}
        </g>
        <g fill={`url(#${uid}-metal)`}>{stem}</g>

        {/* top-edge highlight for the bevelled read */}
        <g
          fill="none"
          stroke="#FDF3D2"
          strokeWidth={2}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          opacity=".5"
          transform="translate(0,-6)"
          mask={`url(#${uid}-mask)`}
        >
          {marks}
        </g>

        {/* single circuit node, left side only — pulses on hover */}
        <circle className="hv-logo__node" cx="26" cy="100" r="8" fill="none" stroke={`url(#${uid}-metal)`} strokeWidth={6} />

        {/* scan sweep, revealed only over the mark itself */}
        <g mask={`url(#${uid}-mask)`}>
          <rect className="hv-logo__sweep" x="-140" y="0" width="120" height="240" fill={`url(#${uid}-sheen)`} />
        </g>
      </svg>
    </div>
  )
}
