import type { Preparer, Stage, Tone } from '../types'

/**
 * One preparer's path through the pipeline, derived from their current stage.
 *
 * The stage is the single source of truth — a timeline is just that stage read
 * backwards, so the two can never disagree. Message codes point at the catalog
 * in `mock.ts`; that is what tells the drawer which messages have gone out.
 */

/** Pipeline order. `followup` sits where escalation happens, before signature. */
export const STAGE_ORDER: Stage[] = [
  'invited',
  'scheduled',
  'attended',
  'sent',
  'reminder1',
  'reminder2',
  'followup',
  'signed',
  'orientation',
  'onboarded',
]

export const stageRank = (stage: Stage) => STAGE_ORDER.indexOf(stage)

export interface JourneyStep {
  stage: Stage
  title: string
  detail: string
  /** Message codes from the catalog that fire on entering this stage. */
  messages: string[]
  /** Escalation is off the happy path — only shown once it has been reached. */
  offPath?: boolean
  tone?: Tone
}

const STEPS: JourneyStep[] = [
  {
    stage: 'invited',
    title: 'Invitation sent',
    detail: 'Opened the office invite link. Office resolved from the link, never from input.',
    messages: [],
  },
  {
    stage: 'scheduled',
    title: 'Discovery Session booked',
    detail: 'Chose a session from the catalog. Confirmation out, reminders queued.',
    messages: ['M1', 'M2', 'M3'],
  },
  {
    stage: 'attended',
    title: 'Attended the Discovery Session',
    detail: 'Marked present on the call. The contract sends about 45 minutes later.',
    messages: [],
  },
  {
    stage: 'sent',
    title: 'Contract sent',
    detail: "Their office's branded agreement, sent for signature.",
    messages: ['M4'],
  },
  {
    stage: 'reminder1',
    title: 'Reminder #1',
    detail: 'Still unsigned after 24 hours.',
    messages: ['M5'],
    tone: 'warn',
  },
  {
    stage: 'reminder2',
    title: 'Reminder #2 — final',
    detail: 'The last automated nudge. Nothing further sends after this.',
    messages: ['M5'],
    tone: 'warn',
  },
  {
    stage: 'followup',
    title: 'Escalated to the owner',
    detail: 'Automation stopped. The owner reaches out personally from here.',
    messages: ['M6'],
    offPath: true,
    tone: 'bad',
  },
  {
    stage: 'signed',
    title: 'Agreement signed',
    detail: 'Countersigned copy filed. Training Community access granted.',
    messages: ['M7'],
    tone: 'good',
  },
  {
    stage: 'orientation',
    title: 'New Preparer Orientation scheduled',
    detail: 'Post-contract onboarding — distinct from the Discovery Session.',
    messages: ['M8'],
  },
  {
    stage: 'onboarded',
    title: 'Onboarded',
    detail: 'Required modules assigned. Coaching with the owner begins.',
    messages: ['M9'],
    tone: 'good',
  },
]

export type StepState = 'done' | 'current' | 'pending'

export interface JourneyEntry extends JourneyStep {
  state: StepState
}

/**
 * The timeline as it stands for one person. Escalation is hidden unless they
 * actually went through it — most preparers never do.
 */
export function journeyFor(p: Preparer): JourneyEntry[] {
  const rank = stageRank(p.stage)
  return STEPS.filter((s) => !s.offPath || stageRank(s.stage) <= rank).map((s) => {
    const r = stageRank(s.stage)
    return { ...s, state: r < rank ? 'done' : r === rank ? 'current' : 'pending' }
  })
}

/** Every message code that has gone out to this person, in send order. */
export function messagesSent(p: Preparer): string[] {
  return journeyFor(p)
    .filter((s) => s.state !== 'pending')
    .flatMap((s) => s.messages)
}

export interface StageAction {
  label: string
  stage: Stage
  /** Destructive or off-path moves get the danger treatment. */
  danger?: boolean
}

/**
 * What can be done by hand from here. Automation covers the happy path; these
 * exist for the cases it can't see — someone attended off-camera, the owner
 * closed a stalled contract on the phone, an orientation was rescheduled.
 */
export function actionsFor(p: Preparer): StageAction[] {
  switch (p.stage) {
    case 'invited':
      return [{ label: 'Mark discovery scheduled', stage: 'scheduled' }]
    case 'scheduled':
      return [{ label: 'Mark attended', stage: 'attended' }]
    case 'attended':
      return [{ label: 'Send contract now', stage: 'sent' }]
    case 'sent':
    case 'reminder1':
    case 'reminder2':
      return [
        { label: 'Mark signed', stage: 'signed' },
        { label: 'Escalate to owner', stage: 'followup', danger: true },
      ]
    case 'followup':
      return [{ label: 'Mark signed', stage: 'signed' }]
    case 'signed':
      return [{ label: 'Schedule orientation', stage: 'orientation' }]
    case 'orientation':
      return [{ label: 'Mark onboarded', stage: 'onboarded' }]
    case 'onboarded':
      return []
  }
}
