import React from "react";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import type {
  CompanyProfile,
  Me,
  UpdateCompanyProfileRequest,
} from "@workspace/api-zod";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: Session["user"] | null;
  me: Me | null;
  profile: Me["profile"] | null;
  workspace: Me["workspace"] | null;
  companyProfile: CompanyProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshMe: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{
    hasSession: boolean;
    needsEmailConfirmation: boolean;
  }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateCompanyProfile: (
    updates: UpdateCompanyProfileRequest,
  ) => Promise<CompanyProfile>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = React.useState(true);

  React.useEffect(() => {
    setAuthTokenGetter(async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      return activeSession?.access_token ?? null;
    });

    return () => {
      setAuthTokenGetter(null);
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Failed to load Supabase session", error);
      }

      setSession(data.session ?? null);
      setIsSessionLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsSessionLoading(false);

      if (!nextSession) {
        queryClient.removeQueries({ queryKey: ["me"] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ["me"] });
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const [key] = query.queryKey;
            return (
              key === "proposals" ||
              key === "proposal" ||
              key === "templates" ||
              key === "template"
            );
          },
        });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
    enabled: Boolean(session),
    staleTime: 30_000,
  });

  React.useEffect(() => {
    if (!session || !meQuery.error) {
      return;
    }

    const message =
      meQuery.error instanceof Error ? meQuery.error.message : String(meQuery.error);

    if (
      message.includes("401") ||
      message.includes("Authentication required") ||
      message.includes("Invalid or expired session")
    ) {
      void supabase.auth.signOut();
    }
  }, [meQuery.error, session]);

  const refreshMe = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signUp = React.useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      hasSession: Boolean(data.session),
      needsEmailConfirmation: !data.session,
    };
  }, []);

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }

    queryClient.clear();
  }, [queryClient]);

  const resetPassword = React.useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    if (error) {
      throw error;
    }
  }, []);

  const updateCompanyProfile = React.useCallback(
    async (updates: UpdateCompanyProfileRequest) => {
      const nextCompanyProfile = await api.updateCompanyProfile(updates);

      queryClient.setQueryData<Me | undefined>(["me"], (current) =>
        current
          ? {
              ...current,
              companyProfile: nextCompanyProfile,
            }
          : current,
      );

      return nextCompanyProfile;
    },
    [queryClient],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      me: meQuery.data ?? null,
      profile: meQuery.data?.profile ?? null,
      workspace: meQuery.data?.workspace ?? null,
      companyProfile: meQuery.data?.companyProfile ?? null,
      isAuthenticated: Boolean(session),
      isLoading:
        isSessionLoading || (Boolean(session) && meQuery.isLoading),
      refreshMe,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updateCompanyProfile,
    }),
    [
      isSessionLoading,
      meQuery.data,
      meQuery.isLoading,
      refreshMe,
      resetPassword,
      session,
      signIn,
      signOut,
      signUp,
      updateCompanyProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
