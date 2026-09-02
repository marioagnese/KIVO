"use client";

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

import {
  getDownloadURL,
  ref,
} from "firebase/storage";

import {
  db,
  storage,
} from "@/lib/firebase";

import {
  useAuth,
} from "@/context/AuthContext";

import KivoHostShell from "@/components/host/KivoHostShell";


type HistoryStatus =
  | "completed"
  | "declined";


type HostHistoryBooking = {
  id: string;

  status: HistoryStatus;

  driverUid: string;

  requestedDate: string;

  requestedTime: string;

  vehicleConnector: string;

  charger: string;

  hostArea: string;

  settlementStatus?:
    | "processing"
    | "transferred"
    | "failed";

  settlement?: {
    grossAmount?: number;
    commissionRate?: number;
    commissionAmount?: number;
    hostAmount?: number;
    currency?: string;
    foundingHost?: boolean;
  };

  route?: {
    from?: string;
    to?: string;
    miles?: number | null;
    hours?: number | null;
  };
};


type DriverMarketplaceProfile = {
  uid: string;
  publicAlias: string;
  homeArea: string;
  vehicle: string;
  connector: string;
  photoPath: string;
  photoUrl: string;
  verified: boolean;
};


function normalizeCharger(
  value: unknown
) {
  if (!value) {
    return "";
  }

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "object"
  ) {
    const charger =
      value as Record<
        string,
        unknown
      >;

    const parts = [
      charger.level,
      charger.connector,
      charger.speed ??
        charger.power,
    ]
      .map((part) =>
        String(
          part ?? ""
        ).trim()
      )
      .filter(Boolean);

    if (
      parts.length > 0
    ) {
      return parts.join(
        " · "
      );
    }
  }

  return "";
}


function formatRequestedDate(
  value: string
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  if (
    date.getUTCFullYear() !==
      year ||
    date.getUTCMonth() !==
      month - 1 ||
    date.getUTCDate() !==
      day
  ) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }
  );
}


