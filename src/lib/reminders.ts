import { fetchDocuments, recordReminderSent } from './documents'
import { sendReminder } from './ghl'
import { findByEmail, logEvent, moveStage } from './prospectStore'
import type { ContractSend } from '../types'

/**
 * Contract reminder schedule.
 *
 * Someone who has been sent an agreement but has not signed it is nudged at 12,
 * 24 and 48 hours. After the 48-hour mark nothing further is sent — automation
 * hands over and the owner follows up personally (R4).
 *
 * The decision of *what is due* is kept pure and separate from the sending, so
 * the schedule can be exercised without waiting two days for real time to pass.
 */

export const REMINDER_HOURS = [12, 24, 48] as const
export type ReminderType = '12' | '24' | '48'

const HOUR_MS = 60 * 60 * 1000

/** Reminders only chase a document that is still outstanding. */
export function isChaseable(send: ContractSend): boolean {
  return send.status === 'sent' || send.status === 'viewed'
}

export const hoursSinceSent = (send: ContractSend, now = Date.now()) =>
  (now - send.sentAtMs) / HOUR_MS

/**
 * The single reminder that should fire right now, or null.
 *
 * Returns the *latest* mark that has elapsed and not yet been sent, so a
 * console that was closed for three days sends one current nudge rather than
 * replaying the whole backlog at once.
 */
export function dueReminder(send: ContractSend, now = Date.now()): ReminderType | null {
  if (!isChaseable(send) || send.remindersStopped) return null
  const elapsed = hoursSinceSent(send, now)
  const already = send.reminders ?? []

  for (let i = REMINDER_HOURS.length - 1; i >= 0; i--) {
    const mark = String(REMINDER_HOURS[i]) as ReminderType
    if (elapsed >= REMINDER_HOURS[i] && !already.includes(mark)) return mark
  }
  return null
}

/** True once the last mark has been sent — the point automation gives up. */
export const isFinalReminder = (type: ReminderType) =>
  type === String(REMINDER_HOURS[REMINDER_HOURS.length - 1])

/** Marks still outstanding, for showing an owner what is coming. */
export function remainingReminders(send: ContractSend): ReminderType[] {
  if (!isChaseable(send) || send.remindersStopped) return []
  const already = send.reminders ?? []
  return REMINDER_HOURS.map((h) => String(h) as ReminderType).filter((m) => !already.includes(m))
}

/* ── Sweep ───────────────────────────────────────────────── */

/**
 * Fires every reminder that has come due.
 *
 * The reminder is recorded *before* the webhook call, not after: a double-send
 * is worse than a missed one here, since the prospect sees it. If the post
 * fails the mark stays recorded and the failure is surfaced against the
 * preparer instead of being retried into their inbox.
 *
 * Escalation is separate — after the final mark, the person moves to owner
 * follow-up and automation stops touching them (R4).
 */
export async function runDueReminders(now = Date.now()): Promise<number> {
  // Read from the database, not this browser. Reminders used to sweep a local
  // store, which meant they never saw a real document — and could chase one
  // that only ever existed in one person's browser.
  const sends = await fetchDocuments()
  let fired = 0

  for (const send of sends) {
    const type = dueReminder(send, now)
    if (!type) continue

    const final = isFinalReminder(type)
    await recordReminderSent(send.token, type, final)
    fired++

    const res = await sendReminder({
      fullName: send.prospect.name,
      phone: send.prospect.phone,
      email: send.prospect.email,
      officeName: send.officeName,
      officeId: send.officeId,
      reminderType: type,
    })

    const who = findByEmail(send.prospect.email)
    if (who) {
      logEvent(
        who.id,
        res.ok
          ? `Reminder ${type}h sent — still unsigned`
          : `Reminder ${type}h could not be delivered (${res.reason})`,
        'automation',
      )
      // The last mark is where automation hands over to the owner.
      if (final) {
        moveStage(who, 'followup', 'Automation stopped after the 48h reminder')
      }
    }
  }
  return fired
}
