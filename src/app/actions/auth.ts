"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { fromForm } from "@/lib/format";

const registerSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.email().max(254),
  phone: z.string().min(7).max(40),
  password: z.string().min(12).max(128),
  child_name: z.string().min(2).max(120),
  requested_start: z.iso.date().optional(),
  message: z.string().max(2000),
});

export async function registerParent(form: FormData) {
  const fields = Object.fromEntries(["full_name","email","phone","password","child_name","requested_start","message"].map(k=>[k,fromForm(form,k)]));
  const input = registerSchema.safeParse({ ...fields, requested_start: fields.requested_start || undefined });
  if (!input.success || form.get("consent") !== "yes") redirect("/booking?error=details");
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email: input.data.email,
    password: input.data.password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback?next=/pending`,
      data: { full_name: input.data.full_name, phone: input.data.phone,
        child_name: input.data.child_name, requested_start: input.data.requested_start ?? "",
        message: input.data.message },
    },
  });
  if (error && /rate limit/i.test(error.message)) redirect("/booking?error=try-later");
  // The confirmation screen is intentionally generic to avoid email enumeration.
  redirect("/booking/success");
}

export async function signIn(form: FormData) {
  const email = fromForm(form,"email");
  const password = fromForm(form,"password");
  const admin = form.get("area") === "admin";
  const fallback = admin ? "/admin/login" : "/login";
  if (!z.email().safeParse(email).success || !password) redirect(`${fallback}?error=invalid`);
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({email,password});
  if (error) redirect(`${fallback}?error=invalid`);
  redirect(admin ? "/admin" : "/portal");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
