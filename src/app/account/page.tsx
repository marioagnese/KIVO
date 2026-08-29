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

export default function AccountPage() {
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
    if (
      !loading &&
      !user
    ) {
      router.replace(
        "/login"
      );
    }
  }, [
    loading,
    user,
    router,
  ]);

  if (
    loading ||
    !user
  ) {
    return (
      <main className="min-h-screen bg-[#020817] text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
          <p className="text-slate-400">
            Loading your KIVO account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link
            href="/"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-16 w-auto"
            />
          </Link>

          <button
            onClick={async () => {
              await logout();
              router.replace(
                "/"
              );
            }}
            className="text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14">

        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
          MY KIVO
        </p>

        <h1 className="mt-3 text-4xl font-black">
          Welcome back
        </h1>

        <p className="mt-3 text-slate-400">
          {user.email}
        </p>

        {accountTypes.length === 0 && (
          <div className="mt-10 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-7">
            <h2 className="text-xl font-bold">
              Your KIVO account is active.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              This account does not yet have
              KivoDriver or KivoHost access.
              Choose how you want to use KIVO.
            </p>
          </div>
        )}

        <div className="mt-10 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
              KIVODRIVER
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Drive with KIVO
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Find neighborhood chargers,
              manage charging requests,
              and view your trip history.
            </p>

            {hasRole("driver") ? (
              <Link
                href="/driver/home"
                className="mt-7 inline-flex rounded-xl bg-cyan-400 px-5 py-3 font-black text-slate-950"
              >
                Open KivoDriver
              </Link>
            ) : (
              <Link
                href="/driver"
                className="mt-7 inline-flex rounded-xl border border-cyan-300/40 px-5 py-3 font-bold text-cyan-200"
              >
                Become a KivoDriver
              </Link>
            )}
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              KIVOHOST
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Host with KIVO
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Manage charging requests,
              your Host listing,
              and hosting activity.
            </p>

            {hasRole("host") ? (
              <Link
                href="/host/home"
                className="mt-7 inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-black text-slate-950"
              >
                Open KivoHost
              </Link>
            ) : (
              <Link
                href="/host"
                className="mt-7 inline-flex rounded-xl border border-emerald-300/40 px-5 py-3 font-bold text-emerald-200"
              >
                Become a KivoHost
              </Link>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
