import "server-only";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function currentUser() {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}

export async function requireParent() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("id,full_name,approved,role,email").eq("id", user.id).single();
  if (!profile || profile.role !== "parent" || !profile.approved) redirect("/pending");
  return { user, profile, supabase };
}

export async function requireAdmin(requireMfa = true) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("id,full_name,role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/unauthorised");
  if (requireMfa) {
    const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || aal?.currentLevel !== "aal2") redirect("/admin/setup-mfa");
  }
  return { user, profile, supabase };
}

export function safeReturnPath(path: string | null, fallback: string): string {
  return path && /^\/(?!\/)[a-zA-Z0-9/_-]*$/.test(path) ? path : fallback;
}
