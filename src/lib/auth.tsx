import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"

export type Role = "full" | "crm" | "pending"

type AuthCtx = {
  session: Session | null
  role: Role | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadRole(userId: string) {
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
    setRole((data?.role as Role) ?? "pending")
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await loadRole(data.session.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      // Do NOT toggle `loading` here — Supabase fires this on every tab
      // focus/visibility regain (token refresh), and setting loading=true
      // would unmount the whole app (Gate() renders a Spinner while
      // loading), wiping any in-progress form state. `loading` should only
      // reflect the very first session check on app boot (see above).
      setSession(s)
      if (s) await loadRole(s.user.id)
      else setRole(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return error.message
    if (data.user) {
      await supabase.from("profiles").insert({ id: data.user.id, full_name: fullName, email, role: "pending" })
    }
    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return <Ctx.Provider value={{ session, role, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
