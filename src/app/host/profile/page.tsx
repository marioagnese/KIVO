"use client";

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

import KivoHostShell from "@/components/host/KivoHostShell";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  storage,
} from "@/lib/firebase";


type HostProfile = {
  uid: string;
  email: string;
  phone: string;

  displayName: string;
  publicAlias: string;
  bio: string;
  photoPath: string;

  identitySafety: {
    status: string;
  };

  status: string;
  activatedAt: string | null;
};


export default function HostProfilePage() {
  const {
    user,
    loading: authLoading,
    hasRole,
  } = useAuth();

  const [
    profile,
    setProfile,
  ] =
    useState<HostProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    uploading,
    setUploading,
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

  const [
    photoUrl,
    setPhotoUrl,
  ] =
    useState("");

  const [
    publicAlias,
    setPublicAlias,
  ] =
    useState("");

  const [
    bio,
    setBio,
  ] =
    useState("");


  const hostAuthorized =
    !authLoading &&
    !!user &&
    hasRole("host");


  const initials =
    useMemo(() => {
      const source =
        publicAlias ||
        profile?.displayName ||
        "KH";

      return source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(
          (part) =>
            part[0]?.toUpperCase() ??
            ""
        )
        .join("");
    }, [
      publicAlias,
      profile?.displayName,
    ]);


  const memberSince =
    useMemo(() => {
      if (
        !profile?.activatedAt
      ) {
        return "Active Host";
      }

      const date =
        new Date(
          profile.activatedAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return "Active Host";
      }

      return new Intl.DateTimeFormat(
        "en-US",
        {
          month: "long",
          year: "numeric",
        }
      ).format(date);
    }, [
      profile?.activatedAt,
    ]);


  /* =========================================================
     LOAD PROFILE
  ========================================================= */

  useEffect(() => {
    if (
      !hostAuthorized ||
      !user
    ) {
      return;
    }

    void loadProfile();
  }, [
    hostAuthorized,
    user,
  ]);


  async function loadProfile() {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/host/profile",
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
          "Could not load Host profile."
        );
      }

      const nextProfile =
        payload.profile as HostProfile;

      setProfile(
        nextProfile
      );

      setPublicAlias(
        nextProfile.publicAlias
      );

      setBio(
        nextProfile.bio
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
      } else {
        setPhotoUrl("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load Host profile."
      );
    } finally {
      setLoading(false);
    }
  }


  /* =========================================================
     PHOTO UPLOAD
  ========================================================= */

  async function handlePhotoChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (
      !file ||
      !user ||
      !storage ||
      !profile
    ) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
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
        `hostProfiles/${user.uid}/profile-${Date.now()}-${safeName}`;

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
          : "Could not upload Host profile photo."
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
          "/api/host/profile",
          {
            method: "PATCH",

            headers: {
              authorization:
                `Bearer ${token}`,

              "content-type":
                "application/json",
            },

            body:
              JSON.stringify({
                publicAlias,
                bio,

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
          "Could not save Host profile."
        );
      }

      setProfile(
        (current) =>
          current
            ? {
                ...current,
                ...payload.profile,

                email:
                  current.email,

                phone:
                  current.phone,

                activatedAt:
                  current.activatedAt,
              }
            : current
      );

      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save Host profile."
      );
    } finally {
      setSaving(false);
    }
  }


  /* =========================================================
     AUTH / LOADING
  ========================================================= */

  if (
    authLoading ||
    !hostAuthorized
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
    <KivoHostShell active="profile">

      <div className="mx-auto max-w-[1180px] px-5 pb-16 pt-8 sm:px-7 sm:pt-10">

        {loading ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-bold text-slate-500">
              Loading your Host profile...
            </p>
          </section>
        ) : !profile ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">

            <h1 className="text-2xl font-black text-slate-950">
              Host profile unavailable
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              KIVO could not load your active Host profile.
            </p>

            {error && (
              <p className="mt-4 text-sm font-bold text-rose-700">
                {error}
              </p>
            )}

          </section>
        ) : (
          <>

            {/* =====================================================
                PROFILE HERO
            ====================================================== */}

            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">

              <div className="bg-gradient-to-r from-emerald-50 via-white to-slate-50 px-6 py-8 sm:px-9 sm:py-10">

                <div className="flex flex-col gap-7 sm:flex-row sm:items-center">

                  <div className="relative shrink-0">

                    <div className="relative flex h-32 w-32 min-h-32 min-w-32 max-h-32 max-w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-emerald-950 text-4xl font-black text-white shadow-xl">

                      {photoUrl ? (
                        <img
                          src={
                            photoUrl
                          }
                          alt="Host profile"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {initials}
                        </span>
                      )}

                    </div>


                    <label className="absolute -bottom-2 left-1/2 -translate-x-1/2 cursor-pointer whitespace-nowrap rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg">

                      {uploading
                        ? "Uploading..."
                        : photoUrl
                          ? "Change photo"
                          : "Add photo"}

                      <input
                        type="file"
                        accept="image/*"
                        disabled={
                          uploading ||
                          saving
                        }
                        onChange={
                          handlePhotoChange
                        }
                        className="hidden"
                      />

                    </label>

                  </div>


                  <div className="min-w-0 flex-1">

                    <div className="flex flex-wrap items-center gap-3">

                      <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                        {publicAlias ||
                          profile.displayName}
                      </h1>

                      {profile
                        .identitySafety
                        .status ===
                        "verified" && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-emerald-800">
                          ✓ Verified
                        </span>
                      )}

                    </div>

                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                      This is your Host identity on KIVO. We carried forward the information you already provided during onboarding and activation.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">

                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm">
                        KivoHost
                      </span>

                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black capitalize text-slate-600 shadow-sm">
                        {profile.status ||
                          "active"}
                      </span>

                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm">
                        Since {memberSince}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            </section>


            <div className="mt-7 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">

              {/* =================================================
                  LEFT — PUBLIC HOST IDENTITY
              ================================================== */}

              <div className="space-y-7">

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                    Public Host identity
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    About you
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    These fields help Drivers know who they are requesting to charge with. KIVO has already filled them using your approved Host information.
                  </p>


                  <label className="mt-7 block">

                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Public Host name
                    </span>

                    <input
                      value={
                        publicAlias
                      }
                      maxLength={60}
                      onChange={(
                        event
                      ) => {
                        setSaved(false);

                        setPublicAlias(
                          event.target.value
                        );
                      }}
                      className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-400"
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      This is the name Drivers may see with your Host identity.
                    </p>

                  </label>


                  <label className="mt-6 block">

                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      About you
                    </span>

                    <textarea
                      rows={5}
                      value={
                        bio
                      }
                      maxLength={500}
                      onChange={(
                        event
                      ) => {
                        setSaved(false);

                        setBio(
                          event.target.value
                        );
                      }}
                      placeholder="Tell Drivers a little about you as a KIVO Host."
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-emerald-400"
                    />

                    <span className="mt-1 block text-right text-xs text-slate-400">
                      {bio.length}/500
                    </span>

                  </label>


                  {error && (
                    <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
                      {error}
                    </div>
                  )}


                  <div className="mt-7 flex flex-wrap items-center gap-4">

                    <button
                      type="button"
                      disabled={
                        saving ||
                        uploading
                      }
                      onClick={() =>
                        void saveProfile()
                      }
                      className="rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                </section>


                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Already completed
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Your Host setup stays intact
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    You do not need to enter your property, charger, parking, amenities, availability or verification information again. Those remain connected to your existing KIVO Host account.
                  </p>

                </section>

              </div>


              {/* =================================================
                  RIGHT — TRUST + PRIVATE ACCOUNT
              ================================================== */}

              <div className="space-y-7">

                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Trust & safety
                  </p>

                  <div className="mt-5 rounded-2xl bg-emerald-50 p-5">

                    <p className="text-sm font-black text-emerald-950">
                      {profile
                        .identitySafety
                        .status ===
                        "verified"
                        ? "✓ Identity verified"
                        : "KIVO Host verification"}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-emerald-800">
                      Your existing Host verification remains attached to this account. No verification redo is required here.
                    </p>

                  </div>

                </section>


                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Private account
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    Contact information
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    These details are private account information and are not part of your public Host profile.
                  </p>


                  <div className="mt-5 space-y-4">

                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Email
                      </p>

                      <p className="mt-2 break-all text-sm font-bold text-slate-800">
                        {profile.email ||
                          "—"}
                      </p>

                    </div>


                    <div className="rounded-2xl bg-slate-50 p-4">

                      <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
                        Phone
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {profile.phone ||
                          "—"}
                      </p>

                    </div>

                  </div>

                </section>


                <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">

                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Host profile preview
                  </p>

                  <div className="mt-5 flex items-center gap-4">

                    <div className="relative flex h-16 w-16 min-h-16 min-w-16 overflow-hidden rounded-full bg-emerald-950 text-lg font-black text-white">

                      {photoUrl ? (
                        <img
                          src={
                            photoUrl
                          }
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <span className="m-auto">
                          {initials}
                        </span>
                      )}

                    </div>


                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        <p className="truncate font-black text-slate-950">
                          {publicAlias ||
                            profile.displayName}
                        </p>

                        {profile
                          .identitySafety
                          .status ===
                          "verified" && (
                          <span className="text-xs font-black text-emerald-700">
                            ✓ VERIFIED
                          </span>
                        )}

                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {bio ||
                          "KIVO Host"}
                      </p>

                    </div>

                  </div>

                </section>

              </div>

            </div>

          </>
        )}

      </div>

    </KivoHostShell>
  );
}
