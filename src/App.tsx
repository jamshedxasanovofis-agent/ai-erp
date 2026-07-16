import { Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider, useAuth } from "@/lib/auth"
import { AppLayout } from "@/components/layout/AppLayout"
import Login from "@/pages/Login"
import BookingPage from "@/pages/BookingPage"
import PublicBookingPage from "@/pages/PublicBookingPage"
import Dashboard from "@/pages/Dashboard"
import Crm from "@/pages/Crm"
import Projects from "@/pages/Projects"
import Tasks from "@/pages/Tasks"
import Documents from "@/pages/Documents"
import Finance from "@/pages/Finance"
import Contracts from "@/pages/Contracts"
import Employees from "@/pages/Employees"
import Clients from "@/pages/Clients"
import DemoTracker from "@/pages/DemoTracker"
import ImageGen from "@/pages/ImageGen"

function Spinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--color-bg)]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]" />
    </div>
  )
}

function PendingScreen() {
  const { signOut } = useAuth()
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-6 text-center">
      <h1 className="text-lg font-semibold">Sizga hali huquq berilmagan</h1>
      <p className="max-w-sm text-sm text-[var(--color-ink-soft)]">
        Hisobingiz yaratildi, lekin hali rol biriktirilmagan. CEO yoki SEO bilan bog‘laning — ular Xodimlar bo‘limidan sizga rol beradi.
      </p>
      <button onClick={signOut} className="cursor-pointer text-xs text-[var(--color-accent)] hover:underline">Chiqish</button>
    </div>
  )
}

function FullRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/sotuv" element={<Crm />} />
      <Route path="/loyihalar" element={<Projects />} />
      <Route path="/vazifalar" element={<Tasks />} />
      <Route path="/xujjatlar" element={<Documents />} />
      <Route path="/moliya" element={<Finance />} />
      <Route path="/shartnomalar" element={<Contracts />} />
      <Route path="/xodimlar" element={<Employees />} />
      <Route path="/mijozlar" element={<Clients />} />
      <Route path="/demo" element={<DemoTracker />} />
      <Route path="/rasm" element={<ImageGen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function CrmOnlyRoutes() {
  return (
    <Routes>
      <Route path="/sotuv" element={<Crm />} />
      <Route path="*" element={<Navigate to="/sotuv" replace />} />
    </Routes>
  )
}

function Gate() {
  const { session, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Login />
  if (role === "pending" || role === null) return <PendingScreen />
  return (
    <AppLayout>
      {role === "crm" ? <CrmOnlyRoutes /> : <FullRoutes />}
    </AppLayout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/booking/lead/:leadToken" element={<PublicBookingPage />} />
      <Route path="/booking/:token" element={<BookingPage />} />
      <Route
        path="/*"
        element={
          <AuthProvider>
            <Gate />
          </AuthProvider>
        }
      />
    </Routes>
  )
}
