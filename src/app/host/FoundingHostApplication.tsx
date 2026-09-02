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
  phone: string;
  email: string;
  postalCode: string;
  parkingSetup: string;
  chargerStatus: string;
};

const initialForm: FormState = {
  name: "",
  phone: "",
  email: "",
  postalCode: "",
  parkingSetup: "",
  chargerStatus: "",
};

export default function FoundingHostApplication() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedLeadId, setSubmittedLeadId] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your phone number.");
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

    if (!form.parkingSetup) {
      setError("Please select your parking setup.");
      return;
    }

    if (!form.chargerStatus) {
      setError("Please tell us about your Level 2 charger.");
      return;
    }

    if (!db) {
      setError(
        "KIVO applications are temporarily unavailable. Please try again shortly."
      );
      return;
    }

    setSubmitting(true);

    try {
      const leadDocument = await addDoc(
        collection(db, "foundingHostLeads"),
        {
          status: "new",

          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          postalCode: form.postalCode.trim().toUpperCase(),

          parkingSetup: form.parkingSetup,
          chargerStatus: form.chargerStatus,

          source: "kivo-host-acquisition-page",
          foundingHost: true,

          createdAt: serverTimestamp(),
        }
      );

      // Email is intentionally secondary to lead capture.
      // If communication fails, the Founding Host application
      // still remains safely stored in Firestore.
      try {
        const emailResponse = await fetch(
          "/api/host/application-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: form.name.trim(),
              phone: form.phone.trim(),
              email: form.email.trim().toLowerCase(),
              postalCode: form.postalCode.trim().toUpperCase(),
              parkingSetup: form.parkingSetup,
              chargerStatus: form.chargerStatus,
            }),
          }
        );

        if (!emailResponse.ok) {
          console.error(
            "Founding Host email notification failed:",
            await emailResponse.text()
          );
        }
      } catch (emailError) {
        console.error(
          "Founding Host email notification failed:",
          emailError
        );
      }

      setSubmittedLeadId(leadDocument.id);
      setSubmittedEmail(form.email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err) {
      console.error(
        "Founding Host application failed:",
        err
      );

      setError(
        "We couldn't submit your application yet. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[30px] border border-emerald-200 bg-white p-7 shadow-xl sm:p-10">

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
          ⚡
        </div>

        <p className="mt-7 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
          APPLICATION RECEIVED
        </p>

        <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          You&apos;re on the Founding Host list.
        </h2>

        <p className="mt-6 text-xl leading-8 text-slate-600">
          Thanks for helping us build KIVO&apos;s neighborhood
          charging network.
        </p>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-6">

          <p className="text-lg font-black text-slate-950">
            What happens next?
          </p>

          <p className="mt-3 text-lg leading-8 text-slate-600">
            You can continue your Founding Host setup now. We&apos;ll
            review your completed information before your charger can
            ever become active or bookable on KIVO.
          </p>

        </div>

        <a
          href={`/host/onboarding/start?lead=${encodeURIComponent(
            submittedLeadId
          )}&email=${encodeURIComponent(submittedEmail)}`}
          className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
        >
          Continue my Host setup →
        </a>

        <p className="mt-4 text-center text-sm leading-6 text-slate-500">
          We&apos;ll securely confirm your email before opening your
          private Host setup.
        </p>

        <p className="mt-6 text-base leading-7 text-slate-500">
          Nothing has been listed publicly and continuing does not
          commit you to hosting.
        </p>

      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-9"
    >

      <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
        FOUNDING HOST APPLICATION
      </p>

      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
        Start with the basics.
      </h2>

      <p className="mt-3 text-lg leading-7 text-slate-600">
        About one minute. No account. No commitment.
      </p>


      <div className="mt-8 grid gap-6 sm:grid-cols-2">

        <label className="block">
          <span className="text-base font-bold text-slate-800">
            Name *
          </span>

          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
            autoComplete="name"
            placeholder="Your name"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
          />
        </label>


        <label className="block">
          <span className="text-base font-bold text-slate-800">
            Phone *
          </span>

          <input
            type="tel"
            value={form.phone}
            onChange={(event) =>
              updateField("phone", event.target.value)
            }
            autoComplete="tel"
            placeholder="(555) 555-5555"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
          />
        </label>


        <label className="block">
          <span className="text-base font-bold text-slate-800">
            Email *
          </span>

          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              updateField("email", event.target.value)
            }
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
          />
        </label>


        <label className="block">
          <span className="text-base font-bold text-slate-800">
            ZIP / Postal Code *
          </span>

          <input
            type="text"
            value={form.postalCode}
            onChange={(event) =>
              updateField(
                "postalCode",
                event.target.value
              )
            }
            autoComplete="postal-code"
            placeholder="77494"
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
          />
        </label>


        <label className="block">
          <span className="text-base font-bold text-slate-800">
            Where would a Driver park? *
          </span>

          <select
            value={form.parkingSetup}
            onChange={(event) =>
              updateField(
                "parkingSetup",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
          >
            <option value="">
              Select parking setup
            </option>

            <option value="Outdoor driveway">
              Outdoor / driveway
            </option>

            <option value="Garage">
              Inside garage
            </option>

            <option value="Both">
              Either indoor or outdoor
            </option>

            <option value="Other">
              Other / not sure
            </option>
          </select>
        </label>


        <label className="block">
          <span className="text-base font-bold text-slate-800">
            Level 2 charger *
          </span>

          <select
            value={form.chargerStatus}
            onChange={(event) =>
              updateField(
                "chargerStatus",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-5 py-4 text-lg text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white"
          >
            <option value="">
              Select status
            </option>

            <option value="Installed">
              Yes — already installed
            </option>

            <option value="Installing soon">
              Installation scheduled / coming soon
            </option>

            <option value="Planning">
              Planning to install one
            </option>

            <option value="Not sure">
              Not sure yet
            </option>
          </select>
        </label>

      </div>


      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-base font-semibold text-red-700">
          {error}
        </div>
      )}


      <button
        type="submit"
        disabled={submitting}
        className="mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-400 px-6 py-5 text-xl font-black text-slate-950 shadow-lg transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting
          ? "Submitting..."
          : "Join the Founding Host Network"}

        {!submitting && (
          <span aria-hidden="true">
            →
          </span>
        )}
      </button>


      <p className="mt-5 text-base leading-7 text-slate-500">
        This is only an expression of interest. Your home,
        address and charger will not appear publicly from this
        application.
      </p>

    </form>
  );
}
