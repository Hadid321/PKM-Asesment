"use client";
import { createBrowserClient } from "@supabase/ssr";
export function createSupabaseBrowser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Konfigurasi Supabase belum tersedia.");
  return createBrowserClient(url, key);
}
