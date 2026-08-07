import { useState } from 'react'

export default function Toggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className="relative h-[26px] w-[46px] flex-none rounded-full transition-colors"
      style={{
        background: on
          ? 'linear-gradient(140deg,#8C6A1E,#F5D98B 40%,#D4AF37 70%)'
          : '#232329',
        boxShadow: '0 1px 3px rgba(0,0,0,.5) inset',
      }}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-all"
        style={{ left: on ? 23 : 3, boxShadow: '0 1px 3px rgba(0,0,0,.4)' }}
      />
    </button>
  )
}
