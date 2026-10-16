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
  restored_at?: string | null
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

// Which table a given entity_type's JSON snapshot restores back into.
export const ENTITY_TABLE_MAP: Record<string, string> = {
  task: "tasks",
  project: "projects",
  finance_transaction: "finance_transactions",
  demo_request: "demo_requests",
  contract: "contracts",
  meeting: "meetings",
  generated_image: "generated_images",
  payment_stage: "payment_stages",
}

// Archives a snapshot of `row` into entity_field_history, then deletes it from
// `table`. Returns {ok:false, error} instead of throwing so callers can show
// the user WHY a delete failed (RLS / foreign-key constraints) instead of the
// row silently staying put with no feedback.
export async function deleteWithArchive(
  table: string,
  entityType: string,
  id: string,
  row: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  await logDeletion(entityType, id, row)
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// Re-inserts a deletion snapshot back into its table and marks the history
// entry as restored (so it drops out of the "deleted" list but stays as an
// audit trail).
export async function restoreDeleted(entry: FieldHistoryEntry): Promise<{ ok: boolean; error?: string }> {
  const table = ENTITY_TABLE_MAP[entry.entity_type]
  if (!table || !entry.old_value) return { ok: false, error: "Noma'lum turi" }
  const snapshot = JSON.parse(entry.old_value)
  const { error } = await supabase.from(table).insert(snapshot)
  if (error) return { ok: false, error: error.message }
  await supabase.from("entity_field_history").update({ restored_at: new Date().toISOString() }).eq("id", entry.id)
  return { ok: true }
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
    .is("restored_at", null)
    .order("created_at", { ascending: false })
  return (data as FieldHistoryEntry[]) ?? []
}
