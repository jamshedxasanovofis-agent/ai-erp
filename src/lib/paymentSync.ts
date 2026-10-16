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
  paymentMethod?: string | null
}) {
  const today = new Date().toISOString().slice(0, 10)
  const { error: stageErr } = await supabase.from("payment_stages").update({ status: "tolandi", paid_at: today, payment_method: params.paymentMethod ?? null }).eq("id", params.stageId)
  if (stageErr) {
    alert("To'lov bosqichini yangilab bo'lmadi: " + stageErr.message)
    throw stageErr
  }
  const { error: txErr } = await supabase.from("finance_transactions").insert({
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
    payment_method: params.paymentMethod ?? null,
  })
  if (txErr) {
    alert("Moliyaga tranzaksiya qo'shib bo'lmadi: " + txErr.message)
    throw txErr
  }
}

// Reverses markStagePaid: resets the stage and removes the finance record it
// created, logging the removal so it still shows up in "O'chirilganlar tarixi".
export async function markStageUnpaid(stageId: string) {
  const { error: stageErr } = await supabase.from("payment_stages").update({ status: "kutilmoqda", paid_at: null }).eq("id", stageId)
  if (stageErr) {
    alert("To'lov bosqichini yangilab bo'lmadi: " + stageErr.message)
    throw stageErr
  }
  const { data: txs } = await supabase.from("finance_transactions").select("*").eq("payment_stage_id", stageId)
  for (const tx of txs ?? []) {
    await logDeletion("finance_transaction", tx.id, tx)
    await supabase.from("finance_transactions").delete().eq("id", tx.id)
  }
}
