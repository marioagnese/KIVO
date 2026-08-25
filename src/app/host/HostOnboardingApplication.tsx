"use client";

import { useEffect, useMemo, useState } from "react";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
} from "firebase/storage";

import { auth, db, storage } from "@/lib/firebase";

type SetupState = {
  chargerBrand: string;
  chargerModel: string;
  connector: string;
  chargerPower: string;
  smartCharger: string;

  propertySetup: string;
  gatedAccess: string;
  parkingDetails: string;
  accessNotes: string;

  availability: string[];
  approvalPreference: string;
  maxSession: string;
  interactionPreference: string;
  amenities: string[];
  notes: string;
};

type PhotoState = {
  charger: File | null;
  parking: File | null;
  arrival: File | null;
  extra: File | null;
};

const initialSetup: SetupState = {
  chargerBrand: "",
  chargerModel: "",
  connector: "",
  chargerPower: "",
  smartCharger: "",

  propertySetup: "",
  gatedAccess: "",
  parkingDetails: "",
  accessNotes: "",

  availability: [],
  approvalPreference: "Manual approval",
  maxSession: "",
  interactionPreference: "",
  amenities: [],
  notes: "",
};

const steps = [
  { number: 1, title: "Your charger" },
  { number: 2, title: "Parking & access" },
  { number: 3, title: "Photos" },
  { number: 4, title: "Hosting preferences" },
];

const amenityOptions = [
  "Restroom",
  "Wi-Fi",
  "Coffee",
  "Waiting area",
  "Covered parking",
  "Outdoor seating",
  "Pet friendly",
];

const availabilityOptions = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekday evenings",
  "Weekends",
  "Overnight",
  "Varies — I’ll approve individually",
];

type HostLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  parkingSetup: string;
  chargerStatus: string;
};

