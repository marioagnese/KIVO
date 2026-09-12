"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";

import { auth } from "@/lib/firebase";
import OnboardingReviewQueue from "../OnboardingReviewQueue";

const ADMIN_EMAIL = "admin@kivocharge.com";

export default function HostApplicationsAdminPage() {
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
              Applications & Review
            </h1>

            <p className="mt-3 max-w-3xl text-base text-slate-400 sm:text-lg">
              Secondary review workspace for onboarding records, exceptions
              and development testing. This is not the primary Host control
              page.
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

        <div className="mb-8 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] px-5 py-4">
          <p className="text-sm font-bold text-amber-200">
            Secondary / development workspace
          </p>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            Routine Host onboarding should become automatic. Use this page
            only when KIVO needs to inspect or intervene in an onboarding
            record.
          </p>
        </div>

        <OnboardingReviewQueue />
      </div>
    </main>
  );
}
