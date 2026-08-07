interface Props {
  eyebrow: string
  title: string
  children?: React.ReactNode
}

export default function PageHead({ eyebrow, title, children }: Props) {
  return (
    <div className="mb-7">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="mt-1.5 font-cormorant text-[26px] font-semibold leading-[1.1] sm:text-[34px]">{title}</h1>
      {children && <p className="mt-1.5 max-w-2xl text-[13.5px] text-muted">{children}</p>}
    </div>
  )
}
