"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import KivoDriverShell from "@/components/driver/KivoDriverShell";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  storage,
} from "@/lib/firebase";


type DriverProfile = {
  uid: string;
  email: string;
  displayName: string;
  publicAlias: string;
  bio: string;
  homeArea: string;
  vehicle: string;
  connector: string;
  photoPath: string;

  identitySafety: {
    status: string;
  };

  bookingReady: boolean;
  status: string;
  activatedAt: string | null;
};


export default function DriverProfilePage() {
  const {
    user,
    loading: authLoading,
    hasRole,
  } = useAuth();

  const [profile, setProfile] =
    useState<DriverProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [saved, setSaved] =
    useState(false);

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [publicAlias, setPublicAlias] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [homeArea, setHomeArea] =
    useState("");

  const [vehicle, setVehicle] =
    useState("");

  const [connector, setConnector] =
    useState("");

  const driverAuthorized =
    !authLoading &&
    !!user &&
    hasRole("driver");


  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {
    if (!driverAuthorized || !user) {
      return;
    }

    void loadProfile();
  }, [
    driverAuthorized,
    user,
  ]);


  async function loadProfile() {
    if (!user) return;

    setLoading(true);
    setError("");

    try {
      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/driver/profile",
          {
            headers: {
              authorization:
                `Bearer ${token}`,
            },
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not load Driver profile."
        );
      }

      const nextProfile =
        payload.profile as DriverProfile;

      setProfile(nextProfile);

      setPublicAlias(
        nextProfile.publicAlias
      );

      setBio(
        nextProfile.bio
      );

      setHomeArea(
        nextProfile.homeArea
      );

      setVehicle(
        nextProfile.vehicle
      );

      setConnector(
        nextProfile.connector
      );

      if (
        nextProfile.photoPath &&
        storage
      ) {
        try {
          const url =
            await getDownloadURL(
              ref(
                storage,
                nextProfile.photoPath
              )
            );

          setPhotoUrl(url);
        } catch {
          setPhotoUrl("");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Driver profile."
      );
    } finally {
      setLoading(false);
    }
  }


  /* =========================================================
     PHOTO UPLOAD
  ========================================================= */

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (
      !file ||
      !user ||
      !storage
    ) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Please choose an image file."
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "Profile photo must be under 5 MB."
      );
      return;
    }

    setUploading(true);
    setSaved(false);
    setError("");

    try {
      const safeName =
        file.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
          )
          .slice(-120);

      const photoPath =
        `driverProfiles/${user.uid}/profile-${Date.now()}-${safeName}`;

      const storageRef =
        ref(
          storage,
          photoPath
        );

      await uploadBytes(
        storageRef,
        file,
        {
          contentType:
            file.type,
        }
      );

      const url =
        await getDownloadURL(
          storageRef
        );

      setPhotoUrl(url);

      setProfile(
        (current) =>
          current
            ? {
                ...current,
                photoPath,
              }
            : current
      );

      await saveProfile(
        photoPath
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not upload profile photo."
      );
    } finally {
      setUploading(false);

      event.target.value =
        "";
    }
  }


  /* =========================================================
     SAVE PROFILE
  ========================================================= */

  async function saveProfile(
    photoPathOverride?: string
  ) {
    if (
      !user ||
      !profile
    ) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/driver/profile",
          {
            method:
              "PATCH",

            headers: {
              authorization:
                `Bearer ${token}`,

              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              publicAlias,
              bio,
              homeArea,
              vehicle,
              connector,

              photoPath:
                photoPathOverride ??
                profile.photoPath,
            }),
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not save Driver profile."
        );
      }

      setProfile(
        (current) =>
          current
            ? {
                ...current,
                ...payload.profile,
              }
            : current
      );

      setSaved(true);

      window.setTimeout(
        () => {
          setSaved(false);
        },
        2500
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save Driver profile."
      );
    } finally {
      setSaving(false);
    }
  }


  /* =========================================================
     DERIVED DISPLAY
  ========================================================= */

  const avatarInitial =
    useMemo(() => {
      const source =
        publicAlias ||
        profile?.displayName ||
        profile?.email ||
        "D";

      return source
        .trim()
        .slice(0, 1)
        .toUpperCase();
    }, [
      publicAlias,
      profile,
    ]);


  const verified =
    profile
      ?.identitySafety
      ?.status ===
    "verified";

  const memberSince =
    profile?.activatedAt
      ? new Date(
          profile.activatedAt
        ).toLocaleDateString(
          undefined,
          {
            year: "numeric",
            month: "short",
          }
        )
      : "";


  if (
    !driverAuthorized ||
    loading
  ) {
    return (
      <KivoDriverShell active="profile">
        <div className="mx-auto flex min-h-[70vh] max-w-[1500px] items-center justify-center px-5">

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
              KivoDriver
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Loading your profile...
            </p>
          </div>

        </div>
      </KivoDriverShell>
    );
  }


  return (
    <KivoDriverShell active="profile">

      <div className="mx-auto max-w-[1280px] px-5 pb-16 pt-8 sm:px-7 sm:pt-10">

        {/* =====================================================
            PROFILE HERO
        ====================================================== */}

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)]">

          <div className="bg-gradient-to-r from-cyan-50 via-white to-emerald-50 px-6 py-8 sm:px-9 sm:py-10">

            <div className="flex flex-col gap-7 sm:flex-row sm:items-center">

              {/* PHOTO */}

              <div className="relative shrink-0">

                <div className="relative flex h-32 w-32 min-h-32 min-w-32 max-h-32 max-w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-950 text-4xl font-black text-white shadow-xl">

                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Driver profile"
                      className="absolute inset-0 h-full w-full max-w-none object-cover"
                    />
                  ) : (
                    avatarInitial
                  )}

                </div>

                <label className="absolute bottom-0 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-cyan-600 text-white shadow-lg transition hover:bg-cyan-700">

                  <span className="text-lg">
                    +
                  </span>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      handlePhotoChange
                    }
                    className="hidden"
                  />

                </label>

              </div>


              {/* IDENTITY */}

              <div className="min-w-0 flex-1">

                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700">
                  Your KivoDriver profile
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
                  {publicAlias ||
                    profile?.displayName ||
                    "KIVO Driver"}
                </h1>

                {homeArea && (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {homeArea}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">

                  {verified && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">
                      ✓ Identity verified
                    </span>
                  )}

                  {profile?.bookingReady && (
                    <span className="rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-black text-cyan-800">
                      ⚡ Booking ready
                    </span>
                  )}

                  {memberSince && (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 shadow-sm">
                      Member since {memberSince}
                    </span>
                  )}

                </div>

                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                  This is the identity KIVO Hosts can use to recognize you when reviewing charging requests.
                </p>

              </div>


              <div className="shrink-0">

                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50">

                  {uploading
                    ? "Uploading..."
                    : "Change photo"}

                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={
                      handlePhotoChange
                    }
                    className="hidden"
                  />

                </label>

              </div>

            </div>

          </div>

        </section>


        {/* =====================================================
            EDITABLE PROFILE
        ====================================================== */}

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.55fr)]">

          <div className="space-y-6">

            {/* PUBLIC PROFILE */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">
                  Public profile
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-slate-950">
                  How Hosts see you
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep this friendly and useful. Your private KIVO account email stays separate.
                </p>
              </div>


              <div className="mt-7 grid gap-5">

                <div>

                  <label
                    htmlFor="publicAlias"
                    className="text-xs font-black text-slate-700"
                  >
                    Public name or alias
                  </label>

                  <input
                    id="publicAlias"
                    value={publicAlias}
                    onChange={(event) =>
                      setPublicAlias(
                        event.target.value
                      )
                    }
                    maxLength={60}
                    placeholder="How should Hosts know you?"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />

                </div>


                <div>

                  <div className="flex items-center justify-between gap-3">

                    <label
                      htmlFor="bio"
                      className="text-xs font-black text-slate-700"
                    >
                      About me
                    </label>

                    <span className="text-[11px] text-slate-400">
                      {bio.length}/500
                    </span>

                  </div>

                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) =>
                      setBio(
                        event.target.value
                      )
                    }
                    maxLength={500}
                    rows={5}
                    placeholder="A little about you, your EV travel, or what makes you a considerate guest..."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />

                </div>


                <div>

                  <label
                    htmlFor="homeArea"
                    className="text-xs font-black text-slate-700"
                  >
                    Home area
                  </label>

                  <input
                    id="homeArea"
                    value={homeArea}
                    onChange={(event) =>
                      setHomeArea(
                        event.target.value
                      )
                    }
                    maxLength={120}
                    placeholder="Katy, TX"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Use a city or general area — not your exact address.
                  </p>

                </div>

              </div>

            </div>


            {/* VEHICLE */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">

              <div className="flex items-center gap-3">

                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-50 text-lg">
                  🚙
                </span>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Your EV
                  </p>

                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    Charging compatibility
                  </h2>
                </div>

              </div>


              <div className="mt-6 grid gap-5 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="vehicle"
                    className="text-xs font-black text-slate-700"
                  >
                    Vehicle
                  </label>

                  <input
                    id="vehicle"
                    value={vehicle}
                    onChange={(event) =>
                      setVehicle(
                        event.target.value
                      )
                    }
                    maxLength={120}
                    placeholder="Tesla Model Y"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />

                </div>


                <div>

                  <label
                    htmlFor="connector"
                    className="text-xs font-black text-slate-700"
                  >
                    Connector
                  </label>

                  <input
                    id="connector"
                    value={connector}
                    onChange={(event) =>
                      setConnector(
                        event.target.value
                      )
                    }
                    maxLength={80}
                    placeholder="NACS / J1772 / CCS1"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:bg-white"
                  />

                </div>

              </div>

            </div>


            {/* SAVE */}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-4">

              <button
                type="button"
                disabled={
                  saving ||
                  uploading
                }
                onClick={() =>
                  void saveProfile()
                }
                className="rounded-xl bg-cyan-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save profile"}
              </button>

              {saved && (
                <span className="text-sm font-bold text-emerald-700">
                  ✓ Profile saved
                </span>
              )}

            </div>

          </div>


          {/* =================================================
              RIGHT COLUMN
          ================================================== */}

          <aside className="space-y-6">

            {/* TRUST */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-xl">
                🛡️
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                Trust & safety
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                Your KIVO status
              </h2>


              <div className="mt-6 space-y-3">

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">

                  <span className="text-sm font-semibold text-slate-700">
                    Identity
                  </span>

                  <span className={
                    verified
                      ? "text-xs font-black text-emerald-700"
                      : "text-xs font-black text-amber-700"
                  }>
                    {verified
                      ? "VERIFIED"
                      : "PENDING"}
                  </span>

                </div>


                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">

                  <span className="text-sm font-semibold text-slate-700">
                    Booking
                  </span>

                  <span className={
                    profile?.bookingReady
                      ? "text-xs font-black text-emerald-700"
                      : "text-xs font-black text-amber-700"
                  }>
                    {profile?.bookingReady
                      ? "READY"
                      : "INCOMPLETE"}
                  </span>

                </div>


                <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3.5">

                  <span className="text-sm font-semibold text-slate-700">
                    Driver status
                  </span>

                  <span className="text-xs font-black uppercase text-slate-700">
                    {profile?.status ||
                      "—"}
                  </span>

                </div>

              </div>

            </div>


            {/* PRIVACY */}

            <div className="rounded-[28px] border border-cyan-100 bg-cyan-50/60 p-6">

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl">
                🔒
              </div>

              <h2 className="mt-5 text-lg font-black text-slate-950">
                What stays private
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your KIVO account email and sensitive account information are not part of your public Driver identity.
              </p>

              <div className="mt-5 rounded-2xl bg-white px-4 py-4">

                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Account email
                </p>

                <p className="mt-1 break-all text-sm font-bold text-slate-800">
                  {profile?.email}
                </p>

              </div>

              <Link
                href="/account"
                className="mt-5 inline-flex text-sm font-black text-cyan-700"
              >
                Manage KIVO account →
              </Link>

            </div>


            {/* HOST VIEW PREVIEW */}

            <div className="rounded-[28px] border border-slate-200 bg-white p-6">

              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Host preview
              </p>

              <h2 className="mt-2 text-lg font-black text-slate-950">
                What a Host can recognize
              </h2>


              <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-slate-50 p-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-950 text-lg font-black text-white">

                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    avatarInitial
                  )}

                </div>

                <div className="min-w-0">

                  <p className="truncate font-black text-slate-950">
                    {publicAlias ||
                      "KIVO Driver"}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {vehicle ||
                      "Vehicle not added"}
                    {connector
                      ? ` · ${connector}`
                      : ""}
                  </p>

                  {verified && (
                    <p className="mt-1 text-xs font-black text-emerald-700">
                      ✓ Verified Driver
                    </p>
                  )}

                </div>

              </div>

            </div>

          </aside>

        </section>

      </div>

    </KivoDriverShell>
  );
}
