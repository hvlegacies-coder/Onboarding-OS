import { Fragment, useState } from 'react'
import PageHead from '../components/ui/PageHead'
import PreparerDrawer from '../components/preparer/PreparerDrawer'
import { preparerById, useProspects } from '../lib/prospectStore'
import type { Preparer, Stage } from '../types'

/**
 * Board columns, each collecting one or more pipeline stages.
 *
 * `via` is what moves someone into this column — the connector drawn to its
 * left. `manual` marks a hand-off automation does not perform: the board should
 * make it obvious where the machine stops and a person takes over (R4).
 */
const COLUMNS: {
  title: string
  stages: Stage[]
  danger?: boolean
  /** `label` is what fits between columns; `detail` is the full rule, on hover. */
  via?: { label: string; detail: string; manual?: boolean }
}[] = [
  { title: 'Invitation sent', stages: ['invited'] },
  {
    title: 'Discovery scheduled',
    stages: ['scheduled'],
    via: { label: 'Registers', detail: 'Picks a session on the invitation form' },
  },
  {
    title: 'Attended',
    stages: ['attended'],
    via: { label: 'Attends', detail: 'Joins the Discovery Session' },
  },
  {
    title: 'Contract sent',
    stages: ['sent', 'reminder1', 'reminder2'],
    via: { label: '~45 min', detail: 'Branded agreement sends ~45 minutes after the session' },
  },
  {
    title: 'Owner follow-up',
    stages: ['followup'],
    danger: true,
    via: {
      label: 'Unsigned ×2',
      detail: 'Still unsigned after two reminders — automation stops and the owner is notified',
      manual: true,
    },
  },
  {
    title: 'Signed',
    stages: ['signed', 'orientation'],
    via: { label: 'Signs', detail: 'Signature received — training access granted' },
  },
  {
    title: 'Onboarded',
    stages: ['onboarded'],
    via: { label: 'Orientation', detail: 'Completes New Preparer Orientation and required modules' },
  },
]

const META: Partial<Record<Stage, string>> = {
  reminder1: 'reminder 1',
  reminder2: 'reminder 2',
  followup: 'unsigned',
  orientation: 'orientation',
  onboarded: 'coaching',
}

export default function Pipeline() {
  const { preparers } = useProspects()
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = preparerById(openId ?? undefined)

  return (
    <>
      <PageHead eyebrow="State machine" title="Pipeline">
        Prospects move automatically through 13 stages. When a contract stays unsigned after the final reminder,
        automation stops and the owner is notified.
      </PageHead>

      {/*
        Full-bleed: the board breaks out of the page's 1200px measure so all
        seven stages fit on screen at once. A kanban that scrolls sideways hides
        exactly the thing it exists to show — the shape of the whole funnel.
      */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-[34px]">
        <div className="flex items-stretch overflow-x-auto pb-3.5 lg:overflow-visible">
          {COLUMNS.map((col) => {
            const cards = preparers.filter((p) => col.stages.includes(p.stage))
            return (
              <Fragment key={col.title}>
                {col.via && (
                  <Connector
                    label={col.via.label}
                    detail={col.via.detail}
                    manual={col.via.manual}
                  />
                )}
            <div
              // Phones scroll the board with readable fixed columns; from lg it
              // divides the screen so the whole funnel is visible at once.
              className={`stage-col w-[210px] flex-none rounded-2xl border border-[rgba(212,175,55,.16)] bg-gradient-to-b from-[rgba(28,28,33,.6)] to-[rgba(19,19,22,.6)] p-3 lg:w-auto lg:min-w-0 lg:flex-1 lg:basis-0 ${
                col.danger ? 'stage-col--danger' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-1.5">
                <span className="min-w-0 truncate text-[11px] font-semibold text-champagne" title={col.title}>
                  {col.title}
                </span>
                <span className="stage-count gold-fill flex-none rounded-full px-2 py-px text-[10px] font-bold text-[#241a04]">
                  {cards.length}
                </span>
              </div>

              {cards.map((p) => (
                <Card key={p.id} p={p} danger={col.danger} onOpen={() => setOpenId(p.id)} />
              ))}

              {cards.length === 0 && (
                <div className="rounded-[11px] border border-dashed border-[rgba(212,175,55,.1)] py-5 text-center text-[11px] text-muted">
                  Empty
                </div>
              )}
            </div>
              </Fragment>
            )
          })}
        </div>
      </div>

      {selected && (
        <PreparerDrawer preparer={selected} canAct onClose={() => setOpenId(null)} />
      )}
    </>
  )
}

/**
 * The hand-off between two columns. Automated steps carry a travelling dash so
 * the board reads as a running machine; the one manual step is drawn broken and
 * in the danger tone, because that is the moment automation stops and the owner
 * has to act. Hover reveals the rule that fires the transition.
 */
function Connector({
  label,
  detail,
  manual,
}: {
  label: string
  detail: string
  manual?: boolean
}) {
  const gid = `flow-${label.replace(/\W+/g, '-')}`
  const stroke = manual ? '#D08A7A' : `url(#${gid})`

  return (
    <div
      tabIndex={0}
      // Native tooltip: it escapes any container, unlike a positioned element.
      title={detail}
      aria-label={detail}
      className={`flow-conn group flex w-[52px] flex-none flex-col sm:w-[62px] items-center justify-center gap-1.5 self-stretch outline-none ${
        manual ? 'flow-conn--stop' : ''
      }`}
    >
      <svg width="54" height="26" viewBox="0 0 92 26" aria-hidden>
        <defs>
          {/*
            Unique per connector — a shared id would make every arrow reuse the
            first gradient. userSpaceOnUse is required: percentage stops resolve
            against the shape's bounding box, and a perfectly horizontal line
            has zero height, so the gradient would not paint it at all.
          */}
          <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="92" y2="0">
            <stop offset="0%" stopColor="#8C6A1E" />
            <stop offset="45%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#F5D98B" />
          </linearGradient>
        </defs>
        <line
          className="flow-line"
          x1="2"
          y1="13"
          x2="74"
          y2="13"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          className="flow-head"
          d="M72 6 L84 13 L72 20"
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* A slash through the line marks where automation gives up. */}
        {manual && <line x1="34" y1="4" x2="42" y2="22" stroke="#D08A7A" strokeWidth="2.5" strokeLinecap="round" />}
      </svg>

      {/* Always visible: a hover-only tooltip would be clipped by the board's
          horizontal scroll container at the right-hand edge. */}
      <span
        className={`flow-label-static text-center text-[9.5px] leading-tight ${
          manual ? 'font-semibold text-bad' : 'text-muted'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function Card({ p, danger, onOpen }: { p: Preparer; danger?: boolean; onOpen: () => void }) {
  const meta = META[p.stage] ?? p.session.split(' · ')[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mb-2.5 block w-full rounded-[11px] border bg-graphite p-2.5 text-left transition-transform duration-150 hover:-translate-y-[3px] hover:border-gold ${
        danger ? 'border-[rgba(208,138,122,.4)]' : 'border-[rgba(212,175,55,.1)]'
      }`}
    >
      <div className="truncate text-[12.5px] font-semibold" title={p.name}>
        {p.name}
      </div>
      <div className="mt-1 text-[10.5px] leading-tight text-muted">
        <span className={`block truncate ${danger ? 'text-bad' : 'text-gold'}`} title={p.office}>
          {p.office}
        </span>
        {meta && meta !== '—' && <span className="block truncate">{meta}</span>}
      </div>
    </button>
  )
}
