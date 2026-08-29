"use client";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "@/context/AuthContext";

import {
  db,
} from "@/lib/firebase";

type ProfileData = {
  displayName: string;
  location: string;

  driverVehicle: string;
  driverConnector: string;

  hostPublicName: string;
  hostBio: string;
};

const EMPTY_PROFILE: ProfileData = {
  displayName: "",
  location: "",

  driverVehicle: "",
  driverConnector: "",

  hostPublicName: "",
  hostBio: "",
};

type ProfileModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function ProfileModal({
  open,
  onClose,
}: ProfileModalProps) {
  const {
    user,
    accountTypes,
    hasRole,
  } = useAuth();

  const [
    profile,
    setProfile,
  ] = useState<ProfileData>(
    EMPTY_PROFILE
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  useEffect(() => {
    if (
      !open ||
      !user ||
      !db
    ) {
      return;
    }

    async function loadProfile() {
      if (
        !user ||
        !db
      ) {
        return;
      }

      setLoading(true);
      setError("");
      setMessage("");

      try {
        const ref =
          doc(
            db,
            "users",
            user.uid
          );

        const snapshot =
          await getDoc(ref);

        const data =
          snapshot.exists()
            ? snapshot.data()
            : {};

        setProfile({
          displayName:
            typeof data.displayName ===
            "string"
              ? data.displayName
              : "",

          location:
            typeof data.location ===
            "string"
              ? data.location
              : "",

          driverVehicle:
            typeof data.driverVehicle ===
            "string"
              ? data.driverVehicle
              : "",

          driverConnector:
            typeof data.driverConnector ===
            "string"
              ? data.driverConnector
              : "",

          hostPublicName:
            typeof data.hostPublicName ===
            "string"
              ? data.hostPublicName
              : "",

          hostBio:
            typeof data.hostBio ===
            "string"
              ? data.hostBio
              : "",
        });
      } catch (err) {
        console.error(
          "Failed to load KIVO profile:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [
    open,
    user,
  ]);

  if (
    !open ||
    !user
  ) {
    return null;
  }

  function updateField(
    field: keyof ProfileData,
    value: string
  ) {
    setProfile(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  }

  async function saveProfile() {
    if (
      !user ||
      !db
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const ref =
        doc(
          db,
          "users",
          user.uid
        );

      await setDoc(
        ref,
        {
          email:
            user.email || "",

          displayName:
            profile.displayName.trim(),

          location:
            profile.location.trim(),

          driverVehicle:
            profile.driverVehicle.trim(),

          driverConnector:
            profile.driverConnector.trim(),

          hostPublicName:
            profile.hostPublicName.trim(),

          hostBio:
            profile.hostBio.trim(),

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setMessage(
        "Profile updated ✓"
      );
    } catch (err) {
      console.error(
        "Failed to save KIVO profile:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/80 px-4 py-8 backdrop-blur-sm">
      <div className="mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 shadow-2xl sm:p-8">

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              KIVO PROFILE
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              My profile
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Manage how you appear and use KIVO.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {accountTypes.map(
            (role) => (
              <span
                key={role}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-400"
              >
                {role === "driver"
                  ? "KivoDriver"
                  : "KivoHost"}
              </span>
            )
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Account
          </p>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>

            <div className="mt-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-400">
              {user.email}
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </label>

            <input
              value={profile.displayName}
              onChange={(e) =>
                updateField(
                  "displayName",
                  e.target.value
                )
              }
              placeholder="Your name"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location
            </label>

            <input
              value={profile.location}
              onChange={(e) =>
                updateField(
                  "location",
                  e.target.value
                )
              }
              placeholder="Katy, TX"
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
            />
          </div>

          <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xl text-slate-500">
              👤
            </div>

            <p className="mt-3 text-sm font-semibold">
              Profile photo
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Photo uploads will be enabled in a future phase.
            </p>
          </div>
        </div>

        {hasRole("driver") && (
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
              KivoDriver
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Driver profile
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Help KIVO match you with compatible chargers.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vehicle
                </label>

                <input
                  value={profile.driverVehicle}
                  onChange={(e) =>
                    updateField(
                      "driverVehicle",
                      e.target.value
                    )
                  }
                  placeholder="Tesla Model Y"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Connector
                </label>

                <input
                  value={profile.driverConnector}
                  onChange={(e) =>
                    updateField(
                      "driverConnector",
                      e.target.value
                    )
                  }
                  placeholder="NACS / Tesla"
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {hasRole("host") && (
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              KivoHost
            </p>

            <h3 className="mt-2 text-xl font-bold">
              Host profile
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              Introduce yourself to drivers. Charger listings, amenities, photos and pricing remain separate from your personal profile.
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Public host name
              </label>

              <input
                value={profile.hostPublicName}
                onChange={(e) =>
                  updateField(
                    "hostPublicName",
                    e.target.value
                  )
                }
                placeholder="Mario"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                About me
              </label>

              <textarea
                value={profile.hostBio}
                onChange={(e) =>
                  updateField(
                    "hostBio",
                    e.target.value
                  )
                }
                placeholder="Tell drivers a little about you and the charging experience you provide."
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-emerald-400/20 bg-slate-950/40 p-4">
              <p className="text-sm font-semibold text-emerald-300">
                Your Host listing comes next
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Charger photos, property photos, amenities, availability, pricing and reviews will belong to individual KIVO Host listings.
              </p>
            </div>
          </div>
        )}

        {loading && (
          <p className="mt-6 text-sm text-slate-400">
            Loading profile...
          </p>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={
            loading ||
            saving
          }
          className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save profile"}
        </button>

      </div>
    </div>
  );
}
