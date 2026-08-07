import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Columns3,
  Users,
  Building2,
  CalendarDays,
  FileSignature,
  FileText,
  MessageSquare,
  Settings,
  Sparkles,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import Logo from '../ui/Logo'
import Avatar from '../ui/Avatar'
import { useAuth } from '../auth/auth'
import OfficeMark from '../ui/OfficeMark'
import { notifications, officeById } from '../../data/mock'
import { officeBranding, useContracts } from '../../lib/contractStore'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutGrid
  badge?: string
  end?: boolean
}

const adminNav: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
  { to: '/preparers', label: 'Preparers', icon: Users },
  { to: '/offices', label: 'Offices', icon: Building2 },
  { to: '/sessions', label: 'Sessions', icon: CalendarDays },
  { to: '/contracts', label: 'Contracts', icon: FileSignature },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
]

const ownerNav: NavItem[] = [
  { to: '/my-office', label: 'My office', icon: Building2, end: true },
  { to: '/my-contract', label: 'Contract', icon: FileSignature },
  { to: '/assistant', label: 'Assistant', icon: Sparkles },
]

const dot: Record<string, string> = {
  good: '#7BC49A',
  gold: '#D4AF37',
  warn: '#E0B15A',
  bad: '#D08A7A',
}

/**
 * The chrome an office owner sees is their own — their logo or monogram and
 * their business name, with Higher View credited beneath (R: the prospect-facing
 * experience is identical across offices; only branding differs). A platform
 * operator has no single office, so they keep the Higher View mark.
 */
function BrandMark() {
  const { session } = useAuth()
  const office = officeById(session?.officeId)
  // Re-render when the owner uploads or changes their logo.
  useContracts()

  if (!office) {
    return (
      <div className="brand-link flex flex-none items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="brand-name gold-text font-cinzel text-[14px] font-bold leading-tight tracking-[0.16em]">
            HIGHERVIEW
          </div>
          <div className="mt-[3px] text-[9.5px] uppercase tracking-[0.28em] text-muted">Legacies</div>
        </div>
      </div>
    )
  }

  const logo = officeBranding(office.id).logo

  return (
    <NavLink
      to="/my-office"
      title={office.name}
      className="brand-link flex flex-none items-center gap-3 rounded-[10px] outline-none"
    >
      <OfficeMark name={office.name} initials={office.initials} logo={logo} size={40} />
      <div className="min-w-0">
        <div className="brand-name gold-text max-w-[210px] truncate font-cinzel text-[13.5px] font-bold uppercase leading-tight tracking-[0.12em]">
          {office.name}
        </div>
        <div className="mt-[3px] text-[9.5px] uppercase tracking-[0.24em] text-muted">
          Higher View Legacies
        </div>
      </div>
    </NavLink>
  )
}

