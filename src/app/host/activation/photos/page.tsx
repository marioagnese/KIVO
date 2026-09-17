"use client";

import { onAuthStateChanged } from "firebase/auth";

import { ref, uploadBytes } from "firebase/storage";

import { FormEvent, useEffect, useState } from "react";

import { auth, storage } from "@/lib/firebase";

type PhotoKey = "charger" | "parking" | "arrival";

type ExistingPhotos = Record<PhotoKey, string>;

type SelectedPhotos = Record<PhotoKey, File | null>;

const emptyExisting: ExistingPhotos = {
  charger: "",
  parking: "",
  arrival: "",
};

const emptySelected: SelectedPhotos = {
  charger: null,
  parking: null,
  arrival: null,
};

export default function HostActivationPhotosPage() {
  const [existingPhotos, setExistingPhotos] =
    useState<ExistingPhotos>(emptyExisting);

  const [selectedPhotos, setSelectedPhotos] =
    useState<SelectedPhotos>(emptySelected);

  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    "checking",
  );

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setStatus("error");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setError("Sign in to your KIVO Host account to continue.");
        setStatus("error");
        return;
      }

      void loadExistingPhotos();
    });

    return unsubscribe;
  }, []);

  async function loadExistingPhotos() {
    if (!auth?.currentUser) {
      return;
    }

    try {
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await fetch("/api/host/activation-access", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to load Host activation.");
      }

      const photos = result.existingSetup?.photos ?? {};

      setExistingPhotos({
        charger: typeof photos.charger === "string" ? photos.charger : "",

        parking: typeof photos.parking === "string" ? photos.parking : "",

        arrival: typeof photos.arrival === "string" ? photos.arrival : "",
      });

      setStatus("ready");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load Host photos.",
      );

      setStatus("error");
    }
  }

  function selectPhoto(key: PhotoKey, file: File | null) {
    setSelectedPhotos((current) => ({
      ...current,
      [key]: file,
    }));
  }

  async function submitPhotos(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth?.currentUser || !storage) {
      setError("KIVO photo upload is unavailable.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const uid = auth.currentUser.uid;

      const finalPaths: ExistingPhotos = {
        ...existingPhotos,
      };

      const keys: PhotoKey[] = ["charger", "parking", "arrival"];

      for (const key of keys) {
        const file = selectedPhotos[key];

        if (!file) {
          continue;
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);

        const path =
          `hostOnboarding/${uid}/photos/` + `${key}-${Date.now()}-${safeName}`;

        await uploadBytes(ref(storage, path), file, {
          contentType: file.type || "application/octet-stream",
        });

        finalPaths[key] = path;
      }

      const missing = keys.filter((key) => !finalPaths[key]);

      if (missing.length > 0) {
        throw new Error(
          "Add the charger, parking-space and arrival-view photos before continuing.",
        );
      }

      const idToken = await auth.currentUser.getIdToken(true);

      const response = await fetch("/api/host/activation-photos-complete", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",

          Authorization: `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          photos: finalPaths,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "KIVO could not verify your Host photos.",
        );
      }

      window.location.href = "/host/activation";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save Host photos.",
      );

      setSaving(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-lg font-bold text-slate-300">
            Loading your Host photos...
          </p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-black">Host photos</h1>

          <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-red-200">
            {error}
          </div>

          <a
            href="/host/activation"
            className="mt-6 inline-flex rounded-full border border-white/15 px-6 py-3 font-black text-white"
          >
            ← Back to activation
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          KIVO HOST ACTIVATION
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Add your charging photos.
        </h1>

        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
          These photos help KIVO confirm the charger and arrival setup before
          your Host listing can become active.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.06] p-5">
          <p className="font-black text-emerald-200">
            Required before payout setup
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            If you already uploaded a photo earlier, KIVO keeps it. You only
            need to add anything that is still missing.
          </p>
        </div>

        <form onSubmit={submitPhotos} className="mt-8 space-y-5">
          <PhotoField
            label="Charger photo"
            description="A clear photo showing the EV charger."
            existing={Boolean(existingPhotos.charger)}
            file={selectedPhotos.charger}
            onChange={(file) => selectPhoto("charger", file)}
          />

          <PhotoField
            label="Parking-space photo"
            description="Show where the Driver's vehicle would park while charging."
            existing={Boolean(existingPhotos.parking)}
            file={selectedPhotos.parking}
            onChange={(file) => selectPhoto("parking", file)}
          />

          <PhotoField
            label="Arrival-view photo"
            description="Show the view a Driver is likely to see when approaching the charging location."
            existing={Boolean(existingPhotos.arrival)}
            file={selectedPhotos.arrival}
            onChange={(file) => selectPhoto("arrival", file)}
          />

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 font-semibold text-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {saving ? "Verifying photos..." : "Save photos & continue →"}
            </button>

            <a
              href="/host/activation"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-7 py-4 font-black text-white"
            >
              Back
            </a>
          </div>
        </form>
      </div>
    </main>
  );
}

function PhotoField({
  label,
  description,
  existing,
  file,
  onChange,
}: {
  label: string;
  description: string;
  existing: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block rounded-[24px] border border-white/10 bg-[#07111f] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-black text-white">{label}</p>

          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>

        {existing && !file && (
          <span className="shrink-0 rounded-full bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-300">
            ✓ Saved
          </span>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className="mt-5 block w-full text-sm text-slate-300"
      />

      {file && (
        <p className="mt-3 text-sm font-bold text-emerald-300">
          Selected: {file.name}
        </p>
      )}
    </label>
  );
}
