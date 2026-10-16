// Auto-corrects O'zbek Latin orthography (tutuq belgisi — the o'/g' hard
// sign, common typos) in text typed into the AI Integrator document editors
// (TzDocumentDialog/KpDocumentDialog/SupportDocumentDialog). Called on
// field blur — see src/lib/grammarFix.ts.
// Deploy: supabase functions deploy grammar-fix --no-verify-jwt
// Secrets required: OPENAI_API_KEY
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" }

const SYSTEM_PROMPT = `Sen o'zbek tili (lotin yozuvi) imlo tekshiruvchisisan.
Faqat quyidagilarni tuzat:
- tutuq belgisi (o', g') to'g'ri qo'yilishi kerak bo'lgan joylarda;
- aniq imlo va tinish belgisi xatolari.
Qat'iy qoidalar:
- Ma'no, so'z tanlovi, uslub yoki tuzilishni o'zgartirma.
- Raqamlar, sanalar, nomlar, qisqartmalarni o'zgartirma.
- Faqat tuzatilgan matnni qaytar, hech qanday izoh, tirnoq yoki qo'shimcha matn qo'shma.
- Agar matn bo'sh yoki xato topilmasa, xuddi shu matnni qaytar.`

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS })

  const body = await req.json().catch(() => null)
  const text: string | undefined = body?.text
  if (!text || !text.trim()) {
    return new Response(JSON.stringify({ fixed: text ?? "" }), { headers: JSON_HEADERS })
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    })
    if (!resp.ok) {
      return new Response(JSON.stringify({ fixed: text }), { headers: JSON_HEADERS })
    }
    const json = await resp.json()
    const fixed = json?.choices?.[0]?.message?.content?.trim()
    return new Response(JSON.stringify({ fixed: fixed || text }), { headers: JSON_HEADERS })
  } catch {
    return new Response(JSON.stringify({ fixed: text }), { headers: JSON_HEADERS })
  }
})
