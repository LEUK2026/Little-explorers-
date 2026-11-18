export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || url.includes("YOUR_PROJECT") || key.includes("YOUR_PUBLISHABLE")) {
    throw new Error("Configure Supabase in .env.local before using accounts.");
  }
  return { url, key };
}

export function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith("YOUR_")) throw new Error(`${name} is not configured.`);
  return value;
}

export function appUrl(): string {
  const url = requireSecret("APP_URL");
  if (!/^https:\/\//.test(url) && !/^http:\/\/localhost(:\d+)?$/.test(url)) {
    throw new Error("APP_URL must use HTTPS outside localhost.");
  }
  return url.replace(/\/$/, "");
}
