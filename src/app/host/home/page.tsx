"use client";

import Link from "next/link";
import {
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/context/AuthContext";

export default function HostHomePage() {
  const router =
    useRouter();

  const {
    user,
    loading,
    hasRole,
    accountTypes,
    logout,
  } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(
        "/login"
      );
      return;
    }

    if (!hasRole("host")) {
      router.replace(
        "/account"
      );
    }
  }, [
    loading,
    user,
    hasRole,
    router,
  ]);

  if (
    loading ||
    !user ||
    !hasRole("host")
  ) {
    return (
      <main className="min-h-screen bg-[#020817] text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <p className="text-slate-400">
            Loading KivoHost...
          </p>
        </div>
      </main>
    );
  }

  const dualRole =
    accountTypes.includes("driver");

  return (
    <main className="min-h-screen bg-[#020817] text-white">

      <header className="border-b border-white/10 bg-[#020817]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">

          <Link href="/">
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-16 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            {dualRole && (
              <Link
                href="/driver/home"
                className="rounded-xl border border-cyan-400/30 px-4 py-2 text-sm font-bold text-cyan-300"
              >
                Switch to KivoDriver
              </Link>
            )}

            <Link
              href="/account"
              className="text-sm font-semibold text-slate-300"
            >
              Account
            </Link>

            <button
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
              className="text-sm font-semibold text-slate-500 hover:text-white"
            >
              Sign out
            </button>
          </div>

        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-12">

        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
          KIVOHOST
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Host Home
        </h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          Manage charging requests,
          your listing and your hosting activity.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/[0.06] p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              REQUESTS
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Charging requests
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Review incoming requests
              and manage accepted sessions.
            </p>

            <p className="mt-5 text-xs font-semibold text-slate-500">
              Existing Host request UI will be connected next.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              LISTING
            </p>

            <h2 className="mt-3 text-2xl font-black">
              My listing
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Charger details,
              availability, amenities and pricing.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              HISTORY
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Hosting history
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Completed charging sessions
              and future hosting activity.
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}
