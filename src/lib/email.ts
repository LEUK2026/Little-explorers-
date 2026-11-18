import "server-only";
import { requireSecret } from "@/lib/env";
import { escapeHtml } from "@/lib/format";

export async function sendEmail(options: {to: string; subject: string; body: string; idempotencyKey?: string}) {
  const key = requireSecret("RESEND_API_KEY");
  const from = requireSecret("RESEND_FROM");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: JSON.stringify({ from, to: [options.to], subject: options.subject,
      html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#18352a"><h1>Little Explorers</h1><p>${escapeHtml(options.body).replace(/\n/g, "<br>")}</p><p>Warm wishes,<br>Little Explorers</p></main>` }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Email provider returned status ${response.status}`);
  return response.json();
}
