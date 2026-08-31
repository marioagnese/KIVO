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

import KivoDriverShell from "@/components/driver/KivoDriverShell";

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
  } = useAuth();

  const [from, setFrom] =
    useState("");

  const [to, setTo] =
    useState("");


  /* =========================================================
     AUTH
  ========================================================= */

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


  /* =========================================================
     DRIVER NAME
  ========================================================= */

  const driverName =
    useMemo(() => {
      if (!user) {
        return "Driver";
      }

      if (user.displayName?.trim()) {
        return user.displayName
          .trim()
          .split(" ")[0];
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


  /* =========================================================
     SEARCH
  ========================================================= */

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


  /* =========================================================
     AUTH LOADING
  ========================================================= */

  if (
    loading ||
    !user ||
    !hasRole("driver")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-slate-950">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
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
    <KivoDriverShell active="home">

      <div className="mx-auto max-w-[1500px] px-5 pb-16 pt-8 sm:px-7 sm:pt-10">


        {/* =====================================================
            HERO
        ====================================================== */}

        <section className="grid overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">

          <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14">

            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">
              KivoDriver
            </p>

            <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-[58px] lg:leading-[1.02]">
              Charge somewhere
              <span className="text-cyan-600">
                {" "}better.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Find neighborhood EV chargers
              along your route — hosted by real
              people in places that feel more
              comfortable than another parking lot.
            </p>

            <p className="mt-4 text-sm font-semibold text-slate-400">
              Welcome back, {driverName}.
            </p>


            {/* ROUTE SEARCH */}

            <form
              onSubmit={startTripSearch}
              className="mt-8 rounded-[26px] border border-slate-200 bg-white p-3 shadow-[0_18px_55px_rgba(15,23,42,0.09)]"
            >

              <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-stretch">

                <label
                  htmlFor="driver-from"
                  className="group flex min-w-0 items-center gap-4 rounded-[19px] bg-slate-50 px-4 py-4 transition focus-within:bg-cyan-50/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">
                      Starting point
                    </span>

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
                      className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
                    />
                  </span>
                </label>


                <label
                  htmlFor="driver-to"
                  className="group flex min-w-0 items-center gap-4 rounded-[19px] bg-slate-50 px-4 py-4 transition focus-within:bg-cyan-50/60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4"
                    >
                      <path d="M12 21s6-5.1 6-11a6 6 0 10-12 0c0 5.9 6 11 6 11z" />
                      <circle
                        cx="12"
                        cy="10"
                        r="2"
                      />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-slate-400">
                      Destination
                    </span>

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
                      className="mt-1 w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
                    />
                  </span>
                </label>


                <button
                  type="submit"
                  className="flex min-h-16 items-center justify-center gap-3 rounded-[19px] bg-cyan-600 px-7 text-sm font-black text-white transition hover:bg-cyan-700"
                >
                  Find chargers

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h14M13 6l6 6-6 6"
                    />
                  </svg>
                </button>

              </div>


              <div className="grid gap-3 border-t border-slate-100 px-2 pb-1 pt-4 sm:grid-cols-3">

                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                    ✓
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Real Hosts
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Neighborhood charging
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    ↗
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Along your route
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Designed around your trip
                    </p>
                  </div>
                </div>


                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                    ⌂
                  </span>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      More human
                    </p>

                    <p className="text-[11px] text-slate-400">
                      Real places. Real hospitality.
                    </p>
                  </div>
                </div>

              </div>

            </form>

          </div>


          {/* HERO IMAGE */}

          <div className="relative hidden min-h-[500px] overflow-hidden bg-slate-100 lg:block">

            <img
              src="/kivo/driver-home-hospitality.webp"
              alt="EV charging at a welcoming neighborhood home"
              className="absolute inset-0 h-full w-full object-cover"
            />

            <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent" />

            <div className="absolute bottom-7 left-7 right-7 rounded-[22px] border border-white/50 bg-white/90 p-5 shadow-xl backdrop-blur-xl">

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                Your Neighborhood Charger
              </p>

              <p className="mt-2 max-w-md text-lg font-black leading-6 text-slate-950">
                Charging can be part of the journey,
                not an interruption to it.
              </p>

            </div>

          </div>

        </section>


        {/* =====================================================
            HOW KIVO WORKS
        ====================================================== */}

        <section className="mt-8 rounded-[30px] border border-slate-200 bg-white px-6 py-7 sm:px-8">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-700">
                How KIVO works
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-950">
                From route to recharge.
              </h2>
            </div>

            <Link
              href="/driver/find"
              className="text-sm font-black text-cyan-700 transition hover:text-cyan-800"
            >
              Start a search →
            </Link>

          </div>


          <div className="mt-7 grid gap-4 md:grid-cols-3">

            {[
              {
                number: "01",
                title: "Find",
                text:
                  "Tell KIVO where you're headed and discover neighborhood chargers along your route.",
              },
              {
                number: "02",
                title: "Request",
                text:
                  "Choose the Host that works for your trip and request a charging time.",
              },
              {
                number: "03",
                title: "Charge",
                text:
                  "Once accepted, KIVO shares the private arrival details you need for your session.",
              },
            ].map((step) => (
              <div
                key={step.number}
                className="rounded-[22px] bg-slate-50 p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-black text-cyan-700 shadow-sm">
                  {step.number}
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-950">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {step.text}
                </p>
              </div>
            ))}

          </div>

        </section>


        {/* =====================================================
            DRIVER LIFE
        ====================================================== */}

        <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1fr_1fr]">

          {/* READY */}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                  Your KivoDriver
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Ready to drive.
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your Driver account is active.
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 font-black text-emerald-700">
                ✓
              </div>

            </div>


            <Link
              href="/driver/profile"
              className="mt-6 flex items-center justify-between rounded-[18px] bg-slate-50 px-4 py-4 transition hover:bg-slate-100"
            >
              <div>
                <p className="text-sm font-black text-slate-900">
                  Driver profile
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Vehicle, connector & preferences
                </p>
              </div>

              <span className="text-slate-400">
                →
              </span>
            </Link>

          </div>


          {/* UPCOMING */}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6">

            <div className="flex items-start justify-between gap-4">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Upcoming charge
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950">
                  Your next KIVO.
                </h2>
              </div>

              <Link
                href="/driver/trips"
                className="text-xs font-black text-cyan-700"
              >
                View trips
              </Link>

            </div>


            <div className="mt-8 rounded-[20px] border border-dashed border-slate-200 px-5 py-7 text-center">

              <p className="font-bold text-slate-700">
                Nothing scheduled yet.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Accepted charging requests will
                appear here.
              </p>

            </div>

          </div>


          {/* WHY KIVO */}

          <div className="rounded-[28px] border border-cyan-100 bg-gradient-to-br from-cyan-50/80 to-emerald-50/50 p-6">

            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
              Why KIVO
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              More than a plug.
            </h2>

            <div className="mt-6 space-y-4">

              <div className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-cyan-700">
                  1
                </span>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    Along your actual route
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Find neighborhood options around
                    the journey you're already taking.
                  </p>
                </div>
              </div>


              <div className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-emerald-700">
                  2
                </span>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    Private Host experience
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Choose based on charger,
                    accessibility and Host amenities.
                  </p>
                </div>
              </div>


              <div className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-amber-700">
                  3
                </span>

                <div>
                  <p className="text-sm font-black text-slate-900">
                    Privacy by design
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-slate-500">
                    Private arrival details stay
                    private until the Host accepts.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            HELP / FAQ
        ====================================================== */}

        <section className="mt-6 flex flex-col gap-5 rounded-[28px] border border-slate-200 bg-white px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              New to KIVO?
            </p>

            <h2 className="mt-2 text-lg font-black text-slate-950">
              Charging somewhere new should still
              feel simple.
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Learn about requests, Host privacy,
              arrival details and what to expect.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/driver/find"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Find a charger
            </Link>

            <Link
              href="/driver/faq"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Driver FAQ
            </Link>

          </div>

        </section>

      </div>

    </KivoDriverShell>
  );
}
