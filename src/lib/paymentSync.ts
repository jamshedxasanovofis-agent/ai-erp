import { supabase } from "@/lib/supabase"
import { logDeletion } from "@/lib/history"

// Shared logic for "mark a payment stage as paid/unpaid", used by both the
// Projects payment-stage checkbox (live, per-checkbox) and the Finance
// "To'landi deb belgilash" button — keeps the finance_transactions insert in
// exactly one place instead of two drifting copies.
export async function markStagePaid(params: {
  stageId: string
  contractId: string
  projectId: string | null
  title: string
  amount: number
  receiptUrl?: string | null
  note?: string | null
  exchangeRate?: number | null
}) {
  const today = new Date().toISOString().slice(0, 10)
  await supabase.from("payment_stages").update({ status: "tolandi", paid_at: today }).eq("id", params.stageId)
  await supabase.from("finance_transactions").insert({
    type: "kirim",
    category: params.title,
    amount: params.amount,
    occurred_on: today,
    project_id: params.projectId,
    contract_id: params.contractId,
    payment_stage_id: params.stageId,
    receipt_url: params.receiptUrl ?? null,
    description: params.note ?? null,
    exchange_rate: params.exchangeRate ?? null,
  })
}

// Reverses markStagePaid: resets the stage and removes the finance record it
// created, logging the removal so it still shows up in "O'chirilganlar tarixi".
export async function markStageUnpaid(stageId: string) {
  await supabase.from("payment_stages").update({ status: "kutilmoqda", paid_at: null }).eq("id", stageId)
  const { data: txs } = await supabase.from("finance_transactions").select("*").eq("payment_stage_id", stageId)
  for (const tx of txs ?? []) {
    await logDeletion("finance_transaction", tx.id, tx)
    await supabase.from("finance_transactions").delete().eq("id", tx.id)
  }
}
