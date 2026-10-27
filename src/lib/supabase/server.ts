import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "../server/config";
export async function createSupabaseServer() {
  const { url, key } = supabaseConfig();
  const jar = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Server Components: proxy telah memperbarui cookie. */
        }
      },
    },
  });
}
