import type { ContractStatus, Stage, Tone } from '../types'

/** Stages that predate the contract step in the original blueprint. */
const EARLY_STAGES: Stage[] = ['invited', 'scheduled', 'attended']

/**
 * Contract state is derived from the pipeline stage rather than stored separately,
 * so the two can never disagree. Stages map onto Phases 4–6 of the blueprint.
 */
export function contractStatus(stage: Stage, issued = false): ContractStatus {
  // A document can now be raised at booking, before the session has happened,
  // so an actual send outranks what the stage alone would imply. Without this
  // the console would report "not sent yet" for a contract already in someone's
  // inbox.
  if (issued && EARLY_STAGES.includes(stage)) return 'open'
  switch (stage) {
    case 'invited':
    case 'scheduled':
    case 'attended':
      return 'not-sent'
    case 'sent':
    case 'reminder1':
    case 'reminder2':
      return 'open'
    case 'followup':
      return 'stalled'
    case 'signed':
    case 'orientation':
    case 'onboarded':
      return 'signed'
  }
}

export const CONTRACT_LABEL: Record<ContractStatus, { label: string; tone: Tone; help: string }> = {
  'not-sent': {
    label: 'Not sent yet',
    tone: 'gold',
    help: 'Sends automatically about an hour after they attend the Discovery Session.',
  },
  open: {
    label: 'Open — awaiting signature',
    tone: 'warn',
    help: 'Sent and unsigned. Up to two automatic reminders will go out.',
  },
  signed: {
    label: 'Signed',
    tone: 'good',
    help: 'Signed. Orientation is scheduled and Training Community access is granted.',
  },
  stalled: {
    label: 'Needs your call',
    tone: 'bad',
    help: 'Still unsigned after the final reminder. Automation has stopped — this one is yours.',
  },
}
