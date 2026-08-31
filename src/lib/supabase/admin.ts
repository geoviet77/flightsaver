/**
 * FLIGHTSAVER: SUPABASE SERVICE ROLE / ADMIN CLIENT
 * 
 * Серверный клиент с правами Service Role для управления учетными записями
 * (автоматическая регистрация Telegram-пользователей через auth.admin).
 * Секретный ключ никогда не передается на сторону клиента.
 */

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://wdmobwotfitrenvxvbfx.supabase.co';

  // Использование SUPABASE_SERVICE_ROLE_KEY для операций с auth.admin
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_Ec3unvJULowI7TVD0LsLbg_Zay6j';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
