"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "admin@kivocharge.com";

export default function AdminHomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setError("Firebase authentication is unavailable.");
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (
        !currentUser ||
        currentUser.email?.toLowerCase() !== ADMIN_EMAIL ||
        !currentUser.emailVerified
      ) {
        setUser(null);
        setAuthReady(true);
        window.location.href = "/admin/login";
        return;
      }

      try {
        await currentUser.getIdToken(true);
        setUser(currentUser);
      } catch (err) {
        console.error("Unable to refresh admin token:", err);
        setError("Unable to verify KIVO admin access.");
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  async function handleSignOut() {
    if (!auth) {
      return;
    }

    await signOut(auth);
    window.location.href = "/admin/login";
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] text-white">
        <p className="text-sm font-semibold text-slate-400">
          Verifying KIVO admin access...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
              KIVO ADMIN
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Operations Control
            </h1>

            <p className="mt-3 max-w-2xl text-base text-slate-400 sm:text-lg">
              Monitor the marketplace and focus only on items that require
              KIVO attention.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="self-start rounded-full border border-white/15 px-6 py-3 text-base font-bold text-slate-200 transition hover:border-white/30 hover:bg-white/[0.06] sm:self-auto"
          >
            Sign out
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        <section>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-500">
            Marketplace Operations
          </p>

          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <Link
              href="/admin/hosts"
              className="group rounded-[30px] border border-emerald-400/20 bg-[#07111f] p-7 transition hover:border-emerald-400/50 hover:bg-[#0a1726]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                    🏠
                  </div>

                  <h2 className="mt-6 text-3xl font-black">
                    Host Operations
                  </h2>

                  <p className="mt-3 max-w-md leading-7 text-slate-400">
                    Active Hosts, activation progress, payout readiness,
                    exceptions and Host support.
                  </p>
                </div>

                <span className="text-2xl text-emerald-400 transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm font-bold text-emerald-300">
                Open Host Control
              </div>
            </Link>

            <Link
              href="/admin/drivers"
              className="group rounded-[30px] border border-cyan-400/20 bg-[#07111f] p-7 transition hover:border-cyan-400/50 hover:bg-[#0a1726]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/10 text-2xl">
                    🚙
                  </div>

                  <h2 className="mt-6 text-3xl font-black">
                    Driver Operations
                  </h2>

                  <p className="mt-3 max-w-md leading-7 text-slate-400">
                    Active Drivers, verification exceptions, account issues
                    and Driver support.
                  </p>
                </div>

                <span className="text-2xl text-cyan-400 transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5 text-sm font-bold text-cyan-300">
                Open Driver Control
              </div>
            </Link>
          </div>
        </section>

        <section className="mt-10 rounded-[26px] border border-white/10 bg-white/[0.03] px-6 py-5">
          <p className="text-sm font-bold text-slate-300">
            Administrative principle
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            KIVO Admin should surface exceptions and decisions — routine
            onboarding should continue automatically without manual Admin work.
          </p>
        </section>
      </div>
    </main>
  );
}
