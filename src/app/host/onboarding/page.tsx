"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

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
    "checking" | "ready" | "error"
  >("checking");

  const [lead, setLead] =
    useState<LeadSummary | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!auth) {
      setError(
        "KIVO authentication is temporarily unavailable."
      );
      setStatus("error");
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const leadId =
      params.get("lead")?.trim() ?? "";

    if (!leadId) {
      setError(
        "Your Host signup reference is missing. Please restart Host signup."
      );
      setStatus("error");
      return;
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            setError(
              "Your KIVO session is not available. Please return to Host signup and sign in."
            );
            setStatus("error");
            return;
          }

          try {
            const idToken =
              await user.getIdToken(true);

            const response =
              await fetch(
                "/api/host/onboarding-access",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                    Authorization:
                      `Bearer ${idToken}`,
                  },
                  body: JSON.stringify({
                    leadId,
                  }),
                }
              );

            const result =
              await response.json();

            if (!response.ok) {
              throw new Error(
                result?.error ||
                  "Unable to open Host setup."
              );
            }

            setLead(result.lead);
            setStatus("ready");
          } catch (err) {
            console.error(
              "KIVO Host onboarding failed:",
              err
            );

            setError(
              err instanceof Error
                ? err.message
                : "We couldn't open your Host setup."
            );

            setStatus("error");
          }
        }
      );

    return unsubscribe;
  }, []);

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO HOST SETUP
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Opening your Host setup...
          </h1>
        </div>
      </main>
    );
  }

  if (
    status === "error" ||
    !lead
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="max-w-xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
            KIVO HOST
          </p>

          <h1 className="mt-4 text-4xl font-black">
            We couldn't open this Host setup.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-300">
            {error}
          </p>

          <a
            href="/host/apply"
            className="mt-8 inline-flex rounded-full bg-emerald-400 px-7 py-4 font-black text-slate-950"
          >
            Restart Host signup
          </a>
        </div>
      </main>
    );
  }

  return (
    <HostOnboardingApplication
      lead={lead}
    />
  );
}
