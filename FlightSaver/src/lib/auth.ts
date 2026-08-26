import { createClient } from './supabase/client';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export function parseSupabaseUser(user: any): AppUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email || '',
    fullName:
      metadata.full_name ||
      metadata.name ||
      user.email?.split('@')[0] ||
      user.email ||
      'Пользователь',
    avatarUrl: metadata.avatar_url || metadata.picture || null,
  };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return parseSupabaseUser(user);
  } catch {
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch {}
}
