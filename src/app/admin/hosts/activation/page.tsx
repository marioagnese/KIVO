"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import ActivationReadinessQueue from "../ActivationReadinessQueue";

const ADMIN_EMAIL = "admin@kivocharge.com";

export default function HostActivationAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!auth) {
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

      await currentUser.getIdToken(true);
      setUser(currentUser);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  async function handleSignOut() {
    if (!auth) return;

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

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin/hosts"
              className="text-sm font-bold text-emerald-300 hover:text-emerald-200"
            >
              ← Host Operations
            </Link>

            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
              KIVO HOST
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Activation Tools
            </h1>

            <p className="mt-3 max-w-3xl text-base text-slate-400 sm:text-lg">
              Secondary workspace for activation testing, exceptions and final
              marketplace release.
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

        <ActivationReadinessQueue />
      </div>
    </main>
  );
}
