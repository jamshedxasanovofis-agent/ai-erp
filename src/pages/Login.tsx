import { useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/lib/auth"
import { Input, Label } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<"in" | "up">("in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const err = mode === "in" ? await signIn(email, password) : await signUp(email, password, fullName)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[380px] rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] p-9 shadow-[var(--shadow-card)]"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-[14px] bg-[var(--color-ink)]" />
          <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold">Dynamic ERP</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Agentlik boshqaruv tizimiga kirish</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div>
              <Label>To‘liq ism</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Asadbek Nazarov" />
            </div>
          )}
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="siz@agentlik.uz" />
          </div>
          <div>
            <Label>Parol</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
          <Button type="submit" variant="accent" className="w-full" disabled={loading}>
            {loading ? "Yuklanmoqda..." : mode === "in" ? "Kirish" : "Ro‘yxatdan o‘tish"}
          </Button>
        </form>
        <button
          onClick={() => setMode(mode === "in" ? "up" : "in")}
          className="mt-4 w-full cursor-pointer text-center text-xs text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
        >
          {mode === "in" ? "Hisobingiz yo‘qmi? Ro‘yxatdan o‘tish" : "Hisobingiz bormi? Kirish"}
        </button>
      </motion.div>
    </div>
  )
}
