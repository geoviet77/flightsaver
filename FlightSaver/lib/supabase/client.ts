import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://wdmobwotfitrenvxvbfx.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_Ec3unvJULowI7TVD0LsLbg_Zay6j";

export function createClient() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('http')) {
    supabaseUrl = DEFAULT_SUPABASE_URL;
  }

  if (!supabaseKey || typeof supabaseKey !== 'string') {
    supabaseKey = DEFAULT_SUPABASE_KEY;
  }

  return createBrowserClient(supabaseUrl.trim(), supabaseKey.trim(), {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
    },
  });
}
