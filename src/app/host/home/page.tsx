"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import KivoHostShell from "@/components/host/KivoHostShell";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  db,
} from "@/lib/firebase";


export default function HostHomePage() {
  const {
    user,
    loading,
    hasRole,
  } = useAuth();

  const [
    attentionCount,
    setAttentionCount,
  ] = useState(0);

  useEffect(() => {
    if (
      loading ||
      !user ||
      !hasRole("host") ||
      !db
    ) {
      setAttentionCount(0);
      return;
    }

    const requestsQuery =
      query(
        collection(
          db,
          "bookingRequests"
        ),
        where(
          "hostUid",
          "==",
          user.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        requestsQuery,
        (snapshot) => {
          const pendingCount =
            snapshot.docs.filter(
              (document) =>
                document.data()
                  .status ===
                "pending"
            ).length;

          setAttentionCount(
            pendingCount
          );
        },
        (error) => {
          console.error(
            "Unable to load Host attention items:",
            error
          );

          setAttentionCount(0);
        }
      );

    return unsubscribe;
  }, [
    loading,
    user,
    hasRole,
  ]);

  return (
    <KivoHostShell active="home">

      <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-7 sm:pt-10">

        {/* =====================================================
            HOST HOME HERO
        ====================================================== */}

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-6 py-8 shadow-sm sm:px-9 sm:py-10">

          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
            KivoHost
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Your hosting workspace
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Manage charging requests, your charger listing,
            arrival details and your KIVO hosting activity.
          </p>

        </section>


        {/* =====================================================
            NEEDS ATTENTION
        ====================================================== */}

        {attentionCount > 0 && (
          <Link
            href="/host/requests"
            className="mt-6 flex flex-col gap-4 rounded-[26px] border border-amber-200 bg-amber-50 px-6 py-5 shadow-sm transition hover:border-amber-300 hover:bg-amber-100/70 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                🔔
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                    Needs attention
                  </p>

                  <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {attentionCount}
                  </span>
                </div>

                <h2 className="mt-1 text-lg font-black text-slate-950">
                  {attentionCount === 1
                    ? "New charging request"
                    : "New charging requests"}
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  {attentionCount === 1
                    ? "A Driver is waiting for your response."
                    : `${attentionCount} Drivers are waiting for your response.`}
                </p>
              </div>
            </div>

            <span className="shrink-0 text-sm font-black text-amber-800">
              Review requests →
            </span>
          </Link>
        )}


        {/* =====================================================
            PRIMARY HOST ACTIONS
        ====================================================== */}

        <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {/* REQUESTS */}

          <Link
            href="/host/requests"
            className="group rounded-[28px] border border-emerald-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                🔔
              </div>

              <span className="text-xl text-emerald-600 transition group-hover:translate-x-1">
                →
              </span>

            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Requests
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Charging requests
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Review Drivers asking to charge, then accept
              or decline each request.
            </p>

            <p className="mt-5 text-sm font-black text-emerald-700">
              Review requests →
            </p>
          </Link>


          {/* LISTING */}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
              🏡
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Listing
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              My charger
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Charger details, availability, amenities,
              parking and access preferences.
            </p>

            <p className="mt-5 text-xs font-bold text-slate-400">
              Listing management coming next
            </p>

          </div>


          {/* HISTORY */}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-2xl">
              📋
            </div>

            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              History
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Hosting activity
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Completed charging sessions and your
              future KIVO hosting history.
            </p>

            <p className="mt-5 text-xs font-bold text-slate-400">
              History view coming next
            </p>

          </div>

        </section>


        {/* =====================================================
            HOST FLOW
        ====================================================== */}

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            Hosting with KIVO
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            From request to recharge.
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-slate-50 p-5">

              <div className="text-2xl">
                👤
              </div>

              <p className="mt-3 font-black text-slate-950">
                Review
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                See who is requesting access to your charger.
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-5">

              <div className="text-2xl">
                ✅
              </div>

              <p className="mt-3 font-black text-slate-950">
                Accept
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Approve the charging request that works for you.
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-5">

              <div className="text-2xl">
                🔐
              </div>

              <p className="mt-3 font-black text-slate-950">
                Share arrival details
              </p>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Your exact address stays private until you accept.
              </p>

            </div>

          </div>

        </section>

      </div>

    </KivoHostShell>
  );
}
