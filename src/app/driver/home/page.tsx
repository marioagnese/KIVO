"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/context/AuthContext";

export default function DriverHomePage() {
  const router =
    useRouter();

  const {
    user,
    loading,
    hasRole,
    accountTypes,
    logout,
  } = useAuth();

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasRole("driver")) {
      router.replace("/account");
    }
  }, [
    loading,
    user,
    hasRole,
    router,
  ]);

  const dualRole =
    accountTypes.includes("host");

  const driverName =
    useMemo(() => {
      if (!user) {
        return "Driver";
      }

      if (user.displayName?.trim()) {
        return user.displayName.trim().split(" ")[0];
      }

      const emailName =
        user.email?.split("@")[0];

      if (!emailName) {
        return "Driver";
      }

      return emailName
        .split(/[._-]/)[0]
        .replace(
          /^./,
          (letter) =>
            letter.toUpperCase()
        );
    }, [user]);

  function startTripSearch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const params =
      new URLSearchParams();

    if (from.trim()) {
      params.set(
        "from",
        from.trim()
      );
    }

    if (to.trim()) {
      params.set(
        "to",
        to.trim()
      );
    }

    const query =
      params.toString();

    router.push(
      query
        ? `/driver/find?${query}`
        : "/driver/find"
    );
  }

  if (
    loading ||
    !user ||
    !hasRole("driver")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050b14] text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
            KivoDriver
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Opening your Driver workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050b14] text-white">

      {/* =====================================================
          KIVODRIVER PRODUCT HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050b14]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-6">

          <Link
            href="/driver/home"
            className="flex items-center gap-3"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-10 w-auto sm:h-12"
            />

            <div className="border-l border-white/10 pl-3">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
                KivoDriver
              </p>

              <p className="hidden text-xs text-slate-500 sm:block">
                Your charging network
              </p>
            </div>
          </Link>


          <div className="flex items-center gap-2">

            {dualRole && (
              <Link
                href="/host/home"
                className="hidden rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/10 sm:inline-flex"
              >
                Switch to KivoHost
              </Link>
            )}

            <Link
              href="/account"
              aria-label="Account"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-black text-slate-200 transition hover:bg-white/[0.08]"
            >
              {driverName
                .slice(0, 1)
                .toUpperCase()}
            </Link>

          </div>
        </div>
      </header>


      {/* =====================================================
          DRIVER HOME
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-5 pb-28 pt-8 sm:px-6 sm:pt-12">

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)] lg:items-start">

          {/* =================================================
              PRIMARY DRIVER ACTION
          ================================================== */}

          <div>

            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
              KivoDriver
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.035em] text-white sm:text-5xl">
              Welcome back, {driverName}.
            </h1>

            <p className="mt-3 max-w-xl text-base leading-7 text-slate-400">
              Where are you headed?
            </p>


            <form
              onSubmit={startTripSearch}
              className="mt-8 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_30px_100px_rgba(0,0,0,0.25)]"
            >

              <div className="relative">

                <div className="absolute bottom-12 left-[31px] top-12 w-px bg-gradient-to-b from-cyan-400/70 to-emerald-400/70" />

                {/* FROM */}

                <div className="relative flex items-center gap-5 border-b border-white/[0.07] px-5 py-5 sm:px-7">

                  <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-cyan-300 bg-[#050b14]">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  </div>

                  <div className="min-w-0 flex-1">

                    <label
                      htmlFor="driver-from"
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
                    >
                      Starting point
                    </label>

                    <input
                      id="driver-from"
                      value={from}
                      onChange={(event) =>
                        setFrom(
                          event.target.value
                        )
                      }
                      placeholder="Current location or city"
                      autoComplete="off"
                      className="mt-1 w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:font-medium placeholder:text-slate-600 sm:text-xl"
                    />

                  </div>
                </div>


                {/* TO */}

                <div className="relative flex items-center gap-5 px-5 py-5 sm:px-7">

                  <div className="relative z-10 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.08)]" />

                  <div className="min-w-0 flex-1">

                    <label
                      htmlFor="driver-to"
                      className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"
                    >
                      Destination
                    </label>

                    <input
                      id="driver-to"
                      value={to}
                      onChange={(event) =>
                        setTo(
                          event.target.value
                        )
                      }
                      placeholder="Where are you going?"
                      autoComplete="off"
                      className="mt-1 w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:font-medium placeholder:text-slate-600 sm:text-xl"
                    />

                  </div>
                </div>

              </div>


              <div className="border-t border-white/[0.07] bg-black/10 p-3">

                <button
                  type="submit"
                  className="flex min-h-14 w-full items-center justify-center gap-3 rounded-[18px] bg-cyan-300 px-6 text-base font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  Find KIVO chargers

                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M13 6l6 6-6 6"
                    />
                  </svg>
                </button>

              </div>

            </form>

          </div>


          {/* =================================================
              DRIVER STATUS
          ================================================== */}

          <aside className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 sm:p-7">

            <div className="flex items-start justify-between gap-5">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Your KivoDriver
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Ready to drive.
                </h2>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-emerald-300">
                ✓
              </div>

            </div>


            <div className="mt-6 border-t border-white/[0.07] pt-5">

              <div className="flex items-center justify-between gap-4">

                <div>
                  <p className="text-sm font-semibold text-white">
                    Booking status
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    KIVO Driver account
                  </p>
                </div>

                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black text-emerald-300">
                  READY
                </span>

              </div>

            </div>


            <Link
              href="/account"
              className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-black/10 px-4 py-4 transition hover:bg-white/[0.04]"
            >
              <div>
                <p className="text-sm font-bold">
                  Driver profile
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Vehicle, connector & account
                </p>
              </div>

              <span className="text-slate-500">
                →
              </span>
            </Link>

          </aside>

        </section>


        {/* =====================================================
            MEMBER ACTIVITY
        ====================================================== */}

        <section className="mt-12 grid gap-5 lg:grid-cols-2">

          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">

            <div className="flex items-center justify-between gap-5">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Upcoming
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Your next charge
                </h2>
              </div>

              <Link
                href="/driver/find"
                className="text-sm font-bold text-cyan-300"
              >
                Find one
              </Link>

            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">

              <p className="font-semibold text-slate-300">
                No charging sessions scheduled.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Your accepted KIVO bookings will appear here.
              </p>

            </div>

          </div>


          <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Recent activity
              </p>

              <h2 className="mt-2 text-xl font-black">
                Your trips
              </h2>
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center">

              <p className="font-semibold text-slate-300">
                Your KIVO history starts here.
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Completed and past charging sessions will appear here.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            SIGN OUT / DUAL ROLE
        ====================================================== */}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] pt-6">

          {dualRole ? (
            <Link
              href="/host/home"
              className="text-sm font-bold text-emerald-300"
            >
              Switch to KivoHost →
            </Link>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={async () => {
              await logout();

              // Stay within the KivoDriver product.
              router.replace("/login");
            }}
            className="text-sm font-semibold text-slate-500 transition hover:text-white"
          >
            Sign out
          </button>

        </div>

      </div>


      {/* =====================================================
          MOBILE KIVODRIVER NAV
      ====================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[#050b14]/95 px-3 py-2 backdrop-blur-xl lg:hidden">

        <div className="mx-auto grid max-w-md grid-cols-3">

          <Link
            href="/driver/home"
            className="rounded-xl px-3 py-2 text-center"
          >
            <p className="text-lg">
              ⌂
            </p>

            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300">
              Home
            </p>
          </Link>


          <Link
            href="/driver/find"
            className="rounded-xl px-3 py-2 text-center"
          >
            <p className="text-lg">
              ⌕
            </p>

            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Find
            </p>
          </Link>


          <Link
            href="/account"
            className="rounded-xl px-3 py-2 text-center"
          >
            <p className="text-lg">
              ◉
            </p>

            <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Profile
            </p>
          </Link>

        </div>

      </nav>

    </main>
  );
}
