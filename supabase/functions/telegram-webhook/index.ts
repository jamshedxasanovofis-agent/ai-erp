// Telegram bot webhook handler.
// Deploy: supabase functions deploy telegram-webhook
// Set webhook: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<this function's URL>
// Secrets required: TELEGRAM_BOT_TOKEN
import { createClient } from "npm:@supabase/supabase-js@2"

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok")
  const update = await req.json().catch(() => null)
  const message = update?.message
  if (!message?.text) return new Response("ok")

  const chatId = message.chat.id
  const text: string = message.text.trim()

  if (text.startsWith("/start")) {
    const parts = text.split(" ")
    const payload = parts[1]

    if (payload?.startsWith("emp_")) {
      // Employee onboarding deep link: /start emp_<profileId> — sent from the
      // Xodimlar page so the app can capture this employee's chat id for
      // reminders.
      const profileId = payload.slice(4)
      await supabase
        .from("profiles")
        .update({ telegram_chat_id: String(chatId), telegram_username: message.from?.username ?? null })
        .eq("id", profileId)
      await sendMessage(chatId, "✅ Siz botga ulandingiz. Endi uchrashuv eslatmalarini shu yerda olasiz.")
    } else {
      await sendMessage(
        chatId,
        "Salom! Bu AI ERP eslatuv boti. Xodim sifatida ulanish uchun Xodimlar bo'limidagi shaxsiy havolangizdan foydalaning."
      )
    }
    return new Response("ok")
  }

  return new Response("ok")
})
