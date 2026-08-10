import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Topnav from './Topnav'
import Toasts from '../ui/Toasts'
import { runDueReminders } from '../../lib/reminders'

/** How often the console re-checks for reminders that have come due. */
/**
 * The reminder sweep now reads the database rather than this browser, so each
 * tick is a real query. Reminders fire on 12, 24 and 48-hour marks — checking
 * every five minutes is ample, and a minute would have every open console
 * re-reading every document all day.
 */
const SWEEP_MS = 5 * 60_000

/** Off until the sweep can tell our documents from the contract platform's. */
const REMINDERS_ENABLED = false

export default function AppShell() {
  /*
   * Contract reminders are driven from here while the console is open: on
   * mount, then once a minute.
   *
   * This is a browser, not a scheduler — nothing fires while every tab is
   * closed, and a reminder that came due overnight goes out when someone next
   * signs in. The schedule itself is exact (see lib/reminders.ts); only the
   * moment of delivery drifts. Moving the wait steps into the GoHighLevel
   * workflow, or a server cron, is what makes the timing dependable.
   */
  /*
   * DISABLED — do not re-enable without scoping it first.
   *
   * When the sweep was repointed from localStorage to the database it began
   * seeing every document in the table, including the ones the contract
   * platform raised. It immediately chased nineteen of them: real reminders,
   * to real people, about agreements this platform did not send and is not
   * responsible for. One prospect was escalated to owner-followup off the back
   * of a document from three days before we ever raised one.
   *
   * The schedule logic in lib/reminders.ts is fine. What is missing is a
   * definition of which documents are ours to chase — see the note there.
   */
  useEffect(() => {
    if (!REMINDERS_ENABLED) return
    void runDueReminders()
    const id = setInterval(() => void runDueReminders(), SWEEP_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen">
      <Topnav />
      <main className="container-page px-4 pb-16 pt-6 sm:px-6 lg:px-[34px] lg:pt-[30px]">
        <Outlet />
      </main>
      <Toasts />
    </div>
  )
}
