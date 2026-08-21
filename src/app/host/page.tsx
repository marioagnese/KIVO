import type { Metadata } from "next";
import Link from "next/link";
import HostEarningsCalculator from "./HostEarningsCalculator";

export const metadata: Metadata = {
  title: "KIVO Host — Put your charger to work.",
  description:
    "Earn from the EV charger you already own. Your charger, your driveway, your rules.",
};

const trustItems = [
  {
    title: "Your schedule",
    text: "Choose exactly when your charger is available.",
  },
  {
    title: "Your driveway",
    text: "Designate the parking space and exterior charging location.",
  },
  {
    title: "Your approval",
    text: "Accept or decline each booking request before access is shared.",
  },
  {
    title: "Your privacy",
    text: "Your exact address stays private until you accept a session.",
  },
];

const steps = [
  {
    number: "1",
    title: "Set availability",
    text: "Choose the days, times and hosting style that work for you.",
  },
  {
    number: "2",
    title: "Approve & share",
    text: "Review requests and share arrival instructions only after you accept.",
  },
  {
    number: "3",
    title: "Driver charges, you earn",
    text: "A driver uses the charger and you unlock value from unused charging capacity.",
  },
];

export default function HostPage() {
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

              <span>Back to KIVO</span>
            </Link>


            <a
              href="#founding-host"
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-full border border-emerald-300/30 bg-emerald-400/[0.08] px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-emerald-300/70 hover:bg-emerald-400/15 sm:h-auto sm:px-5 sm:py-3.5 lg:px-6 lg:text-base"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-5 w-5 text-emerald-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m3 11 9-7 9 7"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 10v9h12v-9"
                />
                <path
                  strokeLinecap="round"
                  d="M12 12v4"
                />
              </svg>

              <span className="hidden sm:inline">
                Become a Founding Host
              </span>

              <span className="sm:hidden">
                Join
              </span>
            </a>

          </nav>

        </div>
      </header>

      {/* =====================================================
          HERO — FULL-SCREEN HOST ACQUISITION
      ====================================================== */}
      <section className="relative min-h-[calc(100vh-92px)] overflow-hidden bg-[#020817] sm:min-h-[calc(100vh-112px)] lg:min-h-[calc(100vh-176px)]">

        <img
          src="/kivo/kivo-host-hero-day.png"
          alt="Private home EV charger and vehicle in a residential driveway"
          className="absolute inset-0 h-full w-full object-cover object-[64%_center]"
        />

        {/* Dark only where copy needs contrast. Leave charger/home bright. */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/96 via-[#020817]/72 via-[32%] to-transparent lg:via-[#020817]/48 lg:via-[42%]" />

        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#020817]/55 to-transparent" />


        <div className="relative mx-auto flex min-h-[calc(100vh-92px)] max-w-[1600px] items-center px-5 py-12 sm:min-h-[calc(100vh-112px)] sm:px-8 lg:min-h-[calc(100vh-176px)] lg:px-12">

          <div className="max-w-[760px]">

            <p className="text-base font-black uppercase tracking-[0.26em] text-emerald-400 lg:text-lg">
              KIVO FOUNDING HOSTS
            </p>


            <h1 className="mt-5 text-[54px] font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-[72px] lg:text-[92px]">
              Your charger
              <br />
              is already there.
              <br />
              <span className="text-emerald-400">
                Put it to work.
              </span>
            </h1>


            <p className="mt-7 max-w-2xl text-[22px] font-medium leading-8 text-white/95 sm:text-[26px] sm:leading-9">
              Earn from your home EV charger on the days and times you choose.
            </p>


            <div className="mt-7 flex flex-col gap-3 text-lg font-semibold text-white sm:flex-row sm:flex-wrap sm:gap-x-8">

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/70 text-sm text-emerald-300">
                  ✓
                </span>
                No home access
              </span>

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/70 text-xs text-emerald-300">
                  ✓
                </span>
                No interaction required
              </span>

              <span className="inline-flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-300/70 text-xs text-emerald-300">
                  ✓
                </span>
                You approve every session
              </span>

            </div>


            <div className="mt-9 flex flex-wrap gap-4">

              <a
                href="#founding-host"
                className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-xl bg-emerald-400 px-8 py-4 text-lg font-black text-slate-950 shadow-[0_12px_35px_rgba(52,211,153,0.28)] transition hover:bg-emerald-300"
              >
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-950 opacity-25" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-slate-950" />
                </span>

                Become a Founding Host

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
              </a>


              <a
                href="#earnings"
                className="inline-flex min-h-[60px] items-center justify-center gap-3 rounded-xl border border-white/35 bg-[#020817]/40 px-8 py-4 text-lg font-bold text-white backdrop-blur-md transition hover:border-emerald-300/70 hover:bg-[#020817]/60"
              >
                See what my charger could earn
              </a>

            </div>


            <p className="mt-7 text-lg font-semibold text-white/85">
              Your driveway. Your charger. Your rules.
            </p>

          </div>


          <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block">
            <a
              href="#earnings"
              aria-label="Scroll to Host earnings"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-[#020817]/25 text-white backdrop-blur-sm transition hover:bg-[#020817]/50"
            >
              ↓
            </a>
          </div>

        </div>
      </section>


      {/* =====================================================
          MONEY — THE FIRST QUESTION A HOST WILL ASK
      ====================================================== */}
      <section
        id="earnings"
        className="bg-[#f8fafc] text-slate-950"
      >
        <div className="mx-auto grid max-w-[1500px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:px-10 lg:py-24">

          <div className="max-w-[580px]">

            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">
              YOUR CHARGER. YOUR EARNINGS.
            </p>

            <h2 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl">
              What could your charger earn?
            </h2>

            <p className="mt-6 text-xl leading-8 text-slate-600">
              Hosting has to be worth it. Start with your charger,
              electricity cost and the number of sessions you would
              realistically consider each month.
            </p>

            <div className="mt-8 space-y-5">

              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                  1
                </span>

                <div>
                  <p className="font-bold text-slate-950">
                    Cover the electricity.
                  </p>

                  <p className="mt-1 leading-6 text-slate-600">
                    Charging should not leave the Host paying the
                    Driver's energy bill.
                  </p>
                </div>
              </div>


              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                  2
                </span>

                <div>
                  <p className="font-bold text-slate-950">
                    Earn for providing access.
                  </p>

                  <p className="mt-1 leading-6 text-slate-600">
                    The value is not just electricity. You are making
                    your charger and parking space available.
                  </p>
                </div>
              </div>


              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">
                  3
                </span>

                <div>
                  <p className="font-bold text-slate-950">
                    You decide if it is worth it.
                  </p>

                  <p className="mt-1 leading-6 text-slate-600">
                    KIVO will show the expected payout before you
                    choose whether to accept a booking.
                  </p>
                </div>
              </div>

            </div>

          </div>


          <HostEarningsCalculator />

        </div>
      </section>


      {/* =====================================================
          CONTROL / PRIVACY
      ====================================================== */}
      <section className="bg-[#020817] text-white">

        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">

          <div className="max-w-3xl">

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">
              YOUR PROPERTY STAYS YOURS
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Hosting does not mean opening your home.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-400">
              A driveway and an exterior charger can be enough. You decide
              when charging is available, where the Driver parks and whether
              you ever interact with them.
            </p>

          </div>


          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {trustItems.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  ✓
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {item.text}
                </p>

              </div>
            ))}

          </div>

        </div>
      </section>


      {/* =====================================================
          HOW IT WORKS
      ====================================================== */}
      <section className="bg-white text-slate-950">

        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">

          <div className="max-w-3xl">

            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              HOW KIVO HOSTING WORKS
            </p>

            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
              Three steps. You stay in control.
            </h2>

          </div>


          <div className="mt-10 grid gap-5 lg:grid-cols-3">

            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-[26px] border border-slate-200 bg-slate-50 p-6 sm:p-7"
              >

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700">
                  {step.number}
                </div>

                <h3 className="mt-5 text-2xl font-black tracking-tight">
                  {step.title}
                </h3>

                <p className="mt-3 text-base leading-7 text-slate-600">
                  {step.text}
                </p>

              </div>
            ))}

          </div>

        </div>
      </section>


      {/* =====================================================
          FOUNDING HOST
      ====================================================== */}
      <section
        id="founding-host"
        className="bg-[#020817] text-white"
      >
        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-r from-[#06101f] via-[#071527] to-[#0a1a22] p-7 shadow-2xl sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
                  BE A FOUNDING HOST
                </p>

                <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                  Help shape the future of neighborhood charging.
                </h2>

                <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                  Early Hosts will help define how KIVO launches and how the Host
                  experience evolves as we build the network.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-bold text-emerald-300">
                    0% Host fee
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    During launch period
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-bold text-emerald-300">
                    Preferred earnings
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Better economics than later Hosts
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-bold text-emerald-300">
                    Priority placement
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Early visibility as markets activate
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="text-sm font-bold text-emerald-300">
                    Founding Host status
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Recognized as part of the first KIVO network
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#host-application"
                className="rounded-xl bg-emerald-400 px-6 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-300"
              >
                Become a Founding Host
              </a>

              <Link
                href="/"
                className="rounded-xl border border-white/15 px-6 py-3.5 font-semibold text-white transition hover:border-white/30"
              >
                Back to KIVO
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          APPLICATION PLACEHOLDER
      ====================================================== */}
      <section id="host-application" className="border-t border-white/[0.07] bg-slate-950">
        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-400">
                FOUNDING HOST APPLICATION
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Could your charger become part of KIVO?
              </h2>

              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">
                Next we will wire this into a real KIVO Host-interest application.
                The goal is to capture qualified charger owners without creating
                a live public listing yet.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#06101f] p-6 sm:p-8">
              <p className="text-sm font-semibold text-white">
                First qualification fields
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  "ZIP / Postal Code",
                  "Email address",
                  "Charger connector",
                  "Parking setup",
                  "Exterior accessibility",
                  "Potential availability",
                  "Desired earnings",
                  "Hosting preferences",
                ].map((field) => (
                  <div
                    key={field}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-300"
                  >
                    {field}
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                No live charger listing is created from this page yet. This step
                is for Host-interest validation and Founding Host recruitment.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
