import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireSecret } from "@/lib/env";

export function supabaseAdmin() {
  const { url } = publicEnv();
  const key = requireSecret("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
