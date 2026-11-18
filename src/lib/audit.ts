import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function audit(actorId: string | null, action: string, targetId: string) {
  const { error } = await supabaseAdmin().from("audit_logs").insert({ actor_id: actorId, action, target_id: targetId });
  if (error) throw new Error("Could not record required audit log");
}
