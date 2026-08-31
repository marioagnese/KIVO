"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/context/AuthContext";

import KivoHostShell from "@/components/host/KivoHostShell";


type HostListing = {
  id: string;

  hostPublicName: string;
  hostBio: string;

  status: string;

  area: string;
  state: string;
  postalCode: string;

  charger: {
    level: string;
    connector: string;
    speed: string;
  };

  availability: {
    preferences: string[];
    startTime: string;
    endTime: string;
  };

  access: string;

  amenities: string[];

  rules: string;

  bookingMode: string;

  pricing: {
    sessionPrice: number;
    currency: string;
    configured: boolean;
  };

  paymentsEnabled: boolean;

  rating: number | null;
  reviews: number;
};


type ListingOptions = {
  availability: string[];
  amenities: string[];
};


export default function HostListingPage() {
  const {
    user,
    loading,
    hasRole,
  } = useAuth();


  const [
    listing,
    setListing,
  ] =
    useState<HostListing | null>(
      null
    );


  const [
    options,
    setOptions,
  ] =
    useState<ListingOptions>({
      availability: [],
      amenities: [],
    });


  const [
    hostPublicName,
    setHostPublicName,
  ] =
    useState("");


  const [
    hostBio,
    setHostBio,
  ] =
    useState("");


  const [
    access,
    setAccess,
  ] =
    useState("");


  const [
    rules,
    setRules,
  ] =
    useState("");


  const [
    availability,
    setAvailability,
  ] =
    useState<string[]>([]);


  const [
    amenities,
    setAmenities,
  ] =
    useState<string[]>([]);


  const [
    pageLoading,
    setPageLoading,
  ] =
    useState(true);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState("");


  const [
    saved,
    setSaved,
  ] =
    useState(false);


  /* =========================================================
     LOAD LISTING
  ========================================================= */

  useEffect(() => {
    if (
      loading ||
      !user ||
      !hasRole("host")
    ) {
      return;
    }

    let cancelled =
      false;

    async function loadListing() {
      if (!user) {
        return;
      }

      setPageLoading(
        true
      );

      setError("");

      try {
        const idToken =
          await user.getIdToken();

        const response =
          await fetch(
            "/api/host/listing",
            {
              method: "GET",

              headers: {
                Authorization:
                  `Bearer ${idToken}`,
              },
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Could not load your Host listing."
          );
        }

        if (cancelled) {
          return;
        }

        const nextListing =
          data.listing as HostListing;

        setListing(
          nextListing
        );

        setOptions({
          availability:
            Array.isArray(
              data.options?.availability
            )
              ? data.options.availability
              : [],

          amenities:
            Array.isArray(
              data.options?.amenities
            )
              ? data.options.amenities
              : [],
        });

        setHostPublicName(
          nextListing.hostPublicName
        );

        setHostBio(
          nextListing.hostBio
        );

        setAccess(
          nextListing.access
        );

        setRules(
          nextListing.rules
        );

        setAvailability(
          nextListing.availability
            .preferences
        );

        setAmenities(
          nextListing.amenities
        );
      } catch (loadError) {
        if (
          !cancelled
        ) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load your Host listing."
          );
        }
      } finally {
        if (
          !cancelled
        ) {
          setPageLoading(
            false
          );
        }
      }
    }

    void loadListing();

    return () => {
      cancelled =
        true;
    };
  }, [
    loading,
    user,
    hasRole,
  ]);


  /* =========================================================
     TOGGLES
  ========================================================= */

  function toggleAvailability(
    value: string
  ) {
    setSaved(false);

    setAvailability(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !== value
            )
          : [
              ...current,
              value,
            ]
    );
  }


  function toggleAmenity(
    value: string
  ) {
    setSaved(false);

    setAmenities(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !== value
            )
          : [
              ...current,
              value,
            ]
    );
  }


  /* =========================================================
     SAVE LISTING
  ========================================================= */

  async function saveListing() {
    if (
      !user ||
      !listing
    ) {
      return;
    }

    setSaving(true);

    setError("");

    setSaved(false);

    try {
      const idToken =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/host/listing",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${idToken}`,
            },

            body:
              JSON.stringify({
                hostPublicName,
                hostBio,
                access,
                rules,
                availability,
                amenities,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not save your Host listing."
        );
      }

      const updated =
        data.listing as HostListing;

      setListing(
        updated
      );

      setHostPublicName(
        updated.hostPublicName
      );

      setHostBio(
        updated.hostBio
      );

      setAccess(
        updated.access
      );

      setRules(
        updated.rules
      );

      setAvailability(
        updated.availability
          .preferences
      );

      setAmenities(
        updated.amenities
      );

      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save your Host listing."
      );
    } finally {
      setSaving(false);
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


  return (
    <KivoHostShell active="listing">

      <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">

        <section className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Your marketplace presence
          </p>

          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Host listing
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Manage the public information Drivers see when your charger appears along their route.
              </p>

            </div>


            {listing && (
              <div className="rounded-2xl bg-emerald-50 px-5 py-3">

                <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                  Listing status
                </p>

                <p className="mt-1 text-lg font-black capitalize text-emerald-950">
                  {listing.status ||
                    "Active"}
                </p>

              </div>
            )}

          </div>

        </section>


        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}


        {saved && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
            ✓ Your public KIVO Host listing has been updated.
          </div>
        )}


        {pageLoading ? (
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500 shadow-sm">
            Loading your Host listing...
          </div>
        ) : !listing ? (
          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">

            <h2 className="text-xl font-black text-slate-950">
              Listing unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              KIVO could not find an active Host listing for this account.
            </p>

          </div>
        ) : (
          <>

            {/* =====================================================
                PUBLIC PROFILE
            ====================================================== */}

            <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Public profile
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                How Drivers see you
              </h2>


              <div className="mt-6 grid gap-5">

                <label>

                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Public Host name
                  </span>

                  <input
                    value={
                      hostPublicName
                    }
                    maxLength={80}
                    onChange={(
                      event
                    ) => {
                      setSaved(false);

                      setHostPublicName(
                        event.target.value
                      );
                    }}
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400"
                  />

                </label>


                <label>

                  <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    Host bio
                  </span>

                  <textarea
                    rows={4}
                    value={
                      hostBio
                    }
                    maxLength={500}
                    onChange={(
                      event
                    ) => {
                      setSaved(false);

                      setHostBio(
                        event.target.value
                      );
                    }}
                    placeholder="Tell Drivers a little about the charging experience you offer."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400"
                  />

                  <span className="mt-1 block text-right text-xs text-slate-400">
                    {hostBio.length}/500
                  </span>

                </label>

              </div>

            </section>


            {/* =====================================================
                LOCATION + CHARGER
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Charging setup
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Location & charger
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    These fields affect routing and compatibility, so they are not edited from the public listing screen.
                  </p>

                </div>


                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                  Read only
                </div>

              </div>


              <div className="mt-6 grid gap-4 md:grid-cols-3">

                <div className="rounded-2xl bg-slate-50 p-5">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Public area
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-950">
                    {listing.area ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Exact street address remains private.
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-5">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Charger
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-950">
                    {listing.charger.level ||
                      "Charger"}{" "}
                    ·{" "}
                    {listing.charger.connector ||
                      "Connector"}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-5">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Charging speed
                  </p>

                  <p className="mt-2 text-lg font-black text-slate-950">
                    {listing.charger.speed ||
                      "—"}
                  </p>

                </div>

              </div>

            </section>


            {/* =====================================================
                ACCESS
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Driver experience
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Parking & access
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Keep this public-safe. Do not include gate codes, exact street directions or other private arrival instructions here.
              </p>


              <label className="mt-6 block">

                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  Public access description
                </span>

                <textarea
                  rows={3}
                  value={
                    access
                  }
                  maxLength={300}
                  onChange={(
                    event
                  ) => {
                    setSaved(false);

                    setAccess(
                      event.target.value
                    );
                  }}
                  placeholder="Example: Private driveway with easy pull-in access."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400"
                />

                <span className="mt-1 block text-right text-xs text-slate-400">
                  {access.length}/300
                </span>

              </label>

            </section>


            {/* =====================================================
                AVAILABILITY
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Availability
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                When you usually host
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                These are general preferences. You still control individual booking requests.
              </p>


              <div className="mt-6 flex flex-wrap gap-3">

                {options.availability.map(
                  (
                    option
                  ) => {
                    const selected =
                      availability.includes(
                        option
                      );

                    return (
                      <button
                        key={
                          option
                        }
                        type="button"
                        onClick={() =>
                          toggleAvailability(
                            option
                          )
                        }
                        className={
                          selected
                            ? "rounded-full border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
                            : "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300"
                        }
                      >
                        {selected
                          ? "✓ "
                          : ""}
                        {option}
                      </button>
                    );
                  }
                )}

              </div>

            </section>


            {/* =====================================================
                AMENITIES
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Amenities
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                What you offer
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Only select amenities you genuinely want Drivers to expect during a charging visit.
              </p>


              <div className="mt-6 flex flex-wrap gap-3">

                {Array.from(
                  new Set([
                    ...options.amenities,
                    ...amenities,
                  ])
                ).map(
                  (
                    option
                  ) => {
                    const selected =
                      amenities.includes(
                        option
                      );

                    return (
                      <button
                        key={
                          option
                        }
                        type="button"
                        onClick={() =>
                          toggleAmenity(
                            option
                          )
                        }
                        className={
                          selected
                            ? "rounded-full border border-emerald-500 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-800"
                            : "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300"
                        }
                      >
                        {selected
                          ? "✓ "
                          : ""}
                        {option}
                      </button>
                    );
                  }
                )}

              </div>

            </section>


            {/* =====================================================
                RULES
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Charging rules
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Set expectations
              </h2>


              <label className="mt-6 block">

                <textarea
                  rows={4}
                  value={
                    rules
                  }
                  maxLength={500}
                  onChange={(
                    event
                  ) => {
                    setSaved(false);

                    setRules(
                      event.target.value
                    );
                  }}
                  placeholder="Example: Please remain in the designated parking area and respect quiet hours after 9 PM."
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400"
                />

                <span className="mt-1 block text-right text-xs text-slate-400">
                  {rules.length}/500
                </span>

              </label>

            </section>


            {/* =====================================================
                MARKETPLACE STATUS
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Marketplace status
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-4">

                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Booking mode
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {listing.bookingMode ===
                    "request_only"
                      ? "Request approval"
                      : listing.bookingMode ||
                        "—"}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Pricing
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {listing.pricing
                      .configured
                      ? `$${listing.pricing.sessionPrice}`
                      : "Not enabled"}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Rating
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {listing.rating ??
                      "New Host"}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                    Reviews
                  </p>

                  <p className="mt-2 font-black text-slate-950">
                    {listing.reviews}
                  </p>

                </div>

              </div>

            </section>


            {/* =====================================================
                SAVE
            ====================================================== */}

            <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-xl font-black text-slate-950">
                    Update your listing
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Changes here update your public KIVO marketplace listing. Your exact property address and private arrival instructions remain separate.
                  </p>

                </div>


                <button
                  type="button"
                  disabled={
                    saving
                  }
                  onClick={
                    saveListing
                  }
                  className="shrink-0 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Save listing"}
                </button>

              </div>

            </section>

          </>
        )}

      </div>

    </KivoHostShell>
  );
}
