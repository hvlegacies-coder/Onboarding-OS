interface Props {
  label: string
  value: string | number
  sub?: React.ReactNode
  icon?: React.ReactNode
}

export default function KpiCard({ label, value, sub, icon }: Props) {
  return (
    <div className="bevel relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1">
      {icon && <div className="absolute right-4 top-4 text-gold opacity-50">{icon}</div>}
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="gold-text mt-2.5 font-cormorant text-[46px] font-bold leading-none">{value}</div>
      {sub && <div className="mt-2 text-[12px] text-muted">{sub}</div>}
    </div>
  )
}
