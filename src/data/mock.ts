import type { Office, Preparer, Session, Message, Activity, FunnelStep } from '../types'

/**
 * What is left of the prototype's local data. The people, activity feed and
 * calendar now come from Supabase; the arrays below are deliberately empty so
 * nothing invented shows up next to real records.
 */

/**
 * The office index. Real tenants, their invite slugs and branding state live in
 * Supabase — this list is what the admin console falls back to for offices that
 * have not been migrated yet. It carries no credentials: sign-in is Supabase
 * Auth, and prototype passwords have been removed from the bundle.
 */
export const offices: Office[] = [
  { id: 'openbook-financial-group', name: 'Openbook Financial Group', owner: 'Alichielle Shears', initials: 'OF', slug: 'openbook-financial-group', branding: 'complete' },
  { id: 'all-in-one-tax-solutions-llc', name: 'All In One Tax Solutions LLC', owner: '', initials: 'AI', slug: 'all-in-one-tax-solutions-llc', branding: 'complete' },
  { id: 'bc-income-tax-services', name: 'Bc income tax services', owner: '', initials: 'BI', slug: 'bc-income-tax-services', branding: 'complete' },
  { id: 'big-payback-tax-co', name: 'Big Payback Tax Co.', owner: '', initials: 'BP', slug: 'big-payback-tax-co', branding: 'complete' },
  { id: 'bossladi-tax-resolutions', name: 'Bossladi Tax Resolutions', owner: '', initials: 'BT', slug: 'bossladi-tax-resolutions', branding: 'complete' },
  { id: 'bright-meadow-tax-services', name: 'Bright Meadow Tax Services', owner: '', initials: 'BM', slug: 'bright-meadow-tax-services', branding: 'complete' },
  { id: 'brilliant-minds-tax-co', name: 'Brilliant Minds Tax Co', owner: '', initials: 'BM', slug: 'brilliant-minds-tax-co', branding: 'complete' },
  { id: 'clarity-tax-group', name: 'Clarity Tax Group', owner: '', initials: 'CT', slug: 'clarity-tax-group', branding: 'complete' },
  { id: 'c-c-tax-solutions', name: 'C&C Tax Solutions', owner: '', initials: 'CC', slug: 'c-c-tax-solutions', branding: 'logo-pending' },
  { id: 'd-d-tax-services', name: 'D&D TAX SERVICES', owner: '', initials: 'DD', slug: 'd-d-tax-services', branding: 'complete' },
  { id: 'tailored-tax-solutions', name: 'Tailored Tax Solutions', owner: 'Deontae Bannerman', initials: 'TT', slug: 'tailored-tax-solutions', branding: 'complete' },
  { id: 'royal-tax-services-llc', name: 'Royal Tax Services LLC', owner: 'Didler Lumnui', initials: 'RT', slug: 'royal-tax-services-llc', branding: 'complete' },
  { id: 'dior-tax-solutions', name: 'Dior Tax Solutions', owner: '', initials: 'DT', slug: 'dior-tax-solutions', branding: 'complete' },
  { id: 'divine-dynasty-tax-co', name: 'Divine Dynasty Tax Co', owner: '', initials: 'DD', slug: 'divine-dynasty-tax-co', branding: 'complete' },
  { id: 'dukes-co', name: 'Dukes & Co', owner: '', initials: 'DC', slug: 'dukes-co', branding: 'complete' },
  { id: 'fast-cash-tax-services-llc', name: 'Fast Cash Tax Services LLC', owner: '', initials: 'FC', slug: 'fast-cash-tax-services-llc', branding: 'complete' },
  { id: 'total-tax-accounting-services', name: 'TOTAL TAX & ACCOUNTING SERVICES', owner: 'Fombat Devolos', initials: 'TT', slug: 'total-tax-accounting-services', branding: 'complete' },
  { id: 'chosen-net-tax-financial-services-llc', name: 'Chosen net tax $ Financial services llc', owner: 'George Suh Nde', initials: 'CN', slug: 'chosen-net-tax-financial-services-llc', branding: 'logo-pending' },
  { id: 'g-g-capital-services', name: 'G&G Capital Services', owner: '', initials: 'GG', slug: 'g-g-capital-services', branding: 'complete' },
  { id: 'advance-tax-and-financial-services', name: 'Advance tax and financial services', owner: 'Gilbert Mukum', initials: 'AT', slug: 'advance-tax-and-financial-services', branding: 'complete' },
  { id: 'gmoad-tax', name: 'GMOAD Tax', owner: '', initials: 'GT', slug: 'gmoad-tax', branding: 'complete' },
  { id: 'goddess-tax-service', name: 'Goddess Tax Service', owner: '', initials: 'GT', slug: 'goddess-tax-service', branding: 'complete' },
  { id: 'go-up-financials', name: 'Go Up Financials', owner: '', initials: 'GU', slug: 'go-up-financials', branding: 'complete' },
  { id: 'easytax-llc', name: 'EASYTAX LLC', owner: 'Ibrahim Samuka Monyaba Koroma', initials: 'EA', slug: 'easytax-llc', branding: 'complete' },
  { id: 'instant-tax-services', name: 'INSTANT TAX SERVICES', owner: '', initials: 'IT', slug: 'instant-tax-services', branding: 'complete' },
  { id: 'jmj-professional-tax-service', name: 'JmJ Professional Tax service', owner: '', initials: 'JP', slug: 'jmj-professional-tax-service', branding: 'complete' },
  { id: 'kenrel-tax-services', name: 'Kenrel Tax Services', owner: '', initials: 'KT', slug: 'kenrel-tax-services', branding: 'logo-pending' },
  { id: 'king-j', name: 'KING J', owner: '', initials: 'KJ', slug: 'king-j', branding: 'complete' },
  { id: 'klarity-tax-services', name: 'Klarity Tax Services', owner: '', initials: 'KT', slug: 'klarity-tax-services', branding: 'complete' },
  { id: 'lbn-income-tax-solution', name: 'LBN INCOME TAX SOLUTION', owner: '', initials: 'LI', slug: 'lbn-income-tax-solution', branding: 'complete' },
  { id: 'lnc-tax-services', name: 'LNC Tax Services', owner: '', initials: 'LT', slug: 'lnc-tax-services', branding: 'complete' },
  { id: 'main-event', name: 'MAIN EVENT', owner: '', initials: 'ME', slug: 'main-event', branding: 'complete' },
  { id: 'malone-method-tax-services', name: 'Malone Method Tax Services', owner: '', initials: 'MM', slug: 'malone-method-tax-services', branding: 'complete' },
  { id: 'n-n-tax-services-llc', name: 'N&N TAX SERVICES LLC', owner: 'Nazarus Nkongjowh', initials: 'NN', slug: 'n-n-tax-services-llc', branding: 'complete' },
  { id: 'ndongkang-sons', name: 'NdongKang & Sons', owner: '', initials: 'NS', slug: 'ndongkang-sons', branding: 'complete' },
  { id: 'power-play', name: 'POWER PLAY', owner: '', initials: 'PP', slug: 'power-play', branding: 'logo-pending' },
  { id: 'precise-taxx-solutions', name: 'Precise Taxx Solutions', owner: '', initials: 'PT', slug: 'precise-taxx-solutions', branding: 'complete' },
  { id: 'premier-tax-software', name: 'Premier Tax Software', owner: '', initials: 'PT', slug: 'premier-tax-software', branding: 'complete' },
  { id: 'prolific-legacy-tax-services', name: 'Prolific Legacy Tax Services', owner: '', initials: 'PL', slug: 'prolific-legacy-tax-services', branding: 'complete' },
  { id: 'rinnyuy-llc', name: 'RINNYUY LLC', owner: '', initials: 'RI', slug: 'rinnyuy-llc', branding: 'complete' },
  { id: 'rise-financial-services', name: 'Rise Financial Services', owner: '', initials: 'RF', slug: 'rise-financial-services', branding: 'complete' },
  { id: 'rs-tax-experts', name: 'RS TAX EXPERTS', owner: 'Roland Ndebangwen', initials: 'RT', slug: 'rs-tax-experts', branding: 'complete' },
  { id: 'r-moni', name: "R'Moni", owner: '', initials: 'RM', slug: 'r-moni', branding: 'complete' },
  { id: 'royal-tribe-tax-solutions', name: 'Royal Tribe Tax Solutions', owner: '', initials: 'RT', slug: 'royal-tribe-tax-solutions', branding: 'complete' },
  { id: 'syndex-tax-llc', name: 'SYNDEX TAX LLC', owner: 'Sandrine Fombad', initials: 'ST', slug: 'syndex-tax-llc', branding: 'logo-pending' },
  { id: 'savyy-tax-professionals', name: 'Savyy Tax Professionals', owner: '', initials: 'ST', slug: 'savyy-tax-professionals', branding: 'complete' },
  { id: 's-c-tax-solutions', name: 'S&C TAX SOLUTIONS', owner: '', initials: 'SC', slug: 's-c-tax-solutions', branding: 'complete' },
  { id: 's-d-tax-solutions', name: 'S&D Tax Solutions', owner: '', initials: 'SD', slug: 's-d-tax-solutions', branding: 'complete' },
  { id: 'smartfile', name: 'SmartFile', owner: '', initials: 'SM', slug: 'smartfile', branding: 'complete' },
]

