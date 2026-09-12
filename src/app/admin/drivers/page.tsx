"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import DriverVerificationQueue from "../hosts/DriverVerificationQueue";

const ADMIN_EMAIL = "admin@kivocharge.com";

export default function AdminDriversPage() {
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
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
            >
              ← Admin Home
            </Link>

            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-cyan-400">
              KIVO DRIVER
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Driver Operations
            </h1>

            <p className="mt-3 text-base text-slate-400 sm:text-lg">
              Monitor Driver verification exceptions and account issues that
              require KIVO attention.
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

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Active Drivers
            </p>
            <p className="mt-3 text-3xl font-black">—</p>
            <p className="mt-1 text-sm text-slate-500">
              Summary counter coming next
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              Needs Attention
            </p>
            <p className="mt-3 text-3xl font-black">—</p>
            <p className="mt-1 text-sm text-slate-500">
              Only Driver exceptions should appear here
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Verification
            </p>
            <p className="mt-3 text-3xl font-black">Live</p>
            <p className="mt-1 text-sm text-slate-500">
              Current verification bridge retained
            </p>
          </div>
        </section>

        <DriverVerificationQueue />
      </div>
    </main>
  );
}
