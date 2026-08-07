import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import PageHead from '../components/ui/PageHead'
import Avatar from '../components/ui/Avatar'
import StagePill from '../components/ui/StagePill'
import PreparerDrawer from '../components/preparer/PreparerDrawer'
import { isRegistered, preparerById, useProspects } from '../lib/prospectStore'
import type { Preparer } from '../types'

const COLUMNS = ['Preparer', 'Stage', 'Session', 'Invited']
const cell = 'border-b border-[rgba(212,175,55,.07)] px-3.5 py-[11px]'

export default function Preparers() {
  const { preparers } = useProspects()
  const [openId, setOpenId] = useState<string | null>(null)
  /**
   * Tracks what's open rather than what's shut, so the page opens as a compact
   * index of offices and any office added later starts closed too.
   */
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const selected = preparerById(openId ?? undefined)

  /**
   * One block per office, alphabetical. Grouping is what removes the Office
   * column — repeating the same chip on every row cost a full column's width
   * to say something the group header already says once.
   */
  const groups = useMemo(() => {
    const by = new Map<string, { office: string; rows: Preparer[] }>()
    for (const p of preparers) {
      const g = by.get(p.officeId) ?? { office: p.office, rows: [] }
      g.rows.push(p)
      by.set(p.officeId, g)
    }
    return [...by.entries()]
      .map(([id, g]) => ({ id, ...g }))
      .sort((a, b) => a.office.localeCompare(b.office))
  }, [preparers])

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allExpanded = groups.length > 0 && expanded.size === groups.length

  return (
    <>
      <PageHead eyebrow="Central account" title="Preparers">
        All prospects and preparers live here in the Higher View account, bound to their office by the invite link they
        used. {preparers.length} across {groups.length} {groups.length === 1 ? 'office' : 'offices'} — open any row for
        their full journey.
      </PageHead>

      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(groups.map((g) => g.id)))}
          className="rounded-[8px] border border-[rgba(212,175,55,.16)] px-3 py-1.5 text-[11.5px] text-muted transition-colors hover:border-[rgba(212,175,55,.4)] hover:text-ivory"
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <div className="bevel overflow-x-auto px-2 pb-0 pt-2">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              {COLUMNS.map((h) => (
                <th
                  key={h}
                  className="border-b border-[rgba(212,175,55,.16)] px-3.5 pb-3.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          {groups.map((g) => {
            const shut = !expanded.has(g.id)
            return (
              <tbody key={g.id}>
                <tr
                  onClick={() => toggle(g.id)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && toggle(g.id)}
                  className="cursor-pointer [&:hover_td]:bg-[rgba(212,175,55,.06)]"
                >
                  <td
                    colSpan={COLUMNS.length}
                    className="border-b border-[rgba(212,175,55,.12)] bg-[rgba(212,175,55,.035)] px-3.5 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        size={13}
                        className={`text-muted transition-transform duration-200 ${shut ? '-rotate-90' : ''}`}
                      />
                      <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-champagne">
                        {g.office}
                      </span>
                      <span className="text-[11px] text-muted">
                        {g.rows.length} {g.rows.length === 1 ? 'preparer' : 'preparers'}
                      </span>
                    </div>
                  </td>
                </tr>

                {!shut &&
                  g.rows.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setOpenId(p.id)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setOpenId(p.id)}
                      className="cursor-pointer [&:hover_td]:bg-[rgba(212,175,55,.03)]"
                    >
                      <td className={cell}>
                        <div className="flex items-center gap-[11px]">
                          <Avatar initials={p.initials} size={28} />
                          <div>
                            <div className="flex items-center gap-2 text-[13px] font-semibold">
                              {p.name}
                              {isRegistered(p.id) && (
                                <span className="rounded-full border border-[rgba(123,196,154,.3)] px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.08em] text-good">
                                  New
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className={cell}>
                        <StagePill stage={p.stage} />
                      </td>
                      <td className={`${cell} text-[13px]`}>{p.session}</td>
                      <td className={`${cell} text-[13px]`}>{p.invited}</td>
                    </tr>
                  ))}
              </tbody>
            )
          })}
        </table>
      </div>

      {selected && <PreparerDrawer preparer={selected} canAct onClose={() => setOpenId(null)} />}
    </>
  )
}