export default function Topnav() {
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { session, signOut } = useAuth()
  const nav = session?.role === 'owner' ? ownerNav : adminNav

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
      setMenu(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(212,175,55,.16)] bg-[rgba(10,10,12,.82)] backdrop-blur-md">
      {/* ── Row 1: brand · search · utilities · operator ── */}
      <div className="container-page flex items-center gap-3 px-4 py-3 sm:gap-[18px] sm:px-6 lg:px-[34px] lg:py-3.5">
        <BrandMark />

        <label className="ml-6 hidden w-full max-w-[420px] items-center gap-2.5 rounded-[11px] border border-[rgba(212,175,55,.16)] bg-graphite px-3.5 py-[9px] transition-colors hover:border-[rgba(212,175,55,.32)] focus-within:border-[rgba(212,175,55,.5)] lg:flex">
          <Search size={16} className="text-muted" />
          <input
            className="w-full bg-transparent text-[13px] text-ivory outline-none placeholder:text-muted"
            placeholder="Search preparers, offices, sessions…"
          />
        </label>

        <div className="relative ml-auto flex flex-none items-center gap-2.5" ref={ref}>
          <button
            aria-label="Notifications"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            className="relative grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(212,175,55,.16)] bg-graphite text-gold transition-colors hover:border-[rgba(212,175,55,.4)]"
          >
            <Bell size={18} strokeWidth={1.7} />
            <span className="gold-fill absolute right-[9px] top-2 h-[7px] w-[7px] rounded-full shadow-[0_0_8px_#D4AF37]" />
          </button>

          {open && (
            <div className="bevel absolute right-0 top-[56px] z-30 w-[340px] p-2">
              <div className="flex items-center justify-between border-b border-[rgba(212,175,55,.16)] px-3 pb-2.5 pt-3">
                <span className="eyebrow" style={{ fontSize: '9px' }}>Owner notifications</span>
                <button className="text-[11px] text-gold">Mark all read</button>
              </div>
              {notifications.length === 0 && (
                <p className="px-3 py-6 text-center text-[12px] text-muted">No notifications yet.</p>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="flex gap-[11px] rounded-[10px] p-3 hover:bg-[rgba(212,175,55,.05)]">
                  <span className="mt-[5px] h-[9px] w-[9px] flex-none rounded-full" style={{ background: dot[n.tone] }} />
                  <div>
                    <div className="text-[12.5px] leading-snug [&_b]:font-semibold [&_b]:text-champagne" dangerouslySetInnerHTML={{ __html: n.text }} />
                    <div className="mt-[3px] text-[10.5px] text-muted">{n.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            aria-label="Help"
            className="grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(212,175,55,.16)] bg-graphite text-gold transition-colors hover:border-[rgba(212,175,55,.4)]"
          >
            <HelpCircle size={18} strokeWidth={1.7} />
          </button>

          <div className="ml-2 hidden items-center gap-[11px] border-l border-[rgba(212,175,55,.16)] pl-4 sm:flex">
            <Avatar initials={initialsOf(session?.name)} size={34} />
            <div className="hidden md:block">
              <div className="text-[12.5px] font-semibold leading-tight">{session?.name}</div>
              <div className="text-[10.5px] text-muted">
                {session?.role === 'owner' ? session.officeName : 'Platform Operator'}
              </div>
            </div>
            <button
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="ml-1 grid h-9 w-9 place-items-center rounded-[10px] border border-[rgba(212,175,55,.16)] text-muted transition-colors hover:border-[rgba(212,175,55,.4)] hover:text-gold"
            >
              <LogOut size={16} strokeWidth={1.7} />
            </button>
          </div>

          {/* Phones get a menu instead of the tab strip — ten tabs can't share
              a 390px row, and a scroll strip hides most of them. */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setMenu((v) => !v)
            }}
            aria-label={menu ? 'Close menu' : 'Open menu'}
            aria-expanded={menu}
            className="grid h-10 w-10 flex-none place-items-center rounded-[11px] border border-[rgba(212,175,55,.16)] bg-graphite text-gold transition-colors hover:border-[rgba(212,175,55,.4)] md:hidden"
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menu && (
        <div className="border-t border-[rgba(212,175,55,.16)] bg-[rgba(10,10,12,.97)] px-4 pb-4 pt-3 md:hidden">
          <div className="grid grid-cols-2 gap-2">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenu(false)}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-2.5 rounded-[11px] border px-3 py-3 text-[13px] font-medium transition-colors',
                    isActive
                      ? 'border-[rgba(212,175,55,.45)] bg-[rgba(212,175,55,.1)] text-champagne'
                      : 'border-[rgba(212,175,55,.14)] text-muted hover:text-ivory',
                  ].join(' ')
                }
              >
                <Icon size={17} strokeWidth={1.6} className="flex-none" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2.5 border-t border-[rgba(212,175,55,.12)] pt-3">
            <Avatar initials={initialsOf(session?.name)} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-semibold">{session?.name}</div>
              <div className="truncate text-[10.5px] text-muted">
                {session?.role === 'owner' ? session.officeName : 'Platform Operator'}
              </div>
            </div>
            <button
              onClick={signOut}
              className="rounded-[9px] border border-[rgba(212,175,55,.2)] px-3 py-2 text-[11.5px] text-muted transition-colors hover:text-gold"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* ── Row 2: primary navigation (scoped to the signed-in role) ── */}
      <nav className="container-page hidden gap-1 overflow-x-auto px-3 sm:px-6 md:flex lg:px-[30px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {nav.map(({ to, label, icon: Icon, badge, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [
                'relative flex flex-none items-center gap-2.5 rounded-t-[11px] border-x border-t px-3.5 py-[11px] text-[13.5px] font-medium transition-all',
                isActive
                  ? 'border-[rgba(212,175,55,.16)] bg-gradient-to-b from-[rgba(212,175,55,.14)] to-[rgba(212,175,55,.03)] text-champagne'
                  : 'border-transparent text-muted hover:bg-[rgba(212,175,55,.05)] hover:text-ivory',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} strokeWidth={1.6} className="flex-none" />
                {label}
                {badge && (
                  <span className="gold-fill rounded-full px-[7px] py-px text-[10px] font-bold text-[#241a04]">
                    {badge}
                  </span>
                )}
                {isActive && (
                  <span className="gold-fill absolute inset-x-2 -bottom-px h-[3px] rounded-t-[3px] shadow-[0_0_10px_rgba(212,175,55,.6)]" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}

function initialsOf(name: string | undefined) {
  if (!name) return '—'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