export default function HostOnboardingApplication({
  lead,
}: {
  lead: HostLead;
}) {
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState<SetupState>(initialSetup);
  const [photos, setPhotos] = useState<PhotoState>({
    charger: null,
    parking: null,
    arrival: null,
    extra: null,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submittedForReview, setSubmittedForReview] = useState(false);

  useEffect(() => {
    void initializeOnboarding();
  }, []);

  async function initializeOnboarding() {
    if (!auth?.currentUser || !db) {
      return;
    }

    try {
      await setDoc(
        doc(db, "hostOnboarding", auth.currentUser.uid),
        {
          uid: auth.currentUser.uid,
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          phone: lead.phone,
          postalCode: lead.postalCode,
          status: "onboarding",
          currentStep: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Unable to initialize Host onboarding:", err);
      setError("We couldn't save your Host setup yet.");
    }
  }

  async function uploadPhotos() {
    if (!auth?.currentUser || !storage || !db) {
      setError("KIVO photo upload is temporarily unavailable.");
      return false;
    }

    const uid = auth.currentUser.uid;

    const uploads: Array<{
      key: "charger" | "parking" | "arrival" | "extra";
      file: File | null;
    }> = [
      { key: "charger", file: photos.charger },
      { key: "parking", file: photos.parking },
      { key: "arrival", file: photos.arrival },
      { key: "extra", file: photos.extra },
    ];

    setUploadingPhotos(true);
    setError("");

    try {
      const photoPaths: Record<string, string> = {};

      for (const item of uploads) {
        if (!item.file) continue;

        const safeName = item.file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_")
          .slice(-120);

        const path =
          `hostOnboarding/${uid}/photos/${item.key}-${Date.now()}-${safeName}`;

        const storageRef = ref(storage, path);

        await uploadBytes(storageRef, item.file, {
          contentType: item.file.type,
        });

        photoPaths[item.key] = path;
      }

      await setDoc(
        doc(db, "hostOnboarding", uid),
        {
          photos: photoPaths,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return true;
    } catch (err) {
      console.error("Unable to upload Host onboarding photos:", err);
      setError("We couldn't upload your photos yet. Please try again.");
      return false;
    } finally {
      setUploadingPhotos(false);
    }
  }

  async function saveProgress(nextStep?: number) {
    if (!auth?.currentUser || !db) {
      setError("KIVO Host setup is temporarily unavailable.");
      return false;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      await setDoc(
        doc(db, "hostOnboarding", auth.currentUser.uid),
        {
          uid: auth.currentUser.uid,
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          phone: lead.phone,
          postalCode: lead.postalCode,
          status: "onboarding",
          currentStep: nextStep ?? step,
          charger: {
            brand: setup.chargerBrand,
            model: setup.chargerModel,
            connector: setup.connector,
            power: setup.chargerPower,
            smartCharger: setup.smartCharger,
          },
          property: {
            setup: setup.propertySetup,
            gatedAccess: setup.gatedAccess,
            parkingDetails: setup.parkingDetails,
            accessNotes: setup.accessNotes,
          },
          hosting: {
            availability: setup.availability,
            approvalPreference: setup.approvalPreference,
            maxSession: setup.maxSession,
            interactionPreference: setup.interactionPreference,
            amenities: setup.amenities,
            notes: setup.notes,
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaved(true);
      return true;
    } catch (err) {
      console.error("Unable to save Host onboarding:", err);
      setError("We couldn't save your Host setup yet.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof SetupState>(
    field: K,
    value: SetupState[K]
  ) {
    setSetup((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleArrayField(
    field: "availability" | "amenities",
    value: string
  ) {
    setSetup((current) => {
      const values = current[field];

      return {
        ...current,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  }

  function validateCurrentStep() {
    setError("");

    if (step === 1) {
      if (!setup.connector) {
        setError("Select the connector your charger uses.");
        return false;
      }

      if (!setup.chargerPower) {
        setError("Select the closest charger power.");
        return false;
      }
    }

    if (step === 2) {
      if (!setup.propertySetup) {
        setError("Tell us where the Driver would park.");
        return false;
      }

      if (!setup.gatedAccess) {
        setError("Tell us whether the property has gated access.");
        return false;
      }
    }

    if (step === 3) {
      if (!photos.charger || !photos.parking || !photos.arrival) {
        setError(
          "Please add the charger, parking-space, and arrival-view photos."
        );
        return false;
      }
    }

    if (step === 4) {
      if (setup.availability.length === 0) {
        setError("Choose at least one likely availability window.");
        return false;
      }

      if (!setup.maxSession) {
        setError("Choose a maximum session length.");
        return false;
      }
    }

    return true;
  }

  async function nextStep() {
    if (!validateCurrentStep()) return;

    const next = Math.min(step + 1, 5);

    if (step === 3) {
      const uploaded = await uploadPhotos();

      if (!uploaded) return;
    }

    const ok = await saveProgress(next);

    if (!ok) return;

    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForReview() {
    if (!auth?.currentUser || !db) {
      setError("KIVO Host setup is temporarily unavailable.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await setDoc(
        doc(db, "hostOnboarding", auth.currentUser.uid),
        {
          uid: auth.currentUser.uid,
          leadId: lead.id,
          email: lead.email,
          name: lead.name,
          phone: lead.phone,
          postalCode: lead.postalCode,

          status: "review_pending",
          currentStep: 5,

          charger: {
            brand: setup.chargerBrand,
            model: setup.chargerModel,
            connector: setup.connector,
            power: setup.chargerPower,
            smartCharger: setup.smartCharger,
          },

          property: {
            setup: setup.propertySetup,
            gatedAccess: setup.gatedAccess,
            parkingDetails: setup.parkingDetails,
            accessNotes: setup.accessNotes,
          },

          hosting: {
            availability: setup.availability,
            approvalPreference: setup.approvalPreference,
            maxSession: setup.maxSession,
            interactionPreference: setup.interactionPreference,
            amenities: setup.amenities,
            notes: setup.notes,
          },

          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      try {
        const idToken = await auth.currentUser.getIdToken(true);

        const response = await fetch(
          "/api/host/onboarding-complete-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              leadId: lead.id,
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json().catch(() => null);

          console.error(
            "KIVO onboarding completion email failed:",
            result?.error || response.statusText
          );
        }
      } catch (emailError) {
        console.error(
          "KIVO onboarding completion email failed:",
          emailError
        );
      }

      setSubmittedForReview(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Unable to submit Host onboarding:", err);
      setError(
        "We couldn't submit your Host setup for review yet. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progress = useMemo(() => {
    return Math.min(step, 4) * 25;
  }, [step]);

  if (submittedForReview) {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">

          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/10 text-3xl">
            ✓
          </div>

          <p className="mt-7 text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
            KIVO HOST SETUP
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Setup received.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-300 sm:text-xl">
            Thanks, {lead.name}. Your Founding Host setup has been submitted
            for KIVO review.
          </p>

          <div className="mt-8 rounded-3xl border border-white/10 bg-[#07111f] p-6 sm:p-8">
            <p className="text-xl font-black text-white">
              Nothing is public or bookable yet.
            </p>

            <p className="mt-3 text-base leading-7 text-slate-300">
              KIVO will review your charger, parking access, photos and hosting
              preferences before moving you to the remaining approval and
              safety-screening steps.
            </p>
          </div>

          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-6">
            <p className="font-black text-emerald-100">
              What happens next?
            </p>

            <p className="mt-2 text-base leading-7 text-slate-300">
              We’ll contact you when your setup has been reviewed. You remain
              in control of whether and when your charger becomes available.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (step === 5) {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-10 text-white sm:px-8 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
            KIVO HOST SETUP
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Your setup looks ready.
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Review the information below. Nothing is public or bookable yet.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <ReviewCard
              title="Charger"
              lines={[
                setup.chargerBrand || "Brand not specified",
                setup.chargerModel || "Model not specified",
                setup.connector,
                setup.chargerPower,
              ]}
            />

            <ReviewCard
              title="Parking & access"
              lines={[
                setup.propertySetup,
                setup.gatedAccess,
                setup.parkingDetails || "No additional parking details",
              ]}
            />

            <ReviewCard
              title="Photos"
              lines={[
                photos.charger?.name || "Charger photo",
                photos.parking?.name || "Parking photo",
                photos.arrival?.name || "Arrival photo",
                photos.extra?.name || "No extra photo",
              ]}
            />

            <ReviewCard
              title="Hosting preferences"
              lines={[
                setup.availability.join(", "),
                setup.approvalPreference,
                setup.maxSession,
                setup.interactionPreference || "No preference selected",
              ]}
            />
          </div>

          <div className="mt-8 rounded-3xl border border-emerald-300/20 bg-emerald-300/[0.07] p-6">
            <p className="text-lg font-black text-white">
              Ready for KIVO review?
            </p>

            <p className="mt-2 text-base leading-7 text-slate-300">
              Submitting your setup sends it to KIVO for review. Your charger
              will not become public or bookable automatically.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-base font-semibold text-red-200">
              {error}
            </div>
          )}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={saving}
              className="rounded-full border border-white/15 px-6 py-3.5 text-base font-bold text-white transition hover:bg-white/[0.06] disabled:opacity-50"
            >
              ← Edit setup
            </button>

            <button
              type="button"
              onClick={submitForReview}
              disabled={saving}
              className="rounded-full bg-emerald-400 px-8 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
            >
              {saving ? "Submitting..." : "Submit setup for KIVO review →"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
            KIVO FOUNDING HOST
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Complete your Host setup.
          </h1>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
            You’ve been invited to continue as a KIVO Founding Host. We’ll keep
            this simple and only ask for what we need to understand your charger
            and how Drivers would access it.
          </p>

          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {steps.map((item) => {
              const active = item.number === step;
              const completed = item.number < step;

              return (
                <div key={item.number}>
                  <div
                    className={`text-sm font-black ${
                      active
                        ? "text-white"
                        : completed
                          ? "text-emerald-300"
                          : "text-slate-600"
                    }`}
                  >
                    {completed ? "✓" : item.number}
                  </div>

                  <p
                    className={`mt-1 hidden text-sm font-semibold sm:block ${
                      active ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {item.title}
                  </p>
                </div>
              );
            })}
          </div>
        </header>

        <section className="mt-9 rounded-[32px] border border-white/10 bg-[#07111f] p-6 shadow-2xl sm:p-9">
          {step === 1 && (
            <>
              <StepHeading
                eyebrow="STEP 1 OF 4"
                title="Tell us about your charger."
                description="Basic charger information helps us match compatible vehicles. If you don’t know every detail, that’s okay."
              />

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <TextField
                  label="Charger brand"
                  value={setup.chargerBrand}
                  placeholder="Tesla, ChargePoint, Emporia..."
                  onChange={(value) => updateField("chargerBrand", value)}
                />

                <TextField
                  label="Model"
                  value={setup.chargerModel}
                  placeholder="Optional"
                  onChange={(value) => updateField("chargerModel", value)}
                />
              </div>

              <ChoiceSection
                title="Connector"
                required
                options={["NACS / Tesla", "J1772", "Both / adapter available", "Not sure"]}
                value={setup.connector}
                onChange={(value) => updateField("connector", value)}
              />

              <ChoiceSection
                title="Charger power"
                required
                options={[
                  "Up to 32A",
                  "40A",
                  "48A",
                  "80A",
                  "Not sure",
                ]}
                value={setup.chargerPower}
                onChange={(value) => updateField("chargerPower", value)}
              />

              <ChoiceSection
                title="Is the charger connected to an app or Wi-Fi?"
                options={["Yes", "No", "Not sure"]}
                value={setup.smartCharger}
                onChange={(value) => updateField("smartCharger", value)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <StepHeading
                eyebrow="STEP 2 OF 4"
                title="Where would the Driver park?"
                description="We care about the actual charging experience — where the car goes, how the Driver gets there, and anything they need to know."
              />

              <ChoiceSection
                title="Charging location"
                required
                options={[
                  "Outdoor driveway",
                  "Garage",
                  "Covered parking",
                  "Dedicated parking space",
                  "Other",
                ]}
                value={setup.propertySetup}
                onChange={(value) => updateField("propertySetup", value)}
              />

              <ChoiceSection
                title="Is there gated or controlled access?"
                required
                options={[
                  "No gate",
                  "Yes — gate code or instructions needed",
                  "Yes — I need to let the Driver in",
                  "Other",
                ]}
                value={setup.gatedAccess}
                onChange={(value) => updateField("gatedAccess", value)}
              />

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <TextAreaField
                  label="Where should the Driver park?"
                  value={setup.parkingDetails}
                  placeholder="Example: right side of the driveway beside the garage."
                  onChange={(value) => updateField("parkingDetails", value)}
                />

                <TextAreaField
                  label="Anything important about access?"
                  value={setup.accessNotes}
                  placeholder="Gate, alley, steep driveway, HOA rules, etc."
                  onChange={(value) => updateField("accessNotes", value)}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <StepHeading
                eyebrow="STEP 3 OF 4"
                title="Show us what arrival looks like."
                description="Three quick photos help prevent confusion before the first Driver ever arrives."
              />

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <PhotoUpload
                  title="1. Charger"
                  description="A clear close-up of the actual charger and connector."
                  required
                  file={photos.charger}
                  onChange={(file) =>
                    setPhotos((current) => ({ ...current, charger: file }))
                  }
                />

                <PhotoUpload
                  title="2. Parking space"
                  description="Show exactly where the Driver’s vehicle would park."
                  required
                  file={photos.parking}
                  onChange={(file) =>
                    setPhotos((current) => ({ ...current, parking: file }))
                  }
                />

                <PhotoUpload
                  title="3. Arrival view"
                  description="A wider view showing what the Driver sees when approaching."
                  required
                  file={photos.arrival}
                  onChange={(file) =>
                    setPhotos((current) => ({ ...current, arrival: file }))
                  }
                />
              </div>

              <div className="mt-5">
                <PhotoUpload
                  title="Optional access detail"
                  description="Gate, garage entrance, alley, cable path, or anything else that would make arrival easier."
                  file={photos.extra}
                  onChange={(file) =>
                    setPhotos((current) => ({ ...current, extra: file }))
                  }
                />
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-5">
                <p className="font-black text-white">
                  Keep personal details out of the photos.
                </p>

                <p className="mt-2 text-base leading-7 text-slate-300">
                  Avoid people, house interiors, license plates, mail, security
                  screens or anything you would not want an approved Driver to
                  see.
                </p>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <StepHeading
                eyebrow="STEP 4 OF 4"
                title="You stay in control."
                description="Choose what generally works for you. These preferences can change later."
              />

              <MultiChoiceSection
                title="When might you usually be available?"
                options={availabilityOptions}
                values={setup.availability}
                onToggle={(value) => toggleArrayField("availability", value)}
              />

              <ChoiceSection
                title="Booking approval"
                options={[
                  "Manual approval",
                  "Automatically approve matching requests",
                ]}
                value={setup.approvalPreference}
                onChange={(value) =>
                  updateField("approvalPreference", value)
                }
              />

              <ChoiceSection
                title="Maximum charging session"
                required
                options={[
                  "2 hours",
                  "4 hours",
                  "6 hours",
                  "8 hours",
                  "Overnight",
                  "Decide per request",
                ]}
                value={setup.maxSession}
                onChange={(value) => updateField("maxSession", value)}
              />

              <ChoiceSection
                title="How much interaction do you prefer?"
                options={[
                  "Minimal — Driver can charge independently",
                  "Happy to say hello",
                  "Either is fine",
                ]}
                value={setup.interactionPreference}
                onChange={(value) =>
                  updateField("interactionPreference", value)
                }
              />

              <MultiChoiceSection
                title="Optional amenities"
                subtitle="Only select things you genuinely want to offer."
                options={amenityOptions}
                values={setup.amenities}
                onToggle={(value) => toggleArrayField("amenities", value)}
              />

              <div className="mt-7">
                <TextAreaField
                  label="Anything else a Driver should know?"
                  value={setup.notes}
                  placeholder="Optional"
                  onChange={(value) => updateField("notes", value)}
                />
              </div>
            </>
          )}

          {error && (
            <div className="mt-7 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-base font-semibold text-red-200">
              {error}
            </div>
          )}

          <div className="mt-9 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={previousStep}
                className="rounded-full border border-white/15 px-6 py-3.5 text-base font-bold text-white transition hover:bg-white/[0.06]"
              >
                ← Back
              </button>
            ) : (
              <span />
            )}

            <div className="flex flex-col items-end gap-2">
              {saved && (
                <p className="text-sm font-bold text-emerald-300">
                  Progress saved
                </p>
              )}

              <button
                type="button"
                onClick={nextStep}
                disabled={saving || uploadingPhotos}
                className="rounded-full bg-emerald-400 px-8 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
              >
                {uploadingPhotos
                  ? "Uploading photos..."
                  : saving
                    ? "Saving..."
                    : step === 4
                    ? "Review my setup →"
                    : "Continue →"}
              </button>
            </div>
          </div>
        </section>

        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-6 text-slate-500">
          Nothing becomes public or bookable during setup. KIVO reviews Host
          information before activation.
        </p>
      </div>
    </main>
  );
}

function StepHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-400">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-lg leading-8 text-slate-300">
        {description}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-base font-black text-slate-200">{label}</span>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-base font-black text-slate-200">{label}</span>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg leading-7 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400"
      />
    </label>
  );
}

function ChoiceSection({
  title,
  required = false,
  options,
  value,
  onChange,
}: {
  title: string;
  required?: boolean;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-8">
      <p className="text-lg font-black text-white">
        {title}
        {required ? " *" : ""}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-2xl border px-5 py-4 text-left text-base font-bold transition ${
                selected
                  ? "border-emerald-300 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              {selected ? "✓ " : ""}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MultiChoiceSection({
  title,
  subtitle,
  options,
  values,
  onToggle,
}: {
  title: string;
  subtitle?: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="mt-8">
      <p className="text-lg font-black text-white">{title}</p>

      {subtitle && (
        <p className="mt-1 text-base text-slate-400">{subtitle}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        {options.map((option) => {
          const selected = values.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`rounded-full border px-5 py-3 text-base font-bold transition ${
                selected
                  ? "border-emerald-300 bg-emerald-300/10 text-emerald-100"
                  : "border-white/10 bg-white/[0.035] text-slate-300 hover:border-white/25"
              }`}
            >
              {selected ? "✓ " : ""}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhotoUpload({
  title,
  description,
  required = false,
  file,
  onChange,
}: {
  title: string;
  description: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const preview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  return (
    <label className="block cursor-pointer rounded-3xl border border-dashed border-white/20 bg-white/[0.035] p-5 transition hover:border-emerald-300/50 hover:bg-white/[0.055]">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />

      {preview ? (
        <img
          src={preview}
          alt=""
          className="h-48 w-full rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-48 items-center justify-center rounded-2xl bg-black/20 text-5xl">
          📷
        </div>
      )}

      <p className="mt-4 text-lg font-black text-white">
        {title}
        {required ? " *" : ""}
      </p>

      <p className="mt-2 text-base leading-7 text-slate-400">
        {description}
      </p>

      <p className="mt-4 text-sm font-black text-emerald-300">
        {file ? "Change photo" : "Add photo"}
      </p>
    </label>
  );
}

function ReviewCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <p className="text-lg font-black text-white">{title}</p>

      <div className="mt-4 space-y-2">
        {lines.map((line, index) => (
          <p
            key={`${title}-${index}`}
            className="text-base leading-6 text-slate-300"
          >
            {line || "—"}
          </p>
        ))}
      </div>
    </div>
  );
}
