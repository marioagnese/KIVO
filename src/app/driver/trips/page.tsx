"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import KivoDriverShell from "@/components/driver/KivoDriverShell";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";


type BookingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed";


type BookingRequest = {
  id: string;
  status: BookingStatus;

  hostUid: string;
  hostListingId: string;

  hostArea: string;
  hostState: string;

  requestedDate: string;
  requestedTime: string;
  vehicleConnector: string;

  charger: string;
  speed: string;
  access: string;

  price: number;
  currency: string;

  privateAddress: string;
  arrivalInstructions: string;

  route: {
    from: string;
    fromRegion: string;
    to: string;
    toRegion: string;
    miles: number | null;
    hours: number | null;
  };

  createdAt: Timestamp | null;
  decisionAt: Timestamp | null;
  arrivalDetailsSharedAt: Timestamp | null;
  completedAt: Timestamp | null;
};


function text(
  value: unknown
) {
  return String(value ?? "").trim();
}


function timestamp(
  value: unknown
) {
  return value instanceof Timestamp
    ? value
    : null;
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


function formatDate(
  value: Timestamp | null
) {
  if (!value) {
    return "";
  }

  return value
    .toDate()
    .toLocaleDateString(
      undefined,
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
}


function formatRoute(
  booking: BookingRequest
) {
  const from =
    booking.route.from ||
    booking.route.fromRegion;

  const to =
    booking.route.to ||
    booking.route.toRegion;

  if (from && to) {
    return `${from} → ${to}`;
  }

  if (to) {
    return `Toward ${to}`;
  }

  return "Your KIVO route";
}


function statusDesign(
  status: BookingStatus
) {
  switch (status) {
    case "accepted":
      return {
        label: "Accepted",
        emoji: "⚡",
        badge:
          "bg-emerald-100 text-emerald-800",
      };

    case "completed":
      return {
        label: "Completed",
        emoji: "✓",
        badge:
          "bg-slate-100 text-slate-700",
      };

    case "declined":
      return {
        label: "Unavailable",
        emoji: "↻",
        badge:
          "bg-rose-50 text-rose-700",
      };

    default:
      return {
        label: "Waiting for Host",
        emoji: "⏳",
        badge:
          "bg-amber-50 text-amber-800",
      };
  }
}


function BookingCard({
  booking,
}: {
  booking: BookingRequest;
}) {
  const design =
    statusDesign(booking.status);

  const arrivalReady =
    booking.status === "accepted" &&
    Boolean(
      booking.privateAddress &&
      booking.arrivalInstructions
    );

  const location =
    booking.hostArea ||
    booking.hostState ||
    "";

  return (
    <article
      className="
        overflow-hidden rounded-[28px]
        border border-slate-200
        bg-white shadow-sm
      "
    >
      <div className="p-6 sm:p-8">
        <div
          className="
            flex flex-col gap-5
            sm:flex-row
            sm:items-start
            sm:justify-between
          "
        >
          <div>
            <div
              className="
                mb-3 flex flex-wrap
                items-center gap-2
              "
            >
              <span
                className={`
                  inline-flex items-center
                  gap-2 rounded-full
                  px-3 py-1.5
                  text-xs font-bold
                  ${design.badge}
                `}
              >
                <span>
                  {design.emoji}
                </span>

                {design.label}
              </span>

              {booking.createdAt && (
                <span
                  className="
                    text-xs font-medium
                    text-slate-400
                  "
                >
                  Requested{" "}
                  {formatDate(
                    booking.createdAt
                  )}
                </span>
              )}
            </div>

            <h2
              className="
                text-2xl font-black
                tracking-tight
                text-slate-950
              "
            >
              {location ||
                "KIVO neighborhood charger"}
            </h2>

            <p
              className="
                mt-2 text-sm
                font-medium
                text-slate-500
              "
            >
              {formatRoute(booking)}
            </p>
          </div>

          <div
            className="
              rounded-2xl
              bg-slate-50
              px-5 py-3
              sm:text-right
            "
          >
            <div
              className="
                text-[10px] font-black
                uppercase
                tracking-[0.18em]
                text-slate-400
              "
            >
              Charging date & time
            </div>

            <div
              className="
                mt-1 text-lg
                font-black
                text-slate-950
              "
            >
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
                  "Date and time not provided"}
            </div>
          </div>
        </div>


        <div
          className="
            mt-6 grid gap-3
            sm:grid-cols-3
          "
        >
          <div
            className="
              rounded-2xl
              bg-slate-50 p-4
            "
          >
            <div className="text-xl">
              🔌
            </div>

            <div
              className="
                mt-2 text-xs
                font-black uppercase
                tracking-wider
                text-slate-400
              "
            >
              Connector
            </div>

            <div
              className="
                mt-1 font-bold
                text-slate-900
              "
            >
              {booking.vehicleConnector ||
                booking.charger ||
                "Not specified"}
            </div>
          </div>

          <div
            className="
              rounded-2xl
              bg-slate-50 p-4
            "
          >
            <div className="text-xl">
              🛣️
            </div>

            <div
              className="
                mt-2 text-xs
                font-black uppercase
                tracking-wider
                text-slate-400
              "
            >
              Route
            </div>

            <div
              className="
                mt-1 font-bold
                text-slate-900
              "
            >
              {typeof booking.route.miles ===
              "number"
                ? `${Math.round(
                    booking.route.miles
                  )} miles`
                : "Along your route"}
            </div>
          </div>

          <div
            className="
              rounded-2xl
              bg-slate-50 p-4
            "
          >
            <div className="text-xl">
              🏡
            </div>

            <div
              className="
                mt-2 text-xs
                font-black uppercase
                tracking-wider
                text-slate-400
              "
            >
              Host location
            </div>

            <div
              className="
                mt-1 font-bold
                text-slate-900
              "
            >
              {location ||
                "Neighborhood Host"}
            </div>
          </div>
        </div>


        {booking.status === "pending" && (
          <div
            className="
              mt-6 rounded-2xl
              border border-amber-100
              bg-amber-50/70
              p-5
            "
          >
            <div
              className="
                flex items-start gap-3
              "
            >
              <span className="text-xl">
                ⏳
              </span>

              <div>
                <div
                  className="
                    font-black
                    text-slate-950
                  "
                >
                  Waiting for your Host
                </div>

                <p
                  className="
                    mt-1 text-sm
                    leading-6
                    text-slate-600
                  "
                >
                  Your request has been
                  sent. The Host will
                  accept or decline it
                  through KIVO.
                </p>

                <p
                  className="
                    mt-2 text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  🔒 The exact charging
                  address stays private
                  until the Host accepts.
                </p>
              </div>
            </div>
          </div>
        )}


        {booking.status === "accepted" &&
          !arrivalReady && (
            <div
              className="
                mt-6 rounded-2xl
                border border-emerald-100
                bg-emerald-50/70
                p-5
              "
            >
              <div
                className="
                  flex items-start gap-3
                "
              >
                <span className="text-xl">
                  🎉
                </span>

                <div>
                  <div
                    className="
                      font-black
                      text-slate-950
                    "
                  >
                    Your charger is
                    confirmed
                  </div>

                  <p
                    className="
                      mt-1 text-sm
                      leading-6
                      text-slate-600
                    "
                  >
                    The Host accepted
                    your request. Arrival
                    details have not been
                    shared yet.
                  </p>

                  <p
                    className="
                      mt-2 text-xs
                      font-semibold
                      text-emerald-700
                    "
                  >
                    KIVO will show the
                    private address here
                    once the Host provides
                    it.
                  </p>
                </div>
              </div>
            </div>
          )}


        {arrivalReady && (
          <div
            className="
              mt-6 overflow-hidden
              rounded-3xl
              border border-cyan-200
              bg-cyan-50/60
            "
          >
            <div
              className="
                border-b
                border-cyan-100
                px-5 py-4
              "
            >
              <div
                className="
                  text-[11px] font-black
                  uppercase
                  tracking-[0.18em]
                  text-cyan-700
                "
              >
                🔐 Private arrival details
              </div>

              <h3
                className="
                  mt-1 text-xl
                  font-black
                  text-slate-950
                "
              >
                You're ready to arrive.
              </h3>
            </div>

            <div
              className="
                grid gap-4 p-5
                md:grid-cols-2
              "
            >
              <div
                className="
                  rounded-2xl bg-white
                  p-4
                "
              >
                <div
                  className="
                    text-xs font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Charging address
                </div>

                <div
                  className="
                    mt-2 font-bold
                    leading-6
                    text-slate-950
                  "
                >
                  {booking.privateAddress}
                </div>
              </div>

              <div
                className="
                  rounded-2xl bg-white
                  p-4
                "
              >
                <div
                  className="
                    text-xs font-black
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  Host instructions
                </div>

                <div
                  className="
                    mt-2 whitespace-pre-wrap
                    font-medium
                    leading-6
                    text-slate-700
                  "
                >
                  {
                    booking.arrivalInstructions
                  }
                </div>
              </div>
            </div>

            <div
              className="
                px-5 pb-5
                text-xs font-medium
                text-slate-500
              "
            >
              🔒 These details are private
              to your accepted KIVO
              charging session.
            </div>
          </div>
        )}


        {booking.status === "declined" && (
          <div
            className="
              mt-6 flex flex-col
              gap-4 rounded-2xl
              bg-slate-50 p-5
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div>
              <div
                className="
                  font-black
                  text-slate-950
                "
              >
                This Host wasn't
                available.
              </div>

              <p
                className="
                  mt-1 text-sm
                  text-slate-500
                "
              >
                Find another neighborhood
                charger along your route.
              </p>
            </div>

            <Link
              href="/driver/find"
              className="
                inline-flex
                items-center
                justify-center
                rounded-xl
                bg-slate-950
                px-5 py-3
                text-sm font-black
                text-white
                transition
                hover:bg-slate-800
              "
            >
              Find another charger
            </Link>
          </div>
        )}


        {booking.status === "completed" && (
          <div
            className="
              mt-6 rounded-2xl
              bg-slate-50 p-5
            "
          >
            <div
              className="
                flex items-center gap-3
              "
            >
              <span className="text-xl">
                ✓
              </span>

              <div>
                <div
                  className="
                    font-black
                    text-slate-950
                  "
                >
                  Charging session
                  complete
                </div>

                <p
                  className="
                    mt-1 text-sm
                    text-slate-500
                  "
                >
                  This session is now
                  part of your KIVO
                  history.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}


export default function DriverTripsPage() {
  const {
    user,
    loading: authLoading,
    hasRole,
  } = useAuth();

  const [bookings, setBookings] =
    useState<BookingRequest[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const driverAuthorized =
    !authLoading &&
    !!user &&
    hasRole("driver");


  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (
      !driverAuthorized ||
      !user ||
      !db
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const bookingsQuery =
      query(
        collection(
          db,
          "bookingRequests"
        ),
        where(
          "driverUid",
          "==",
          user.uid
        )
      );

    const unsubscribe =
      onSnapshot(
        bookingsQuery,
        (snapshot) => {
          const next =
            snapshot.docs.map(
              (document) => {
                const data =
                  document.data();

                const route =
                  data.route ?? {};

                return {
                  id:
                    document.id,

                  status:
                    text(
                      data.status
                    ) as BookingStatus,

                  hostUid:
                    text(data.hostUid),

                  hostListingId:
                    text(
                      data.hostListingId
                    ),

                  hostArea:
                    text(data.hostArea),

                  hostState:
                    text(data.hostState),

                  requestedDate:
                    text(
                      data.requestedDate
                    ),

                  requestedTime:
                    text(
                      data.requestedTime
                    ),

                  vehicleConnector:
                    text(
                      data.vehicleConnector
                    ),

                  charger:
                    text(data.charger),

                  speed:
                    text(data.speed),

                  access:
                    text(data.access),

                  price:
                    typeof data.price ===
                    "number"
                      ? data.price
                      : 0,

                  currency:
                    text(
                      data.currency
                    ) || "USD",

                  privateAddress:
                    text(
                      data.privateAddress
                    ),

                  arrivalInstructions:
                    text(
                      data.arrivalInstructions
                    ),

                  route: {
                    from:
                      text(route.from),

                    fromRegion:
                      text(
                        route.fromRegion
                      ),

                    to:
                      text(route.to),

                    toRegion:
                      text(
                        route.toRegion
                      ),

                    miles:
                      typeof route.miles ===
                      "number"
                        ? route.miles
                        : null,

                    hours:
                      typeof route.hours ===
                      "number"
                        ? route.hours
                        : null,
                  },

                  createdAt:
                    timestamp(
                      data.createdAt
                    ),

                  decisionAt:
                    timestamp(
                      data.decisionAt
                    ),

                  arrivalDetailsSharedAt:
                    timestamp(
                      data.arrivalDetailsSharedAt
                    ),

                  completedAt:
                    timestamp(
                      data.completedAt
                    ),
                };
              }
            );

          next.sort(
            (a, b) =>
              (
                b.createdAt
                  ?.toMillis() ?? 0
              ) -
              (
                a.createdAt
                  ?.toMillis() ?? 0
              )
          );

          setBookings(next);
          setLoading(false);
        },
        (snapshotError) => {
          console.error(
            "Unable to load Driver trips:",
            snapshotError
          );

          setError(
            "We couldn't load your KIVO trips."
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, [
    authLoading,
    driverAuthorized,
    user,
  ]);


  const activeBookings =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
              "pending" ||
            booking.status ===
              "accepted"
        ),
      [bookings]
    );


  const history =
    useMemo(
      () =>
        bookings.filter(
          (booking) =>
            booking.status ===
              "declined" ||
            booking.status ===
              "completed"
        ),
      [bookings]
    );


  return (
    <KivoDriverShell active="trips">
      <main
        className="
          mx-auto w-full
          max-w-[1240px]
          px-4 py-8
          sm:px-6 sm:py-10
          lg:px-8
        "
      >
        <section
          className="
            overflow-hidden
            rounded-[30px]
            border border-slate-200
            bg-white
            shadow-sm
          "
        >
          <div
            className="
              bg-gradient-to-r
              from-cyan-50
              via-white
              to-emerald-50
              px-6 py-8
              sm:px-9 sm:py-10
            "
          >
            <div
              className="
                flex flex-col gap-6
                md:flex-row
                md:items-end
                md:justify-between
              "
            >
              <div>
                <div
                  className="
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.22em]
                    text-cyan-700
                  "
                >
                  Your KivoDriver
                </div>

                <h1
                  className="
                    mt-2 text-3xl
                    font-black
                    tracking-tight
                    text-slate-950
                    sm:text-4xl
                  "
                >
                  Trips & charging
                </h1>

                <p
                  className="
                    mt-3 max-w-2xl
                    text-sm
                    leading-6
                    text-slate-600
                    sm:text-base
                  "
                >
                  Follow your requests,
                  accepted sessions and
                  private arrival details
                  in one place.
                </p>
              </div>

              <Link
                href="/driver/find"
                className="
                  inline-flex
                  items-center
                  justify-center gap-2
                  rounded-2xl
                  bg-slate-950
                  px-5 py-3.5
                  text-sm font-black
                  text-white
                  shadow-sm
                  transition
                  hover:-translate-y-0.5
                  hover:bg-slate-800
                "
              >
                ⚡ Find a charger
                <span>→</span>
              </Link>
            </div>
          </div>
        </section>


        {loading && (
          <div
            className="
              mt-6 rounded-[28px]
              border border-slate-200
              bg-white p-10
              text-center
              text-sm font-semibold
              text-slate-500
            "
          >
            Loading your KIVO trips...
          </div>
        )}


        {!loading && error && (
          <div
            className="
              mt-6 rounded-[28px]
              border border-rose-200
              bg-rose-50 p-6
              text-sm font-semibold
              text-rose-700
            "
          >
            {error}
          </div>
        )}


        {!loading &&
          !error &&
          bookings.length === 0 && (
            <section
              className="
                mt-6 rounded-[30px]
                border border-slate-200
                bg-white px-6 py-16
                text-center
                shadow-sm
              "
            >
              <div
                className="
                  mx-auto flex
                  h-16 w-16
                  items-center
                  justify-center
                  rounded-full
                  bg-cyan-50
                  text-3xl
                "
              >
                🚙
              </div>

              <h2
                className="
                  mt-5 text-2xl
                  font-black
                  text-slate-950
                "
              >
                No charging trips yet.
              </h2>

              <p
                className="
                  mx-auto mt-2
                  max-w-lg
                  text-sm leading-6
                  text-slate-500
                "
              >
                Find a neighborhood
                charger along your route
                and your requests will
                appear here.
              </p>

              <Link
                href="/driver/find"
                className="
                  mt-6 inline-flex
                  rounded-2xl
                  bg-cyan-600
                  px-6 py-3.5
                  text-sm font-black
                  text-white
                  transition
                  hover:bg-cyan-700
                "
              >
                Find my first charger
              </Link>
            </section>
          )}


        {!loading &&
          !error &&
          activeBookings.length > 0 && (
            <section className="mt-8">
              <div
                className="
                  mb-4 flex
                  items-end
                  justify-between
                "
              >
                <div>
                  <div
                    className="
                      text-[10px]
                      font-black uppercase
                      tracking-[0.2em]
                      text-cyan-700
                    "
                  >
                    Active
                  </div>

                  <h2
                    className="
                      mt-1 text-2xl
                      font-black
                      text-slate-950
                    "
                  >
                    Your upcoming KIVO
                  </h2>
                </div>

                <div
                  className="
                    rounded-full
                    bg-cyan-50
                    px-3 py-1.5
                    text-xs font-black
                    text-cyan-700
                  "
                >
                  {
                    activeBookings.length
                  }{" "}
                  active
                </div>
              </div>

              <div className="space-y-5">
                {activeBookings.map(
                  (booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                    />
                  )
                )}
              </div>
            </section>
          )}


        {!loading &&
          !error &&
          history.length > 0 && (
            <section className="mt-10">
              <div
                className="
                  mb-4 text-[10px]
                  font-black uppercase
                  tracking-[0.2em]
                  text-slate-400
                "
              >
                History
              </div>

              <div className="space-y-5">
                {history.map(
                  (booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                    />
                  )
                )}
              </div>
            </section>
          )}
      </main>
    </KivoDriverShell>
  );
}
