'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { UserProfile, getStoredUser, setStoredUser } from '../lib/mockStorage';

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    try {
      const supabase = createClient();

      // 1. Initial check inside try/catch
      supabase.auth.getSession()
        .then(({ data: { session } }) => {
          if (!isMounted) return;
          if (session?.user) {
            const metadata = session.user.user_metadata || {};
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              fullName: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Пользователь',
              avatarUrl: metadata.avatar_url || metadata.picture || '',
              preferredCurrency: 'RUB',
              isAccessibilityMode: false,
            };
            setUser(profile);
            setStoredUser(profile);
          } else {
            setUser(getStoredUser());
          }
          setIsLoading(false);
        })
        .catch(() => {
          if (isMounted) {
            setUser(getStoredUser());
            setIsLoading(false);
          }
        });

      // 2. Real-time auth listener inside try/catch
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!isMounted) return;
        try {
          if (session?.user) {
            const metadata = session.user.user_metadata || {};
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email || '',
              fullName: metadata.full_name || metadata.name || session.user.email?.split('@')[0] || 'Пользователь',
              avatarUrl: metadata.avatar_url || metadata.picture || '',
              preferredCurrency: 'RUB',
              isAccessibilityMode: false,
            };
            setUser(profile);
            setStoredUser(profile);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setStoredUser(null);
          }
        } catch {
          // Gracefully ignore
        }
      });

      return () => {
        isMounted = false;
        try {
          subscription?.unsubscribe();
        } catch {}
      };
    } catch {
      if (isMounted) {
        setUser(getStoredUser());
        setIsLoading(false);
      }
    }
  }, []);

  const logout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setStoredUser(null);
  };

  return { user, setUser, isLoading, logout };
}
