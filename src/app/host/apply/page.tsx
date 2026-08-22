import type { Metadata } from "next";
import Link from "next/link";

import FoundingHostApplication from "../FoundingHostApplication";

export const metadata: Metadata = {
  title: "Become a KIVO Founding Host",
  description:
    "Join the first KIVO neighborhood charging Hosts.",
};

export default function FoundingHostApplyPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb]">

      <header className="border-b border-white/10 bg-[#020817]">
        <div className="mx-auto flex h-[92px] max-w-[1600px] items-center justify-between px-3 sm:h-[112px] sm:px-6 lg:h-[176px] lg:px-12">

          <Link
            href="/"
            aria-label="KIVO home"
            className="shrink-0"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-[72px] w-auto object-contain sm:h-[96px] lg:h-[184px]"
            />
          </Link>

          <Link
            href="/host"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition hover:border-white/30 sm:px-5 sm:text-base"
          >
            <span aria-hidden="true">←</span>
            About hosting
          </Link>

        </div>
      </header>


      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:px-10 lg:py-20">

        <div className="max-w-xl">

          <p className="text-sm font-black uppercase tracking-[0.20em] text-emerald-700">
            KIVO FOUNDING HOSTS
          </p>

          <h1 className="mt-5 text-5xl font-black leading-[0.98] tracking-tight text-slate-950 sm:text-6xl">
            Be one of the first.
          </h1>

          <p className="mt-7 text-xl leading-9 text-slate-600">
            We&apos;re building the first KIVO Host network and
            looking for EV charger owners who want to help shape
            it.
          </p>


          <div className="mt-8 space-y-4">

            <div className="flex items-start gap-4 text-lg leading-7 text-slate-700">
              <span className="font-black text-emerald-600">
                ✓
              </span>
              No public listing today.
            </div>

            <div className="flex items-start gap-4 text-lg leading-7 text-slate-700">
              <span className="font-black text-emerald-600">
                ✓
              </span>
              No commitment to Host.
            </div>

            <div className="flex items-start gap-4 text-lg leading-7 text-slate-700">
              <span className="font-black text-emerald-600">
                ✓
              </span>
              Full charger setup comes later.
            </div>

          </div>


          <div className="mt-9 rounded-2xl border border-slate-200 bg-white p-6">

            <p className="text-lg font-black text-slate-950">
              Why are we asking so little?
            </p>

            <p className="mt-3 text-lg leading-8 text-slate-600">
              This first step is simply to understand who is
              interested and where potential KIVO Hosts are
              located. Detailed charger, access and property
              information comes only if you decide to continue.
            </p>

          </div>

        </div>


        <FoundingHostApplication />

      </section>

    </main>
  );
}
