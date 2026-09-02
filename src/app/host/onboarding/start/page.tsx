"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function HostOnboardingStartPage() {
  const [leadId, setLeadId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    setLeadId(
      params.get("lead")?.trim() ?? ""
    );

    setEmail(
      params
        .get("email")
        ?.trim()
        .toLowerCase() ?? ""
    );
  }, []);

  async function continueSetup(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!auth) {
      setError(
        "KIVO authentication is temporarily unavailable."
      );
      return;
    }

    if (!leadId || !email) {
      setError(
        "Your Founding Host application information is missing."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Choose a password with at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setSubmitting(true);

    try {
      try {
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      } catch (createError) {
        const code =
          typeof createError === "object" &&
          createError !== null &&
          "code" in createError
            ? String(
                (
                  createError as {
                    code?: unknown;
                  }
                ).code ?? ""
              )
            : "";

        if (
          code !==
          "auth/email-already-in-use"
        ) {
          throw createError;
        }

        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      window.location.href =
        `/host/onboarding?lead=${encodeURIComponent(
          leadId
        )}`;
    } catch (authError) {
      console.error(
        "KIVO Founding Host account setup failed:",
        authError
      );

      const code =
        typeof authError === "object" &&
        authError !== null &&
        "code" in authError
          ? String(
              (
                authError as {
                  code?: unknown;
                }
              ).code ?? ""
            )
          : "";

      if (
        code ===
        "auth/invalid-credential"
      ) {
        setError(
          "A KIVO account already exists for this email. Enter the password for that account."
        );
      } else {
        setError(
          "We couldn't start your Host setup. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-xl">

        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          KIVO FOUNDING HOST
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Continue your Host setup.
        </h1>

        <p className="mt-5 text-lg leading-8 text-slate-300">
          Create your KIVO password and continue
          directly into your Founding Host setup.
        </p>

        <div className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-5 py-4">
          <p className="text-sm font-bold text-emerald-100">
            No approval wait. No email link required.
          </p>
        </div>

        <form
          onSubmit={continueSetup}
          className="mt-8 rounded-[28px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
        >
          <label className="block">
            <span className="text-base font-black text-slate-200">
              Email
            </span>

            <input
              type="email"
              value={email}
              readOnly
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-lg text-slate-400 outline-none"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-base font-black text-slate-200">
              Create a password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            />
          </label>

          <label className="mt-6 block">
            <span className="text-base font-black text-slate-200">
              Confirm password
            </span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              autoComplete="new-password"
              placeholder="Enter it again"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
            />
          </label>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-base font-semibold text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              submitting ||
              !leadId ||
              !email
            }
            className="mt-7 w-full rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting
              ? "Starting your setup..."
              : "Continue my Host setup →"}
          </button>

          <p className="mt-5 text-center text-sm leading-6 text-slate-500">
            Your charger will not become public or
            bookable until KIVO completes its review
            and activation process.
          </p>
        </form>

      </div>
    </main>
  );
}
