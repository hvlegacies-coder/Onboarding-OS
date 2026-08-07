export default function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div
      className="grid flex-none place-items-center rounded-full border border-[rgba(212,175,55,.16)] bg-graphite2 font-bold text-champagne"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </div>
  )
}
