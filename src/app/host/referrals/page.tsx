"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";

type ReferralData = {
  eligible: boolean;
  unlocked: boolean;

  foundingHostNumber?: number;

  code?: string;
  referralUrl?: string;

  referralShareRate?: number;
  activationBonusCents?: number;
  payoutThresholdCents?: number;

  activationStatus?: string;

  stats?: {
    referredHosts: number;
    activeReferrals: number;
    activationCreditsCents: number;
    commissionEarningsCents: number;
    accruedEarningsCents: number;
    thresholdReached: boolean;
  };
};

function money(cents: number | undefined) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export default function HostReferralsPage() {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<ReferralData | null>(null);

  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken(true);

        const response = await fetch("/api/host/referrals", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load referrals.");
        }

        setData(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load referrals.",
        );
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function copyReferralLink() {
    if (!data?.referralUrl) {
      return;
    }

    await navigator.clipboard.writeText(data.referralUrl);

    setCopied(true);

    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareReferralLink() {
    if (!data?.referralUrl) {
      return;
    }

    const text =
      "I'm helping build KIVO's neighborhood EV charging network. If you own a Level 2 EV charger, check out becoming a KIVO Host.";

    if (navigator.share) {
      await navigator.share({
        title: "Become a KIVO Host",
        text,
        url: data.referralUrl,
      });

      return;
    }

    await navigator.clipboard.writeText(`${text} ${data.referralUrl}`);

    setCopied(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-lg font-bold text-slate-300">
            Loading your KIVO Referral Partner account...
          </p>
        </div>
      </main>
    );
  }

  if (!auth?.currentUser) {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-16 text-white">
        <div className="mx-auto max-w-xl rounded-[30px] border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-4xl font-black">Sign in to KIVO.</h1>

          <p className="mt-4 leading-7 text-slate-300">
            Your Referral Partner page is connected to your KIVO Host account.
          </p>

          <Link
            href="/login"
            className="mt-7 inline-flex rounded-full bg-emerald-400 px-6 py-3 font-black text-slate-950"
          >
            Sign in →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.20em] text-emerald-400">
              KIVO FOUNDING HOST REFERRALS
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">
              Help build the network.
            </h1>
          </div>

          <Link
            href="/host/home"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-black text-slate-200"
          >
            Host home →
          </Link>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-300/20 bg-red-300/10 p-5 text-red-100">
            {error}
          </div>
        )}

        {data?.eligible && !data.unlocked && (
          <section className="mt-10 rounded-[32px] border border-emerald-300/25 bg-emerald-300/[0.08] p-7 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">
              FOUNDING HOST #{data.foundingHostNumber}
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Your referral benefit is reserved.
            </h2>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              Complete your KIVO Host activation to unlock your personal
              referral link.
            </p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111f] p-6">
              <p className="font-black text-white">Once active:</p>

              <p className="mt-3 leading-7 text-slate-300">
                Earn 15% of KIVO&apos;s commission for life from every Host you
                directly refer. Referred Founding Hosts also earn you a $20
                activation credit when they become fully active.
              </p>
            </div>

            <Link
              href="/host/activation"
              className="mt-7 inline-flex rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950"
            >
              Complete my Host activation →
            </Link>
          </section>
        )}

        {data && !data.eligible && (
          <section className="mt-10 rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
            <h2 className="text-3xl font-black">
              Founding Host Referral Partners
            </h2>

            <p className="mt-4 max-w-3xl leading-7 text-slate-300">
              This benefit is reserved for active KIVO Founding Hosts in the
              first 200.
            </p>
          </section>
        )}

        {data?.eligible && data.unlocked && (
          <>
            <section className="mt-10 rounded-[34px] border border-emerald-300/30 bg-emerald-300/[0.08] p-7 sm:p-10">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-300">
                FOUNDING HOST #{data.foundingHostNumber} · REFERRAL PARTNER
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-5xl">
                Your personal KIVO referral link
              </h2>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                Share this link with EV charger owners you know. Direct
                referrals are permanently attributed to you.
              </p>

              <div className="mt-7 break-all rounded-2xl border border-white/10 bg-[#020817] p-5 font-mono text-emerald-200">
                {data.referralUrl}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void copyReferralLink()}
                  className="rounded-full bg-emerald-400 px-6 py-3 font-black text-slate-950"
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>

                <button
                  type="button"
                  onClick={() => void shareReferralLink()}
                  className="rounded-full border border-white/20 px-6 py-3 font-black text-white"
                >
                  Share →
                </button>
              </div>
            </section>

            <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Hosts referred"
                value={String(data.stats?.referredHosts ?? 0)}
              />

              <Stat
                label="Activated"
                value={String(data.stats?.activeReferrals ?? 0)}
              />

              <Stat
                label="Activation credits"
                value={money(data.stats?.activationCreditsCents)}
              />

              <Stat
                label="Accrued referral earnings"
                value={money(data.stats?.accruedEarningsCents)}
              />
            </section>

            <section className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.04] p-7 sm:p-9">
              <h2 className="text-2xl font-black">
                Your Founding Host referral benefit
              </h2>

              <div className="mt-6 space-y-4 text-base leading-7 text-slate-300">
                <p>
                  <strong className="text-white">
                    15% of KIVO&apos;s commission for life.
                  </strong>{" "}
                  When a Host you directly referred generates KIVO commission,
                  15% of KIVO&apos;s share accrues to you.
                </p>

                <p>
                  <strong className="text-white">
                    $20 Founding Host activation credit.
                  </strong>{" "}
                  While the first-200 Founding Host cohort is being built, you
                  earn a $20 credit when your direct referral becomes fully
                  active.
                </p>

                <p>
                  <strong className="text-white">Direct referrals only.</strong>{" "}
                  No levels, teams, downlines, or second-generation commissions.
                </p>

                <p>
                  Referral earnings accumulate until they reach the current
                  {` ${money(data.payoutThresholdCents)} `}
                  payout threshold. Automated referral payouts will be enabled
                  before paid Driver sessions launch.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