export default function HostHistoryPage() {
  const {
    user,
    loading,
    hasRole,
  } = useAuth();


  const [
    history,
    setHistory,
  ] =
    useState<
      HostHistoryBooking[]
    >([]);


  const [
    driverProfiles,
    setDriverProfiles,
  ] =
    useState<
      Record<
        string,
        DriverMarketplaceProfile
      >
    >({});


  const [
    historyLoading,
    setHistoryLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState("");

  const [
    retryingId,
    setRetryingId,
  ] =
    useState<string | null>(
      null
    );

  const [
    settlementMessage,
    setSettlementMessage,
  ] =
    useState("");


  /* =========================================================
     HOST HISTORY
  ========================================================= */

  useEffect(() => {
    if (
      loading ||
      !user ||
      !hasRole("host") ||
      !db
    ) {
      return;
    }

    const historyQuery =
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
        historyQuery,

        (snapshot) => {
          const nextHistory =
            snapshot.docs
              .map(
                (
                  documentSnapshot
                ) => {
                  const data =
                    documentSnapshot.data();

                  return {
                    id:
                      documentSnapshot.id,

                    status:
                      data.status,

                    driverUid:
                      data.driverUid ||
                      "",

                    requestedDate:
                      data.requestedDate ||
                      "",

                    requestedTime:
                      data.requestedTime ||
                      "",

                    vehicleConnector:
                      data.vehicleConnector ||
                      "",

                    charger:
                      normalizeCharger(
                        data.charger
                      ),

                    hostArea:
                      data.hostArea ||
                      "",

                    settlementStatus:
                      data.settlementStatus,

                    settlement:
                      data.settlement &&
                      typeof data.settlement ===
                        "object"
                        ? data.settlement
                        : undefined,

                    route:
                      data.route ||
                      {},
                  } as HostHistoryBooking;
                }
              )
              .filter(
                (booking) =>
                  booking.status ===
                    "completed" ||
                  booking.status ===
                    "declined"
              );

          setHistory(
            nextHistory
          );

          setHistoryLoading(
            false
          );
        },

        (snapshotError) => {
          console.error(
            "Failed to load Host history:",
            snapshotError
          );

          setError(
            "KIVO could not load your hosting history."
          );

          setHistoryLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [
    loading,
    user,
    hasRole,
  ]);


  /* =========================================================
     DRIVER MARKETPLACE IDENTITIES
  ========================================================= */

  useEffect(() => {
    if (
      loading ||
      !user ||
      !hasRole("host") ||
      history.length === 0
    ) {
      return;
    }

    let cancelled =
      false;

    async function loadProfiles() {
      if (!user) {
        return;
      }

      const uniqueDriverUids =
        Array.from(
          new Set(
            history
              .map(
                (booking) =>
                  booking.driverUid
              )
              .filter(Boolean)
          )
        );

      const idToken =
        await user.getIdToken();

      const loaded:
        Record<
          string,
          DriverMarketplaceProfile
        > = {};

      await Promise.all(
        uniqueDriverUids.map(
          async (
            driverUid
          ) => {
            try {
              const response =
                await fetch(
                  "/api/host/driver-profile",
                  {
                    method:
                      "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      Authorization:
                        `Bearer ${idToken}`,
                    },

                    body:
                      JSON.stringify({
                        driverUid,
                      }),
                  }
                );

              if (
                !response.ok
              ) {
                return;
              }

              const data =
                await response.json();

              const profile =
                data.profile ??
                data.driver ??
                data;

              let photoUrl =
                "";

              const photoPath =
                String(
                  profile.photoPath ??
                    ""
                ).trim();

              if (
                photoPath &&
                storage
              ) {
                try {
                  photoUrl =
                    await getDownloadURL(
                      ref(
                        storage,
                        photoPath
                      )
                    );
                } catch {
                  photoUrl =
                    "";
                }
              }

              loaded[
                driverUid
              ] = {
                uid:
                  driverUid,

                publicAlias:
                  String(
                    profile.publicAlias ??
                      "KIVO Driver"
                  ),

                homeArea:
                  String(
                    profile.homeArea ??
                      ""
                  ),

                vehicle:
                  String(
                    profile.vehicle ??
                      ""
                  ),

                connector:
                  String(
                    profile.connector ??
                      ""
                  ),

                photoPath,

                photoUrl,

                verified:
                  Boolean(
                    profile.verified
                  ),
              };
            } catch (
              profileError
            ) {
              console.error(
                "Could not load Driver history profile:",
                profileError
              );
            }
          }
        )
      );

      if (
        !cancelled
      ) {
        setDriverProfiles(
          loaded
        );
      }
    }

    void loadProfiles();

    return () => {
      cancelled =
        true;
    };
  }, [
    loading,
    user,
    hasRole,
    history,
  ]);


  /* =========================================================
     RETRY HOST SETTLEMENT
  ========================================================= */

  async function retrySettlement(
    requestId: string
  ) {
    if (!user) {
      return;
    }

    setRetryingId(requestId);
    setError("");
    setSettlementMessage("");

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/bookings/complete",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                requestId,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "KIVO could not retry Host settlement."
        );
      }

      if (
        data.settlementStatus ===
        "transferred"
      ) {
        setSettlementMessage(
          "Host earnings transferred successfully."
        );
      } else {
        setError(
          data.warning ||
            "Settlement still needs attention."
        );
      }
    } catch (retryError) {
      console.error(
        "Host settlement retry failed:",
        retryError
      );

      setError(
        retryError instanceof Error
          ? retryError.message
          : "KIVO could not retry Host settlement."
      );
    } finally {
      setRetryingId(null);
    }
  }


  /* =========================================================
     GUARD
  ========================================================= */

  if (
    loading ||
    !user ||
    !hasRole("host")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <p className="text-sm font-bold text-slate-500">
          Loading KivoHost...
        </p>
      </main>
    );
  }


  const completedCount =
    history.filter(
      (booking) =>
        booking.status ===
        "completed"
    ).length;

  const declinedCount =
    history.filter(
      (booking) =>
        booking.status ===
        "declined"
    ).length;


  return (
    <KivoHostShell active="history">

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">

        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            KivoHost history
          </p>

          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Hosting history
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Review completed charging sessions and requests that were declined.
              </p>

            </div>


            <div className="flex gap-3">

              <div className="rounded-2xl bg-slate-50 px-5 py-3">

                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Completed
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {completedCount}
                </p>

              </div>


              <div className="rounded-2xl bg-slate-50 px-5 py-3">

                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  Declined
                </p>

                <p className="mt-1 text-xl font-black text-slate-950">
                  {declinedCount}
                </p>

              </div>

            </div>

          </div>

        </section>


        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {settlementMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
            {settlementMessage}
          </div>
        )}


        <section className="mt-8">

          {historyLoading ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
              Loading hosting history...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">

              <div className="text-3xl">
                ✓
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950">
                No hosting history yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Completed and declined charging requests will appear here.
              </p>

            </div>
          ) : (
            <div className="space-y-5">

              {history.map(
                (booking) => {
                  const profile =
                    driverProfiles[
                      booking.driverUid
                    ];

                  const completed =
                    booking.status ===
                    "completed";

                  return (
                    <article
                      key={
                        booking.id
                      }
                      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
                    >

                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                              Charging session
                            </span>

                            <span
                              className={
                                completed
                                  ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-emerald-700"
                                  : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-slate-500"
                              }
                            >
                              {completed
                                ? "Completed"
                                : "Declined"}
                            </span>

                          </div>


                          <p className="mt-4 text-2xl font-black text-slate-950">
                            {formatRequestedDate(
                              booking.requestedDate
                            )
                              ? `${formatRequestedDate(
                                  booking.requestedDate
                                )} · ${
                                  booking.requestedTime ||
                                  "Time not provided"
                                }`
                              : booking.requestedTime ||
                                "Charging request"}
                          </p>


                          <p className="mt-1 text-sm font-bold text-slate-500">
                            {booking.route?.from ||
                              "Route"}{" "}
                            →{" "}
                            {booking.route?.to ||
                              "Destination"}
                          </p>

                        </div>


                        <div className="rounded-2xl bg-slate-50 px-5 py-3">

                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Vehicle connector
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-950">
                            {booking.vehicleConnector ||
                              "—"}
                          </p>

                        </div>

                      </div>


                      <div className="mt-6 grid gap-3 md:grid-cols-3">

                        <div className="rounded-2xl bg-slate-50 p-4">

                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                            Driver
                          </p>


                          <div className="mt-3 flex items-center gap-3">

                            {profile?.photoUrl ? (
                              <img
                                src={
                                  profile.photoUrl
                                }
                                alt=""
                                className="h-11 w-11 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-black text-slate-500">
                                {(
                                  profile?.publicAlias?.[0] ||
                                  "D"
                                ).toUpperCase()}
                              </div>
                            )}


                            <div>

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="font-black text-slate-950">
                                  {profile?.publicAlias ||
                                    "KIVO Driver"}
                                </p>

                                {profile?.verified && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                    ✓ Verified
                                  </span>
                                )}

                              </div>

                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {profile?.vehicle ||
                                  "Vehicle"}{" "}
                                {profile?.connector
                                  ? `· ${profile.connector}`
                                  : ""}
                              </p>

                            </div>

                          </div>

                        </div>


                        <div className="rounded-2xl bg-slate-50 p-4">

                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                            Charger
                          </p>

                          <p className="mt-2 text-sm font-black text-slate-800">
                            {booking.charger ||
                              "Charger"}
                          </p>

                        </div>


                        <div className="rounded-2xl bg-slate-50 p-4">

                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                            Route
                          </p>

                          <p className="mt-2 text-sm font-black text-slate-800">
                            {booking.route?.miles
                              ? `${booking.route.miles} miles`
                              : "—"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {booking.hostArea ||
                              ""}
                          </p>

                        </div>

                      </div>


                      {completed && (
                        <div className="mt-5 space-y-3">

                          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">

                            <p className="font-black text-emerald-900">
                              ✓ Charging session completed
                            </p>

                            <p className="mt-1 text-sm text-emerald-800/80">
                              This session is part of your KIVO hosting history.
                            </p>

                          </div>

                          {booking.settlementStatus ===
                            "transferred" && (
                            <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4">

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                <div>
                                  <p className="font-black text-emerald-800">
                                    ✓ Earnings transferred
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500">
                                    {booking.settlement?.foundingHost
                                      ? "Founding Host · 0% KIVO commission"
                                      : "KIVO commission applied"}
                                  </p>
                                </div>

                                {typeof booking.settlement?.hostAmount ===
                                  "number" && (
                                  <p className="text-xl font-black text-slate-950">
                                    $
                                    {(
                                      booking.settlement.hostAmount /
                                      100
                                    ).toFixed(2)}
                                  </p>
                                )}

                              </div>

                            </div>
                          )}

                          {booking.settlementStatus ===
                            "processing" && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">

                              <p className="font-black text-amber-900">
                                Settlement processing
                              </p>

                              <p className="mt-1 text-sm text-amber-800/80">
                                KIVO is transferring your Host earnings.
                              </p>

                            </div>
                          )}

                          {booking.settlementStatus ===
                            "failed" && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">

                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                <div>
                                  <p className="font-black text-red-800">
                                    ⚠ Settlement needs attention
                                  </p>

                                  <p className="mt-1 text-sm text-red-700/80">
                                    Your charging session is complete, but the earnings transfer did not finish.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    retryingId ===
                                    booking.id
                                  }
                                  onClick={() =>
                                    retrySettlement(
                                      booking.id
                                    )
                                  }
                                  className="shrink-0 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                                >
                                  {retryingId ===
                                  booking.id
                                    ? "Retrying..."
                                    : "Retry settlement"}
                                </button>

                              </div>

                            </div>
                          )}

                        </div>
                      )}

                    </article>
                  );
                }
              )}

            </div>
          )}

        </section>

      </div>

    </KivoHostShell>
  );
}