/** Resolve an Office from a link segment. Returns undefined for an unknown slug (R2 fallback). */
export const officeBySlug = (slug: string | undefined) =>
  offices.find((o) => o.slug === slug?.toLowerCase())

/** The owner's shareable invite URL, absolute against wherever the app is served. */
export const inviteUrl = (office: Office) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/join/${office.slug}`

/**
 * Real prospects only. Everyone here arrives through an office invite link and
 * is written to localStorage by `prospectStore`; nothing is seeded.
 */
export const preparers: Preparer[] = [] // real people come from Supabase

/** Everything the platform knows about one office's prospects. */
export const preparersByOffice = (officeId: string) =>
  preparers.filter((p) => p.officeId === officeId)

export const officeById = (id: string | undefined) => offices.find((o) => o.id === id)

/* The calendar is read straight from Supabase — see `lib/sessionStore.ts`. */

export const requiredModules: string[] = [
  'Due Diligence',
  'Filing Statuses · Single',
  'Filing Statuses · MFJ',
  'Filing Statuses · MFS',
  'Filing Statuses · HOH',
  'Filing Statuses · QSS',
  'Intro Tax Training',
]

/** Live feed only — entries are written as things actually happen. */
export const activity: Activity[] = [] // real events come from Supabase

/** Owner notifications, generated at runtime rather than seeded. */
export const notifications: Activity[] = [] // real events come from Supabase

export const messages: Message[] = []
