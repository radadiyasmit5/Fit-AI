import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/database.types";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  needsOnboarding: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    needsOnboarding: false,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) console.log("[fetchProfile] error:", error.message, error.code);
    console.log("[fetchProfile] data:", data);
    return data as Profile | null;
  }, []);

  useEffect(() => {
    // Safety net: if auth doesn't resolve in 5s, stop loading
    const timeout = setTimeout(() => {
      setState((prev) => (prev.isLoading ? { ...prev, isLoading: false } : prev));
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          isLoading: false,
          needsOnboarding: !profile,
        });
      } else {
        setState({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
          needsOnboarding: false,
        });
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const completeOnboarding = useCallback(
    async (profileData: Omit<Profile, "id" | "created_at">) => {
      if (!state.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").upsert({
        id: state.user.id,
        ...profileData,
      });
      if (error) throw error;
      const profile = await fetchProfile(state.user.id);
      setState((prev) => ({ ...prev, profile, needsOnboarding: false }));
    },
    [state.user, fetchProfile]
  );

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    completeOnboarding,
  };
}
