import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

export async function supabaseServer() {
  const cookieStore = await cookies();
  const { url, key } = publicEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(toSet) {
        try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot write; proxy refreshes cookies. */ }
      },
    },
  });
}
