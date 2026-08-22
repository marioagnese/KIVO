"use client";

import { FormEvent, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

type FormState = {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  connector: string;
  chargerPower: string;
  propertySetup: string;
  accessType: string;
  availability: string;
  earningsGoal: string;
  interactionPreference: string;
  amenities: string[];
  notes: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  phone: "",
  postalCode: "",
  connector: "",
  chargerPower: "",
  propertySetup: "",
  accessType: "",
  availability: "",
  earningsGoal: "",
  interactionPreference: "",
  amenities: [],
  notes: "",
};

const amenities = [
  "Restroom",
  "Wi-Fi",
  "Coffee",
  "Waiting area",
  "Covered parking",
  "Outdoor seating",
  "Pet friendly",
];

export default function FoundingHostApplication() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function toggleAmenity(value: string) {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(value)
        ? current.amenities.filter((item) => item !== value)
        : [...current.amenities, value],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.postalCode.trim()) {
      setError("Please enter your ZIP or postal code.");
      return;
    }

    if (!form.connector) {
      setError("Please select your charger connector.");
      return;
    }

    if (!form.propertySetup) {
      setError("Please tell us where your charger is installed.");
      return;
    }

    if (!form.accessType) {
      setError("Please select the access setup that best describes your property.");
      return;
    }

    if (!form.availability) {
      setError("Please select your likely availability.");
      return;
    }

    if (!db) {
      setError("KIVO applications are temporarily unavailable. Please try again shortly.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(
        collection(db, "foundingHostLeads"),
        {
          status: "new",

          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          postalCode: form.postalCode.trim().toUpperCase(),

          charger: {
            connector: form.connector,
            power: form.chargerPower,
          },

          hosting: {
            propertySetup: form.propertySetup,
            accessType: form.accessType,
            availability: form.availability,
            earningsGoal: form.earningsGoal,
            interactionPreference: form.interactionPreference,
            amenities: form.amenities,
          },

          notes: form.notes.trim(),

          source: "kivo-host-acquisition-page",
          foundingHost: true,

          createdAt: serverTimestamp(),
        }
      );

      setSubmitted(true);
    } catch (err) {
      console.error("Founding Host application failed:", err);

      setError(
        "We couldn't submit your application yet. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[28px] border border-emerald-400/25 bg-[#06101f] p-7 sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-3xl">
          ⚡
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          APPLICATION RECEIVED
        </p>

        <h3 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          You&apos;re on the Founding Host list.
        </h3>

        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
          Thanks for helping build KIVO&apos;s neighborhood charging network.
          We&apos;ll review your charger and hosting setup before anything
          becomes publicly visible.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="font-bold text-white">
            Nothing has been listed publicly.
          </p>

          <p className="mt-2 text-base leading-7 text-slate-300">
            This application only registers your interest as a Founding Host.
            A KIVO Host profile and charger listing would come later through
            the onboarding process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/10 bg-[#06101f] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            FOUNDING HOST APPLICATION
          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight text-white">
            Tell us about your charger.
          </h3>
        </div>

        <span className="text-sm font-semibold text-slate-400">
          Takes about 2 minutes
        </span>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Name *
          </span>

          <input
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="Your name"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Email *
          </span>

          <input
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="you@example.com"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Phone
          </span>

          <input
            type="tel"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            autoComplete="tel"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="Optional"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            ZIP / Postal Code *
          </span>

          <input
            type="text"
            value={form.postalCode}
            onChange={(event) =>
              updateField("postalCode", event.target.value)
            }
            autoComplete="postal-code"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
            placeholder="77494"
          />
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Charger connector *
          </span>

          <select
            value={form.connector}
            onChange={(event) =>
              updateField("connector", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select connector</option>
            <option value="J1772">J1772</option>
            <option value="NACS">NACS / Tesla</option>
            <option value="Both">Both / adapter available</option>
            <option value="Other">Other / not sure</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Charger power
          </span>

          <select
            value={form.chargerPower}
            onChange={(event) =>
              updateField("chargerPower", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select / not sure</option>
            <option value="7.7 kW">Around 7.7 kW / 32A</option>
            <option value="9.6 kW">Around 9.6 kW / 40A</option>
            <option value="11.5 kW">Around 11.5 kW / 48A</option>
            <option value="Other">Other / not sure</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Where is the charger installed? *
          </span>

          <select
            value={form.propertySetup}
            onChange={(event) =>
              updateField("propertySetup", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select setup</option>
            <option value="Exterior">Exterior / outside</option>
            <option value="Garage reaches driveway">
              Garage-mounted, cable reaches driveway
            </option>
            <option value="Garage entry required">
              Vehicle or Driver must enter garage
            </option>
            <option value="Other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Property access *
          </span>

          <select
            value={form.accessType}
            onChange={(event) =>
              updateField("accessType", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select access</option>
            <option value="Driveway only">Driveway only</option>
            <option value="Garage access optional">
              Garage access can be offered
            </option>
            <option value="Garage access required">
              Garage access required
            </option>
            <option value="Other">Other / depends on session</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            Potential availability *
          </span>

          <select
            value={form.availability}
            onChange={(event) =>
              updateField("availability", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select availability</option>
            <option value="Weekdays">Mostly weekdays</option>
            <option value="Weekends">Mostly weekends</option>
            <option value="Evenings">Mostly evenings</option>
            <option value="Flexible">Flexible / varies</option>
            <option value="Not sure">Not sure yet</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-bold text-slate-200">
            What would make hosting worthwhile?
          </span>

          <select
            value={form.earningsGoal}
            onChange={(event) =>
              updateField("earningsGoal", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select an amount</option>
            <option value="Under $50/month">Under $50 / month</option>
            <option value="$50-$100/month">$50–$100 / month</option>
            <option value="$100-$200/month">$100–$200 / month</option>
            <option value="$200+/month">$200+ / month</option>
            <option value="Community first">
              Earnings are secondary / community first
            </option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-sm font-bold text-slate-200">
            How would you prefer to host?
          </span>

          <select
            value={form.interactionPreference}
            onChange={(event) =>
              updateField(
                "interactionPreference",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a1627] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Select preference</option>
            <option value="Contactless">
              Contactless whenever possible
            </option>
            <option value="Occasional interaction">
              Fine with occasional interaction
            </option>
            <option value="Community">
              Happy to meet other EV Drivers
            </option>
            <option value="Depends">Depends on the session</option>
          </select>
        </label>
      </div>

      <div className="mt-7">
        <p className="text-sm font-bold text-slate-200">
          Optional amenities
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {amenities.map((amenity) => {
            const selected = form.amenities.includes(amenity);

            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition ${
                  selected
                    ? "border-emerald-300 bg-emerald-400/15 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25"
                }`}
              >
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-7 block">
        <span className="text-sm font-bold text-slate-200">
          Anything else we should know?
        </span>

        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-base leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
          placeholder="Charger location, parking details, installation plans, questions, or anything else that could help us understand your setup."
        />
      </label>

      {error && (
        <div className="mt-5 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-base font-semibold text-red-200">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-400 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting
          ? "Submitting..."
          : "Apply to become a Founding Host"}

        {!submitting && <span aria-hidden="true">→</span>}
      </button>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        Applying does not create a public charger listing or commit you to
        hosting. KIVO will review Founding Host applications before onboarding
        begins.
      </p>
    </form>
  );
}
