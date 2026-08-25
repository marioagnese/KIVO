"use client";

import { useEffect, useState } from "react";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";

import HostOnboardingApplication from "../HostOnboardingApplication";
import { auth } from "@/lib/firebase";

type LeadSummary = {
  id: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  parkingSetup: string;
  chargerStatus: string;
};

export default function HostOnboardingPage() {
  const [status, setStatus] = useState<
    "checking" | "needs-email" | "ready" | "error"
  >("checking");

  const [lead, setLead] = useState<LeadSummary | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void initializeInvitation();
  }, []);

  async function initializeInvitation() {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setStatus("error");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");

    if (!leadId) {
      setError("This Host invitation is missing its lead reference.");
      setStatus("error");
      return;
    }

    try {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        const savedEmail =
          window.localStorage.getItem("kivoHostInvitationEmail");

        if (!savedEmail) {
          setStatus("needs-email");
          return;
        }

        await completeEmailLinkSignIn(savedEmail);
        return;
      }

      if (auth.currentUser) {
        await validateLeadAccess(leadId);
        return;
      }

      setError(
        "Open the secure invitation link from the email KIVO sent you."
      );
      setStatus("error");
    } catch (err) {
      console.error("KIVO Host onboarding initialization failed:", err);
      setError("We couldn't validate this Host invitation.");
      setStatus("error");
    }
  }

  async function completeEmailLinkSignIn(invitedEmail: string) {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setStatus("error");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");

    if (!leadId) {
      setError("This Host invitation is missing its lead reference.");
      setStatus("error");
      return;
    }

    setError("");
    setStatus("checking");

    try {
      await signInWithEmailLink(
        auth,
        invitedEmail.trim().toLowerCase(),
        window.location.href
      );

      window.localStorage.removeItem("kivoHostInvitationEmail");

      await validateLeadAccess(leadId);
    } catch (err) {
      console.error("KIVO Host email-link sign-in failed:", err);

      await signOut(auth).catch(() => undefined);

      setError(
        "We couldn't complete this secure sign-in. Make sure you entered the same email used for your Founding Host application."
      );
      setStatus("needs-email");
    }
  }

  async function validateLeadAccess(leadId: string) {
    if (!auth?.currentUser) {
      setError("KIVO Host sign-in is required.");
      setStatus("error");
      return;
    }

    const idToken = await auth.currentUser.getIdToken(true);

    const response = await fetch("/api/host/onboarding-access", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ leadId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error || "Unable to validate this Host invitation."
      );
    }

    setLead(result.lead);
    setStatus("ready");
  }

  async function handleEmailSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter the email used for your Founding Host application.");
      return;
    }

    window.localStorage.setItem(
      "kivoHostInvitationEmail",
      normalizedEmail
    );

    await completeEmailLinkSignIn(normalizedEmail);
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO FOUNDING HOST
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Checking your secure invitation...
          </h1>
        </div>
      </main>
    );
  }

  if (status === "needs-email") {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO FOUNDING HOST
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Confirm your email.
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            For security, enter the same email address you used when you applied
            to become a KIVO Founding Host.
          </p>

          <form
            onSubmit={handleEmailSubmit}
            className="mt-8 rounded-[28px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
          >
            <label className="block">
              <span className="text-base font-black text-slate-200">
                Email address
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none placeholder:text-slate-600 focus:border-emerald-400"
              />
            </label>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-base font-semibold text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
            >
              Continue securely →
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="max-w-xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
            KIVO FOUNDING HOST
          </p>

          <h1 className="mt-4 text-4xl font-black">
            We couldn't open this invitation.
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      {lead && (
        <div className="bg-[#020817] px-5 pt-7 text-white sm:px-8">
          <div className="mx-auto max-w-5xl rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-5 py-4">
            <p className="text-base font-bold text-emerald-100">
              Welcome, {lead.name || "Founding Host"}.
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Invitation confirmed for {lead.email}.
            </p>
          </div>
        </div>
      )}

      {lead && <HostOnboardingApplication lead={lead} />}
    </>
  );
}
