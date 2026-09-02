"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

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


type DriverMarketplaceProfile = {
  uid: string;
  publicAlias: string;
  bio: string;
  homeArea: string;
  vehicle: string;
  connector: string;
  photoPath: string;
  photoUrl: string;
  verified: boolean;
  bookingReady: boolean;
};


type HostBookingRequest = {
  id: string;

  status:
    | "pending"
    | "accepted"
    | "declined"
    | "completed";

  driverUid: string;
  driverEmail: string;

  hostUid: string;
  hostListingId: string;

  hostArea: string;

  requestedDate: string;
  requestedTime: string;
  vehicleConnector: string;

  price: number;
  currency: string;

  paymentStatus:
    | "not_started"
    | "required"
    | "paid"
    | "failed";

  charger: string;
  speed: string;
  access: string;

  privateAddress: string;
  arrivalInstructions: string;
  arrivalDetailsShared: boolean;

  route?: {
    from?: string;
    to?: string;
    miles?: number | null;
    hours?: number | null;
  };
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

    if (parts.length > 0) {
      return parts.join(" · ");
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


export default function HostRequestsPage() {
  const router =
    useRouter();

  const {
    user,
    loading,
    hasRole,
  } = useAuth();

  const [
    requests,
    setRequests,
  ] =
    useState<HostBookingRequest[]>(
      []
    );


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
    requestsLoading,
    setRequestsLoading,
  ] =
    useState(true);

  const [
    actionRequestId,
    setActionRequestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    actionError,
    setActionError,
  ] =
    useState("");


  const [
    arrivalInstructionsByRequest,
    setArrivalInstructionsByRequest,
  ] =
    useState<Record<string, string>>({});

  const [
    arrivalRequestId,
    setArrivalRequestId,
  ] =
    useState<string | null>(null);


  /* =========================================================
     AUTH
  ========================================================= */

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


  /* =========================================================
     HOST REQUESTS
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
          const nextRequests =
            snapshot.docs.map(
              (documentSnapshot) => {
                const data =
                  documentSnapshot.data();

                return {
                  id:
                    documentSnapshot.id,

                  status:
                    data.status ||
                    "pending",

                  driverUid:
                    data.driverUid ||
                    "",

                  driverEmail:
                    data.driverEmail ||
                    "",

                  hostUid:
                    data.hostUid ||
                    "",

                  hostListingId:
                    data.hostListingId ||
                    "",

                  hostArea:
                    data.hostArea ||
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

                  price:
                    Number(
                      data.price ||
                      0
                    ),

                  currency:
                    data.currency ||
                    "USD",

                  paymentStatus:
                    String(
                      data.paymentStatus ||
                      "not_started"
                    ) as HostBookingRequest["paymentStatus"],

                  charger:
                    normalizeCharger(
                      data.charger
                    ),

                  speed:
                    data.speed ||
                    "",

                  access:
                    data.access ||
                    "",

                  privateAddress:
                    data.privateAddress ||
                    "",

                  arrivalInstructions:
                    data.arrivalInstructions ||
                    "",

                  arrivalDetailsShared:
                    Boolean(
                      data.arrivalDetailsSharedAt
                    ),

                  route:
                    data.route || {},
                } as HostBookingRequest;
              }
            );

          nextRequests.sort(
            (a, b) => {
              if (
                a.status ===
                  "pending" &&
                b.status !==
                  "pending"
              ) {
                return -1;
              }

              if (
                b.status ===
                  "pending" &&
                a.status !==
                  "pending"
              ) {
                return 1;
              }

              return 0;
            }
          );

          setRequests(
            nextRequests.filter(
              (request) =>
                request.status ===
                  "pending" ||
                request.status ===
                  "accepted"
            )
          );

          setRequestsLoading(
            false
          );
        },

        (error) => {
          console.error(
            "Failed to load Host requests:",
            error
          );

          setActionError(
            "KIVO could not load your charging requests."
          );

          setRequestsLoading(
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
      requests.length === 0
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
            requests
              .map(
                (request) =>
                  request.driverUid
              )
              .filter(Boolean)
          )
        );

      const token =
        await user.getIdToken();

      const entries =
        await Promise.all(
          uniqueDriverUids.map(
            async (
              driverUid
            ): Promise<
              [
                string,
                DriverMarketplaceProfile | null
              ]
            > => {
              try {
                const response =
                  await fetch(
                    "/api/host/driver-profile",
                    {
                      method:
                        "POST",

                      headers: {
                        authorization:
                          `Bearer ${token}`,

                        "content-type":
                          "application/json",
                      },

                      body:
                        JSON.stringify({
                          driverUid,
                        }),
                    }
                  );

                const payload =
                  await response.json();

                if (
                  !response.ok ||
                  !payload?.profile
                ) {
                  return [
                    driverUid,
                    null,
                  ];
                }

                const profile =
                  payload.profile;

                let photoUrl =
                  "";

                if (
                  profile.photoPath &&
                  storage
                ) {
                  try {
                    photoUrl =
                      await getDownloadURL(
                        ref(
                          storage,
                          profile.photoPath
                        )
                      );
                  } catch {
                    photoUrl =
                      "";
                  }
                }

                return [
                  driverUid,
                  {
                    uid:
                      driverUid,

                    publicAlias:
                      String(
                        profile.publicAlias ??
                          "KIVO Driver"
                      ),

                    bio:
                      String(
                        profile.bio ??
                          ""
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

                    photoPath:
                      String(
                        profile.photoPath ??
                          ""
                      ),

                    photoUrl,

                    verified:
                      profile.verified ===
                      true,

                    bookingReady:
                      profile.bookingReady ===
                      true,
                  },
                ];
              } catch (
                error
              ) {
                console.error(
                  "Could not load Driver marketplace profile:",
                  error
                );

                return [
                  driverUid,
                  null,
                ];
              }
            }
          )
        );

      if (cancelled) {
        return;
      }

      const nextProfiles:
        Record<
          string,
          DriverMarketplaceProfile
        > = {};

      for (
        const [
          driverUid,
          profile,
        ] of entries
      ) {
        if (profile) {
          nextProfiles[
            driverUid
          ] = profile;
        }
      }

      setDriverProfiles(
        nextProfiles
      );
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
    requests,
  ]);


  /* =========================================================
     HOST DECISION
  ========================================================= */

  async function updateRequestStatus(
    requestId: string,
    status:
      | "accepted"
      | "declined"
  ) {
    if (!user) return;

    setActionRequestId(
      requestId
    );

    setActionError("");

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/bookings/update-status",
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
                status,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not update this charging request."
        );
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not update this charging request."
      );
    } finally {
      setActionRequestId(
        null
      );
    }
  }


  /* =========================================================
     COMPLETE CHARGING SESSION
  ========================================================= */

  async function completeSession(
    requestId: string
  ) {
    if (!user) return;

    const confirmed =
      window.confirm(
        "Mark this KIVO charging session as complete?"
      );

    if (!confirmed) {
      return;
    }

    setActionRequestId(
      requestId
    );

    setActionError("");

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
          data?.error ||
            "Could not complete this charging session."
        );
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not complete this charging session."
      );
    } finally {
      setActionRequestId(
        null
      );
    }
  }


  /* =========================================================
     SHARE PRIVATE ARRIVAL DETAILS
  ========================================================= */

  async function shareArrivalDetails(
    requestId: string
  ) {
    if (!user) return;

    const arrivalInstructions =
      (
        arrivalInstructionsByRequest[
          requestId
        ] || ""
      ).trim();

    if (!arrivalInstructions) {
      setActionError(
        "Add arrival instructions before sharing the private charging location."
      );
      return;
    }

    setArrivalRequestId(
      requestId
    );

    setActionError("");

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/bookings/arrival-details",
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
                arrivalInstructions,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not share arrival details."
        );
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Could not share arrival details."
      );
    } finally {
      setArrivalRequestId(
        null
      );
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

        <div className="text-center">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            KivoHost
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Opening your Host workspace...
          </p>

        </div>

      </main>
    );
  }

  const pendingCount =
    requests.filter(
      (request) =>
        request.status ===
        "pending"
    ).length;


  /* =========================================================
     UI
  ========================================================= */

  return (
    <KivoHostShell active="requests">

      <section className="mx-auto max-w-5xl px-6 py-10">

        <div className="flex flex-wrap items-end justify-between gap-5">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              KivoHost
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Charging requests
            </h1>

            <p className="mt-3 text-slate-500">
              Review Drivers requesting access to your charger.
            </p>

          </div>


          {pendingCount > 0 && (
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700">
              {pendingCount} pending
            </div>
          )}

        </div>


        {actionError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}


        <div className="mt-8 space-y-4">

          {requestsLoading && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              Loading charging requests...
            </div>
          )}


          {!requestsLoading &&
            requests.length ===
              0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">

                <p className="font-black text-slate-700">
                  No charging requests yet
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  New Driver requests will appear here.
                </p>

              </div>
            )}


          {requests.map(
            (request) => {
              const pending =
                request.status ===
                "pending";

              const busy =
                actionRequestId ===
                request.id;

              const driverProfile =
                driverProfiles[
                  request.driverUid
                ];

              return (
                <article
                  key={
                    request.id
                  }
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >

                  <div className="flex flex-wrap items-start justify-between gap-5">

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Charging request
                        </p>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                            pending
                              ? "bg-amber-50 text-amber-700"
                              : request.status ===
                                  "accepted"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {
                            request.status
                          }
                        </span>

                      </div>


                      <h2 className="mt-3 text-2xl font-black">
                        {formatRequestedDate(
                          request.requestedDate
                        )
                          ? `${formatRequestedDate(
                              request.requestedDate
                            )} · ${
                              request.requestedTime ||
                              "Time not provided"
                            }`
                          : request.requestedTime ||
                            "Requested session"}
                      </h2>


                      {request.route?.from ||
                      request.route?.to ? (
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          {request.route
                            ?.from ||
                            "Route"}{" "}
                          →{" "}
                          {request.route
                            ?.to ||
                            "Destination"}
                        </p>
                      ) : null}

                    </div>


                    <div className="text-left sm:text-right">

                      <p className="text-xs font-bold text-slate-400">
                        Vehicle connector
                      </p>

                      <p className="mt-1 font-black text-slate-800">
                        {request.vehicleConnector ||
                          "Not specified"}
                      </p>

                    </div>

                  </div>


                  <div className="mt-6 grid gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-bold text-slate-400">
                        Driver
                      </p>

                      <div className="mt-3 flex items-center gap-3">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-sm font-black text-white">

                          {driverProfile?.photoUrl ? (
                            <img
                              src={
                                driverProfile.photoUrl
                              }
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (
                              driverProfile
                                ?.publicAlias ||
                              "KIVO Driver"
                            )
                              .slice(
                                0,
                                1
                              )
                              .toUpperCase()
                          )}

                        </div>


                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <p className="truncate text-sm font-black text-slate-900">
                              {driverProfile
                                ?.publicAlias ||
                                "KIVO Driver"}
                            </p>

                            {driverProfile
                              ?.verified && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-emerald-700">
                                ✓ Verified
                              </span>
                            )}

                          </div>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {driverProfile
                              ?.vehicle ||
                              "Vehicle"}
                            {driverProfile
                              ?.connector
                              ? ` · ${driverProfile.connector}`
                              : request.vehicleConnector
                                ? ` · ${request.vehicleConnector}`
                                : ""}
                          </p>

                          {driverProfile
                            ?.homeArea && (
                            <p className="mt-1 truncate text-[11px] text-slate-400">
                              {
                                driverProfile.homeArea
                              }
                            </p>
                          )}

                        </div>

                      </div>

                    </div>


                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-bold text-slate-400">
                        Charger
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {request.charger ||
                          "KIVO charger"}
                      </p>

                    </div>


                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-bold text-slate-400">
                        Session
                      </p>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {request.price >
                        0
                          ? `$${request.price}`
                          : "Pricing not enabled"}
                      </p>

                    </div>

                  </div>


                  {pending && (
                    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          updateRequestStatus(
                            request.id,
                            "declined"
                          )
                        }
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        Decline
                      </button>


                      <button
                        type="button"
                        disabled={
                          busy
                        }
                        onClick={() =>
                          updateRequestStatus(
                            request.id,
                            "accepted"
                          )
                        }
                        className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                      >
                        {busy
                          ? "Updating..."
                          : "Accept request"}
                      </button>

                    </div>
                  )}

                {request.status === "accepted" &&
                  request.paymentStatus === "required" &&
                  !request.arrivalDetailsShared && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
                          Waiting for Driver payment
                        </p>

                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          Request accepted
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          The Driver must complete payment before KIVO unlocks private arrival details. Your exact charging address remains protected until then.
                        </p>

                        <p className="mt-3 text-sm font-black text-slate-900">
                          Session total: ${request.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                {request.status === "accepted" &&
                  request.paymentStatus === "paid" && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div className="flex items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                            ✓ Paid
                          </p>

                          <p className="mt-1 text-sm font-bold text-emerald-950">
                            Driver payment confirmed
                          </p>
                        </div>

                        <p className="text-xl font-black text-emerald-950">
                          ${request.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}

                {request.status === "accepted" &&
                  request.paymentStatus === "paid" &&
                  !request.arrivalDetailsShared && (
                    <div className="mt-6 border-t border-slate-100 pt-6">

                      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-5 sm:p-6">

                        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                          Arrival details
                        </p>

                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          Share your charging location
                        </h3>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                          KIVO will securely use the private charging address you confirmed during Host activation. It will be shared only with this accepted Driver.
                        </p>

                        <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            Private charging property
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-800">
                            Your verified KIVO Host address
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            The exact street address remains hidden until you share these arrival details.
                          </p>
                        </div>

                        <label className="mt-5 block">
                          <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            Arrival instructions
                          </span>

                          <textarea
                            rows={4}
                            value={
                              arrivalInstructionsByRequest[
                                request.id
                              ] ??
                              request.arrivalInstructions ??
                              ""
                            }
                            onChange={(event) =>
                              setArrivalInstructionsByRequest(
                                (current) => ({
                                  ...current,
                                  [request.id]:
                                    event.target.value,
                                })
                              )
                            }
                            placeholder="Example: Park on the left side of the driveway. The charger is beside the garage door."
                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400"
                          />
                        </label>

                        <div className="mt-5 flex flex-col gap-4 border-t border-emerald-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="max-w-xl text-xs leading-5 text-slate-500">
                            🔒 Your exact address is copied only to this accepted booking and is not included in the Driver email.
                          </p>

                          <button
                            type="button"
                            disabled={
                              arrivalRequestId ===
                              request.id
                            }
                            onClick={() =>
                              shareArrivalDetails(
                                request.id
                              )
                            }
                            className="shrink-0 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {arrivalRequestId ===
                            request.id
                              ? "Sharing..."
                              : "Share arrival details"}
                          </button>
                        </div>

                      </div>

                    </div>
                  )}

                {request.status === "accepted" &&
                  request.arrivalDetailsShared && (
                    <div className="mt-6 border-t border-slate-100 pt-6">

                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">

                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                          <div>

                            <p className="font-black text-emerald-900">
                              ✓ Arrival details shared
                            </p>

                            <p className="mt-1 max-w-2xl text-sm leading-6 text-emerald-800/80">
                              The private charging location and your instructions are now available to this Driver inside KIVO.
                            </p>

                            <p className="mt-2 text-xs leading-5 text-slate-500">
                              When the charging visit is finished, mark the session complete.
                            </p>

                          </div>


                          <button
                            type="button"
                            disabled={
                              actionRequestId ===
                              request.id
                            }
                            onClick={() =>
                              completeSession(
                                request.id
                              )
                            }
                            className="shrink-0 rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            {actionRequestId ===
                            request.id
                              ? "Completing..."
                              : "Complete session"}
                          </button>

                        </div>

                      </div>

                    </div>
                  )}

                </article>
              );
            }
          )}

        </div>

      </section>

    </KivoHostShell>
  );
}
