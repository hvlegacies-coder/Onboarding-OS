import type { Stage, Tone } from '../../types'
import Chip from './Chip'

const map: Record<Stage, { label: string; tone: Tone }> = {
  invited: { label: 'Invitation sent', tone: 'gold' },
  scheduled: { label: 'Discovery scheduled', tone: 'gold' },
  attended: { label: 'Attended', tone: 'gold' },
  sent: { label: 'Contract sent', tone: 'gold' },
  reminder1: { label: 'Reminder #1', tone: 'warn' },
  reminder2: { label: 'Reminder #2', tone: 'warn' },
  signed: { label: 'Signed', tone: 'good' },
  followup: { label: 'Owner follow-up', tone: 'bad' },
  orientation: { label: 'Orientation', tone: 'gold' },
  onboarded: { label: 'Onboarded', tone: 'good' },
}

export default function StagePill({ stage }: { stage: Stage }) {
  const s = map[stage]
  return <Chip tone={s.tone}>{s.label}</Chip>
}
