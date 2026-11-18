import "server-only";
import { requireSecret } from "@/lib/env";

export function gcBase() {
  const env = process.env.GOCARDLESS_ENV ?? "sandbox";
  if (!['sandbox','live'].includes(env)) throw new Error("Invalid GOCARDLESS_ENV");
  return env === "live" ? "https://api.gocardless.com" : "https://api-sandbox.gocardless.com";
}

export async function gcRequest<T>(path: string, method: "POST"|"GET", body?: unknown, idempotencyKey?: string): Promise<T> {
  if (gcBase().includes("api.gocardless.com") && process.env.ALLOW_LIVE_COLLECTIONS !== "true") {
    throw new Error("Live GoCardless actions are disabled by ALLOW_LIVE_COLLECTIONS.");
  }
  const response = await fetch(`${gcBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${requireSecret("GOCARDLESS_ACCESS_TOKEN")}`,
      "GoCardless-Version": "2015-07-06",
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GoCardless returned status ${response.status}`);
  return response.json() as Promise<T>;
}

export type RedirectFlow = { redirect_flows: { id: string; redirect_url: string; links?: { mandate: string } } };
export type Payment = { payments: { id: string; status: string } };
