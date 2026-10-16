import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Input"
import { Dialog } from "@/components/ui/Dialog"
import { formatDate } from "@/lib/utils"
import { Sparkles, Loader2, Download, Trash2 } from "lucide-react"

const SIZES = [
  { key: "1:1", label: "Kvadrat", width: 1024, height: 1024 },
  { key: "4:3", label: "Albom", width: 1024, height: 768 },
  { key: "3:4", label: "Portret", width: 768, height: 1024 },
  { key: "16:9", label: "Keng ekran", width: 1280, height: 720 },
  { key: "9:16", label: "Story", width: 720, height: 1280 },
] as const

type GeneratedImage = { id: string; prompt: string; width: number; height: number; image_url: string; created_at: string }

export default function ImageGen() {
  const [prompt, setPrompt] = useState("")
  const [size, setSize] = useState<(typeof SIZES)[number]>(SIZES[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [items, setItems] = useState<GeneratedImage[]>([])
  const [preview, setPreview] = useState<GeneratedImage | null>(null)

  async function load() {
    const { data } = await supabase.from("generated_images").select("*").order("created_at", { ascending: false }).limit(60)
    setItems((data as GeneratedImage[]) ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setCurrent(null)
    try {
      const seed = Math.floor(Math.random() * 1e9)
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.trim())}?width=${size.width}&height=${size.height}&seed=${seed}&nologo=true`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Rasm generatsiya qilinmadi")
      const blob = await res.blob()

      const path = `generated/${Date.now()}-${seed}.jpg`
      const { error: upErr } = await supabase.storage.from("attachments").upload(path, blob, { contentType: "image/jpeg" })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path)

      await supabase.from("generated_images").insert({
        prompt: prompt.trim(), width: size.width, height: size.height, image_url: pub.publicUrl,
      })

      setCurrent(pub.publicUrl)
      load()
    } catch (err: any) {
      setError(err.message ?? "Xatolik yuz berdi")
    } finally {
      setLoading(false)
    }
  }

  async function remove(item: GeneratedImage) {
    if (!confirm("Ushbu rasmni o‘chirishni tasdiqlaysizmi?")) return
    const { error } = await supabase.from("generated_images").delete().eq("id", item.id)
    if (error) {
      alert("O'chirib bo'lmadi: " + error.message)
      return
    }
    setPreview(null)
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">Rasm generatsiya</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-soft)]">Matn orqali sun’iy intellekt bilan rasm yarating — natija Supabase’da saqlanadi</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-6 pt-5 lg:grid-cols-[1fr_380px]">
          <form onSubmit={generate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-ink-soft)]">Prompt (rasm tavsifi)</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Masalan: minimalist logotip, ko‘k va oq ranglarda, texnologik uslub"
                className="min-h-28"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--color-ink-soft)]">O‘lcham</label>
              <div className="flex flex-wrap gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      size.key === s.key
                        ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-bg)]"
                        : "border-[var(--color-border)] text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    {s.label} · {s.key}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
            <Button type="submit" variant="accent" disabled={loading} className="w-full">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {loading ? "Yaratilmoqda..." : "Generatsiya qilish"}
            </Button>
          </form>

          <div className="flex items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] p-3" style={{ aspectRatio: `${size.width}/${size.height}` }}>
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2 text-[var(--color-ink-faint)]">
                  <Loader2 size={22} className="animate-spin" />
                  <span className="text-xs">Rasm chizilmoqda...</span>
                </motion.div>
              ) : current ? (
                <motion.img
                  key={current}
                  src={current}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  className="h-full w-full rounded-[var(--radius-md)] object-contain"
                />
              ) : (
                <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-[var(--color-ink-faint)]">
                  Natija shu yerda ko‘rinadi
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">Avvalgi natijalar</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <motion.button
              key={item.id}
              layout
              onClick={() => setPreview(item)}
              className="group relative cursor-pointer overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
              style={{ aspectRatio: `${item.width}/${item.height}` }}
            >
              <img src={item.image_url} alt={item.prompt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            </motion.button>
          ))}
        </div>
        {items.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">Hozircha rasmlar yo‘q.</p>}
      </div>

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)} title="Rasm">
        {preview && (
          <div className="space-y-3">
            <img src={preview.image_url} alt={preview.prompt} className="w-full rounded-[var(--radius-md)]" />
            <p className="text-sm text-[var(--color-ink-soft)]">{preview.prompt}</p>
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-faint)]">
              <span>{formatDate(preview.created_at)}</span>
              <div className="flex gap-2">
                <a href={preview.image_url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline">
                  <Download size={12} /> Yuklab olish
                </a>
                <button onClick={() => remove(preview)} className="inline-flex cursor-pointer items-center gap-1 text-[var(--color-danger)] hover:underline">
                  <Trash2 size={12} /> O‘chirish
                </button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
