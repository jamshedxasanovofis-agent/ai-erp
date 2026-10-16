import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { compressImage } from "@/lib/imageCompress"
import { Dialog } from "@/components/ui/Dialog"
import { Image as ImageIcon, Loader2, Trash2 } from "lucide-react"

type Photo = { id: string; url: string }

export function PhotoGallery({ projectId }: { projectId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<Photo | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const { data } = await supabase
      .from("project_photos")
      .select("id, url")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
    setPhotos((data as Photo[]) ?? [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      for (const file of Array.from(files)) {
        const compressed = await compressImage(file)
        const path = `project-photos/${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.\w+$/, ".jpg")}`
        const { error: upErr } = await supabase.storage.from("attachments").upload(path, compressed, {
          upsert: false, contentType: "image/jpeg",
        })
        if (upErr) continue
        const { data: pub } = supabase.storage.from("attachments").getPublicUrl(path)
        await supabase.from("project_photos").insert({ project_id: projectId, url: pub.publicUrl, uploaded_by: auth.user?.id ?? null })
      }
      await load()
    } finally {
      setUploading(false)
    }
  }

  async function remove(photo: Photo) {
    if (!confirm("Rasmni o'chirishni tasdiqlaysizmi?")) return
    await supabase.from("project_photos").delete().eq("id", photo.id)
    setPreview(null)
    load()
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink-soft)]">
          <ImageIcon size={13} /> Rasmlar
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="cursor-pointer text-xs font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
        >
          {uploading ? <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Yuklanmoqda...</span> : "+ Rasm qo'shish"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = "" }}
        />
      </div>
      {photos.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreview(p)}
              className="h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border)] transition-transform hover:scale-105"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-ink-faint)]">Hozircha rasmlar yo'q</p>
      )}

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        {preview && (
          <div className="space-y-3">
            <img src={preview.url} alt="" className="max-h-[75vh] w-full rounded-[var(--radius-sm)] object-contain" />
            <div className="flex justify-end gap-2">
              <a href={preview.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-accent)] hover:underline">
                Asl o'lchamda ochish
              </a>
              <button
                type="button"
                onClick={() => remove(preview)}
                className="flex cursor-pointer items-center gap-1 text-xs text-[var(--color-danger)] hover:underline"
              >
                <Trash2 size={12} /> O'chirish
              </button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
