import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Topnav from './Topnav'
import Toasts from '../ui/Toasts'
import { runDueReminders } from '../../lib/reminders'

/** How often the console re-checks for reminders that have come due. */
const SWEEP_MS = 60_000

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
  useEffect(() => {
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
