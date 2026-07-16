import { supabase } from "@/lib/supabase"

export type FieldHistoryEntry = {
  id: string
  entity_type: string
  entity_id: string
  field_key: string
  field_label: string | null
  old_value: string | null
  new_value: string | null
  changed_by: string | null
  created_at: string
}

function toComparable(v: unknown) {
  if (v === undefined || v === null || v === "") return null
  return String(v)
}

export async function logFieldChanges(
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string> = {}
) {
  const rows: Omit<FieldHistoryEntry, "id" | "created_at" | "changed_by">[] = []
  for (const key of Object.keys(after)) {
    const oldVal = toComparable(before[key])
    const newVal = toComparable(after[key])
    if (oldVal === newVal) continue
    rows.push({
      entity_type: entityType,
      entity_id: entityId,
      field_key: key,
      field_label: labels[key] ?? key,
      old_value: oldVal,
      new_value: newVal,
    })
  }
  if (rows.length === 0) return
  await supabase.from("entity_field_history").insert(rows)
}

export async function logDeletion(entityType: string, entityId: string, snapshot: Record<string, unknown>) {
  await supabase.from("entity_field_history").insert({
    entity_type: entityType,
    entity_id: entityId,
    field_key: "__deleted__",
    field_label: "O'chirildi",
    old_value: JSON.stringify(snapshot),
    new_value: null,
  })
}

export async function fetchFieldHistory(entityType: string, entityId: string): Promise<FieldHistoryEntry[]> {
  const { data } = await supabase
    .from("entity_field_history")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
  return (data as FieldHistoryEntry[]) ?? []
}

export async function fetchDeletionHistory(entityType: string): Promise<FieldHistoryEntry[]> {
  const { data } = await supabase
    .from("entity_field_history")
    .select("*")
    .eq("entity_type", entityType)
    .eq("field_key", "__deleted__")
    .order("created_at", { ascending: false })
  return (data as FieldHistoryEntry[]) ?? []
}
