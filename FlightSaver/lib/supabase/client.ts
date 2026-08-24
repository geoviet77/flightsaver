import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://wdmobwotfitrenvxvbfx.supabase.co";

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_Ec3unvJULowI7TVD0LsLbg_Zay6j";

  return createBrowserClient(supabaseUrl, supabaseKey);
}
