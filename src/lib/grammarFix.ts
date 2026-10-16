import { supabase } from "@/lib/supabase"

// Auto-corrects O'zbek Latin orthography (tutuq belgisi — o'/g' hard sign,
// common typos) via the grammar-fix Edge Function. Called on field blur in
// the AI Integrator document editors; the OpenAI key lives server-side only.
export async function fixUzbekGrammar(text: string): Promise<string> {
  const trimmed = text.trim()
  // Skip pure numbers/dates/percentages and trivially short values — nothing
  // for an orthography pass to fix, not worth the round-trip.
  if (!trimmed || trimmed.length < 3 || !/[a-zA-Z]/.test(trimmed)) return text
  try {
    const { data, error } = await supabase.functions.invoke<{ fixed: string }>("grammar-fix", { body: { text } })
    if (error || !data?.fixed) return text
    return data.fixed
  } catch {
    return text
  }
}

// Recursively walks a document's data object (plain strings, string[], and
// arrays of {label: string} row objects — the shape of TzData/KpData/
// SupportData) and runs every leaf string through fixUzbekGrammar in
// parallel. Used by the "Barchasini tuzatish" button — a one-shot pass over
// an already-saved draft, as opposed to the per-field auto-fix on blur.
export async function fixAllStringsDeep<T>(value: T): Promise<T> {
  if (typeof value === "string") {
    return (await fixUzbekGrammar(value)) as unknown as T
  }
  if (Array.isArray(value)) {
    return (await Promise.all(value.map((v) => fixAllStringsDeep(v)))) as unknown as T
  }
  if (value && typeof value === "object") {
    const entries = await Promise.all(
      Object.entries(value as Record<string, unknown>).map(async ([k, v]) => [k, await fixAllStringsDeep(v)] as const)
    )
    return Object.fromEntries(entries) as T
  }
  return value
}
