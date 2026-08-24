"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Wrong email or password. Try again.");
    } else {
      router.replace("/");
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "#F7F7F7" }}
    >
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <h1 className="wordmark text-3xl">Homebase</h1>
        <p className="mt-1 text-sm font-semibold" style={{ color: "#9090A8" }}>
          Your family&apos;s life OS
        </p>
      </div>

      {/* Login card */}
      <div
        className="w-full max-w-sm rounded-3xl p-7"
        style={{ background: "#C8C0E8" }}
      >
        <p
          className="mb-5 text-xs font-bold uppercase tracking-widest"
          style={{ color: "#302070", opacity: 0.6 }}
        >
          Sign in
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-xs font-bold"
              style={{ color: "#302070" }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
              style={{
                background: "rgba(255,255,255,0.65)",
                color: "#1A1040",
                border: "none",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-xs font-bold"
              style={{ color: "#302070" }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold outline-none"
              style={{
                background: "rgba(255,255,255,0.65)",
                color: "#1A1040",
                border: "none",
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{ background: "#FDE2E1", color: "#B91C1C" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-xl py-3 text-sm font-extrabold transition-opacity disabled:opacity-60"
            style={{ background: "#5040A0", color: "#FFFFFF" }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
