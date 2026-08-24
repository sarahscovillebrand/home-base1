"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

/** Maps a Supabase email to a friendly first name for the greeting. */
export function displayName(user: User): string {
  const email = (user.email ?? "").toLowerCase();
  if (email === "thesarahco@gmail.com" || email.includes("sarah")) return "Sarah";
  if (email === "dhunterscoville@gmail.com" || email.includes("hunter")) return "Hunter";
  // Fall back to the part before the @
  return (user.email ?? "there").split("@")[0];
}

type Props = {
  children: (user: User) => React.ReactNode;
};

/**
 * Wraps a page so it only renders when a user is signed in.
 * If no session exists, redirects to /login.
 * Passes the signed-in User object to children via render-prop.
 */
export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
        setChecking(false);
      }
    });

    // Listen for auth state changes (sign-out from another tab, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "#F7F7F7" }}
      >
        <p className="text-sm font-semibold" style={{ color: "#C8C4D8" }}>
          Loading…
        </p>
      </div>
    );
  }

  if (!user) return null;

  return <>{children(user)}</>;
}
