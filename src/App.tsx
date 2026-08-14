import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, RequireAuth, RequireAdmin } from './components/auth/auth'
import AppShell from './components/layout/AppShell'
import Login from './pages/Login'
import Join from './pages/Join'
import SignContract from './pages/SignContract'
import MyOffice from './pages/MyOffice'
import OwnerContract from './pages/OwnerContract'
import Templates from './pages/Templates'
import Overview from './pages/Overview'
import Pipeline from './pages/Pipeline'
import Preparers from './pages/Preparers'
import Offices from './pages/Offices'
import Sessions from './pages/Sessions'
import Contracts from './pages/Contracts'
import Messages from './pages/Messages'
import SettingsPage from './pages/Settings'
import Assistant from './pages/Assistant'

/** Platform-operator pages — an office owner never sees the cross-office funnel. */
const adminOnly = [
  { path: '/', element: <Overview /> },
  { path: '/pipeline', element: <Pipeline /> },
  { path: '/preparers', element: <Preparers /> },
  { path: '/offices', element: <Offices /> },
  { path: '/sessions', element: <Sessions /> },
  { path: '/contracts', element: <Contracts /> },
  { path: '/templates', element: <Templates /> },
  { path: '/messages', element: <Messages /> },
  { path: '/settings', element: <SettingsPage /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          {/* Public, unauthenticated — the prospect's only view of the platform.
              /j/ is the short link owners actually share; /join/ is kept working
              for links already handed out before the shortening. */}
          <Route path="/j/:officeSlug" element={<Join />} />
          <Route path="/join/:officeSlug" element={<Join />} />
          {/* Public — the token in the URL is the only credential */}
          <Route path="/sign/:token" element={<SignContract />} />

          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            {/* Every signed-in owner lands here */}
            <Route path="/my-office" element={<MyOffice />} />
            <Route path="/my-contract" element={<OwnerContract />} />
            <Route path="/assistant" element={<Assistant />} />

            {adminOnly.map(({ path, element }) => (
              <Route key={path} path={path} element={<RequireAdmin>{element}</RequireAdmin>} />
            ))}
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
