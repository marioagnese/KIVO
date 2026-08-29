"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

export default function DriverLandingPage() {
  const router = useRouter();

  const {
    user,
    hasRole,
  } = useAuth();

  function continueAsDriver() {
    if (user && hasRole("driver")) {
      router.push("/driver/home");
      return;
    }

    if (user) {
      router.push("/driver/setup");
      return;
    }

    router.push("/driver/signup");
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020817]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[92px] max-w-[1600px] items-center justify-between px-3 sm:h-[112px] sm:px-6 lg:h-[176px] lg:px-12">

          <Link
            href="/"
            className="shrink-0"
            aria-label="Back to KIVO"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO — Your Neighborhood Charger"
              className="h-[72px] w-auto object-contain sm:h-[96px] lg:h-[184px]"
            />
          </Link>

          <nav className="flex shrink-0 items-center gap-2 lg:gap-4">

            <Link
              href="/"
              className="group hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/70 hover:bg-cyan-400/10 sm:inline-flex lg:px-6 lg:text-base"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-5 w-5 text-cyan-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 12h16M10 6l-6 6 6 6"
                />
              </svg>

              <span>
                Back to KIVO
              </span>
            </Link>

            <Link
              href="/driver/faq"
              className="group hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/60 hover:bg-cyan-400/10 sm:inline-flex lg:px-6 lg:text-base"
            >
              Driver FAQ
            </Link>

            <button
              type="button"
              onClick={continueAsDriver}
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-full border border-cyan-300/30 bg-cyan-400/[0.08] px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/70 hover:bg-cyan-400/15 sm:h-auto sm:px-5 sm:py-3.5 lg:px-6 lg:text-base"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-5 w-5 text-cyan-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 16h14l-1.4-5.1A2.6 2.6 0 0 0 15.1 9H8.9a2.6 2.6 0 0 0-2.5 1.9L5 16Z"
                />
                <path
                  strokeLinecap="round"
                  d="M4 16v2.5M20 16v2.5"
                />
                <circle
                  cx="7.5"
                  cy="16"
                  r="1.2"
                />
                <circle
                  cx="16.5"
                  cy="16"
                  r="1.2"
                />
              </svg>

              <span className="hidden sm:inline">
                {user && hasRole("driver")
                  ? "Open KivoDriver"
                  : "Become a KivoDriver"}
              </span>

              <span className="sm:hidden">
                Join
              </span>
            </button>

          </nav>

        </div>
      </header>


      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="relative min-h-[calc(100vh-92px)] overflow-hidden bg-[#020817] sm:min-h-[calc(100vh-112px)] lg:min-h-[calc(100vh-176px)]">

        <img
          src="/kivo/kivo-driver-hero-day.png"
          alt="Electric vehicle arriving for a private neighborhood charging stop"
          className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/98 via-[#020817]/82 via-[38%] to-[#020817]/10 lg:via-[#020817]/58 lg:via-[48%]" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020817]/70 to-transparent" />

        <div className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-[1600px] items-center px-5 py-12 sm:min-h-[calc(100vh-112px)] sm:px-8 lg:min-h-[calc(100vh-176px)] lg:px-12">

          <div className="max-w-[770px]">

            <p className="text-base font-black uppercase tracking-[0.26em] text-cyan-300 lg:text-lg">
              KIVODRIVER
            </p>

            <h1 className="mt-5 text-[54px] font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-[72px] lg:text-[92px]">
              Charge
              <br />
              somewhere
              <br />
              <span className="text-cyan-300">
                better.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-[21px] font-medium leading-8 text-white/95 sm:text-[25px] sm:leading-9">
              Find private EV chargers hosted by people
              along your route — with more convenience,
              comfort and confidence.
            </p>

            <div className="mt-7 flex flex-col gap-3 text-base font-semibold text-white sm:flex-row sm:flex-wrap sm:gap-x-7 lg:text-lg">

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/70 text-sm text-cyan-300">
                  ✓
                </span>
                Private & local
              </span>

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/70 text-sm text-cyan-300">
                  ✓
                </span>
                Verified marketplace
              </span>

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/70 text-sm text-cyan-300">
                  ✓
                </span>
                Host address stays private until accepted
              </span>

            </div>

            <div className="mt-9 flex flex-wrap gap-4">

              <button
                type="button"
                onClick={continueAsDriver}
                className="inline-flex items-center gap-3 rounded-xl bg-cyan-400 px-7 py-4 text-base font-black text-slate-950 shadow-xl transition hover:bg-cyan-300"
              >
                <span>
                  {user && hasRole("driver")
                    ? "Open KivoDriver"
                    : "Become a KivoDriver"}
                </span>

                <span>
                  →
                </span>
              </button>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-white/30 bg-black/25 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
              >
                Find chargers
              </Link>

            </div>

            <p className="mt-6 text-sm font-medium text-white/70">
              One KIVO account can be both a Driver and a Host.
            </p>

          </div>
        </div>

      </section>


      {/* =====================================================
          HOW KIVO WORKS
      ====================================================== */}

      <section className="border-t border-white/10 bg-[#020817]">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-12 lg:py-28">

          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
              The KIVO Experience
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              From route search to charging stop.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              KIVO helps you find compatible private charging
              options without publicly exposing a Host's home
              or private arrival details.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">

            <ExperienceStep
              number="01"
              title="Find a charger"
              text="Enter where you're going and discover KIVO Hosts near your route."
            />

            <ExperienceStep
              number="02"
              title="Request your stop"
              text="Choose based on charger compatibility, location, amenities and availability."
            />

            <ExperienceStep
              number="03"
              title="Charge with confidence"
              text="Once your Host accepts, KIVO releases the private arrival information needed for your session."
            />

          </div>
        </div>
      </section>


      {/* =====================================================
          TRUST
      ====================================================== */}

      <section className="border-t border-white/10 bg-slate-950/70">
        <div className="mx-auto max-w-[1400px] px-6 py-20 lg:px-12">

          <div className="grid gap-6 md:grid-cols-3">

            <Feature
              title="Private & local"
              text="Discover neighborhood charging options beyond the traditional public charging network."
            />

            <Feature
              title="Host-controlled"
              text="Hosts control their availability and approve charging requests before private access information is released."
            />

            <Feature
              title="Built around trust"
              text="KIVO is designed around verified participants, clear expectations and marketplace history."
            />

          </div>

          <div className="mt-16 rounded-3xl border border-cyan-300/15 bg-gradient-to-br from-cyan-400/[0.08] to-emerald-400/[0.05] p-8 sm:p-10">

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Safety & privacy
            </p>

            <h2 className="mt-4 text-3xl font-bold">
              Built around trust.
            </h2>

            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              KIVO is designed to verify Drivers and Hosts
              before real marketplace activity. A Host's exact
              address and private arrival instructions are not
              publicly displayed. They are shared only when
              appropriate for an authorized charging session.
            </p>

          </div>

          <div className="py-20 text-center">

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">
              Ready to drive with KIVO?
            </p>

            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">
              Your next charging stop could feel a lot more like home.
            </h2>

            <button
              type="button"
              onClick={continueAsDriver}
              className="mt-8 rounded-full bg-cyan-400 px-8 py-4 font-bold text-slate-950 transition hover:bg-cyan-300"
            >
              {user && hasRole("driver")
                ? "Open KivoDriver"
                : "Create my KivoDriver account"}
              {" "}→
            </button>

          </div>
        </div>
      </section>


    </main>
  );
}


function ExperienceStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-cyan-300/15 bg-slate-900/60 p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-xs font-black text-cyan-300">
        {number}
      </div>

      <h3 className="mt-6 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-slate-400">
        {text}
      </p>
    </div>
  );
}


function Feature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300">
        ✓
      </div>

      <h3 className="text-lg font-bold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {text}
      </p>
    </div>
  );
}
