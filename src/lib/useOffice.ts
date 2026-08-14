import { useEffect, useState } from 'react'
import { supabase, type Office } from './supabase'

/**
 * The signed-in owner's office, read from Supabase.
 *
 * Offices used to be looked up in `mock.ts` by a hard-coded id. Now that an
 * office id is a database UUID, that lookup returns nothing — and the pages
 * that redirected on a miss bounced against the admin guard forever, leaving
 * an owner on a blank screen. This resolves the office properly and reports
 * `loading` so nothing redirects before the answer arrives.
 */
export function useOffice(officeId: string | undefined) {
  const [office, setOffice] = useState<Office | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!officeId || !supabase) {
      setOffice(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('owners')
      .select('id,name,company_name,slug,owner_name,initials,logo_url,email,phone')
      .eq('id', officeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('useOffice', error.message)
        setOffice(
          data
            ? {
                id: String(data.id),
                name: String(data.company_name || data.name || 'Your office'),
                slug: String(data.slug ?? ''),
                ownerName: String(data.owner_name || data.name || ''),
                initials: String(data.initials || '??'),
                logoUrl: (data.logo_url as string) ?? null,
                email: (data.email as string) ?? null,
                phone: (data.phone as string) ?? null,
              }
            : null,
        )
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [officeId])

  return { office, loading }
}

/** The owner's shareable invite URL, absolute against wherever this is served. */
export const inviteUrlFor = (slug: string) =>
  `${typeof window === 'undefined' ? '' : window.location.origin}/j/${slug}`
