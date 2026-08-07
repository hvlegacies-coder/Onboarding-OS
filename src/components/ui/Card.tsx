interface Props {
  title?: string
  eyebrow?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}

export default function Card({ title, eyebrow, children, className = '', bodyClassName = '' }: Props) {
  return (
    <div className={`bevel p-4 sm:p-[22px] ${className}`}>
      {(title || eyebrow) && (
        <div className="mb-5 flex items-center justify-between">
          {title && <h3 className="font-cormorant text-[22px] font-semibold">{title}</h3>}
          {eyebrow && <span className="eyebrow" style={{ fontSize: '9.5px' }}>{eyebrow}</span>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
