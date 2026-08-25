"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import OnboardingReviewQueue from "./OnboardingReviewQueue";

const ADMIN_EMAIL = "admin@kivocharge.com";

type FoundingHostLead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  postalCode: string;
  parkingSetup: string;
  chargerStatus: string;
  status: string;
  foundingHost: boolean;
  source: string;
  createdAt?: Timestamp | null;
};

function formatDate(timestamp?: Timestamp | null) {
  if (!timestamp) {
    return "—";
  }

  return timestamp.toDate().toLocaleString();
}

export default function AdminHostsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [leads, setLeads] = useState<FoundingHostLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setError("Firebase authentication is unavailable.");
      setAuthReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (
        !currentUser ||
        currentUser.email?.toLowerCase() !== ADMIN_EMAIL ||
        !currentUser.emailVerified
      ) {
        setUser(null);
        setAuthReady(true);
        window.location.href = "/admin/login";
        return;
      }

      try {
        await currentUser.getIdToken(true);
        setUser(currentUser);
      } catch (err) {
        console.error("Unable to refresh admin token:", err);
        setError("Unable to verify KIVO admin access.");
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !db) {
      return;
    }

    const leadsQuery = query(
      collection(db, "foundingHostLeads"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      leadsQuery,
      (snapshot) => {
        const nextLeads: FoundingHostLead[] = snapshot.docs.map((leadDoc) => {
          const data = leadDoc.data();

          return {
            id: leadDoc.id,
            name: String(data.name ?? ""),
            phone: String(data.phone ?? ""),
            email: String(data.email ?? ""),
            postalCode: String(data.postalCode ?? ""),
            parkingSetup: String(data.parkingSetup ?? ""),
            chargerStatus: String(data.chargerStatus ?? ""),
            status: String(data.status ?? "new"),
            foundingHost: Boolean(data.foundingHost),
            source: String(data.source ?? ""),
            createdAt: data.createdAt ?? null,
          };
        });

        setLeads(nextLeads);
        setLoadingLeads(false);
        setError("");
      },
      (err) => {
        console.error("Unable to load Founding Host leads:", err);
        setError(
          "Unable to load Founding Host applications. Check admin permissions."
        );
        setLoadingLeads(false);
      }
    );

    return unsubscribe;
  }, [user]);

  async function qualifyLead(leadId: string) {
    if (!db) {
      setError("Firestore is unavailable.");
      return;
    }

    setUpdatingId(leadId);
    setError("");

    try {
      await updateDoc(doc(db, "foundingHostLeads", leadId), {
        status: "qualified",
        qualifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Unable to qualify Founding Host lead:", err);
      setError("Unable to update this application.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function inviteLead(lead: FoundingHostLead) {
    if (!db || !auth?.currentUser) {
      setError("KIVO admin authentication is unavailable.");
      return;
    }

    setUpdatingId(lead.id);
    setError("");

    try {
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await fetch("/api/admin/host-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Unable to send Host invitation."
        );
      }

      await updateDoc(doc(db, "foundingHostLeads", lead.id), {
        status: "invited",
        invitedAt: serverTimestamp(),
        invitationEmailSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Unable to invite Founding Host lead:", err);
      setError(
        "The Host invitation could not be completed. The lead was not marked invited."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSignOut() {
    if (!auth) {
      return;
    }

    await signOut(auth);
    window.location.href = "/admin/login";
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] text-white">
        <p className="text-sm font-semibold text-slate-400">
          Verifying KIVO admin access...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
              KIVO ADMIN
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Founding Host Review
            </h1>

            <p className="mt-3 text-base text-slate-400 sm:text-lg">
              Review early Host applications and manage lifecycle status.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="self-start rounded-full border border-white/15 px-6 py-3 text-base font-bold text-slate-200 transition hover:border-white/30 hover:bg-white/[0.06] sm:self-auto"
          >
            Sign out
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm font-semibold text-red-200">
            {error}
          </div>
        )}

        <OnboardingReviewQueue />

        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-slate-300">
              Founding Host applications
            </p>
            <p className="mt-2 text-base text-slate-500">
              {leads.length} total lead{leads.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loadingLeads ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-sm text-slate-400">
            Loading Founding Host applications...
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <p className="font-bold">No applications yet.</p>
            <p className="mt-2 text-sm text-slate-400">
              New submissions from /host/apply will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
            <div className="overflow-x-auto">
              <table className="min-w-[1280px] w-full text-left">
                <thead className="border-b border-white/10 bg-white/[0.035]">
                  <tr className="text-sm font-black uppercase tracking-[0.12em] text-slate-400">
                    <th className="px-6 py-5">Applicant</th>
                    <th className="px-6 py-5">Contact</th>
                    <th className="px-6 py-5">ZIP</th>
                    <th className="px-6 py-5">Parking</th>
                    <th className="px-6 py-5">Charger</th>
                    <th className="px-6 py-5">Applied</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.07]">
                  {leads.map((lead) => {
                    const isNew = lead.status === "new";
                    const isQualified = lead.status === "qualified";
                    const isUpdating = updatingId === lead.id;

                    return (
                      <tr
                        key={lead.id}
                        className="align-top transition hover:bg-white/[0.025]"
                      >
                        <td className="px-6 py-6">
                          <p className="text-lg font-extrabold text-white">
                            {lead.name || "Unnamed applicant"}
                          </p>
                          <p className="mt-2 font-mono text-xs text-slate-500">
                            {lead.id}
                          </p>
                        </td>

                        <td className="px-6 py-6">
                          <p className="text-base font-semibold text-slate-200">
                            {lead.email || "—"}
                          </p>
                          <p className="mt-2 text-base text-slate-500">
                            {lead.phone || "—"}
                          </p>
                        </td>

                        <td className="px-6 py-6 text-base font-bold text-slate-300">
                          {lead.postalCode || "—"}
                        </td>

                        <td className="px-6 py-6 text-base text-slate-300">
                          {lead.parkingSetup || "—"}
                        </td>

                        <td className="px-6 py-6 text-base text-slate-300">
                          {lead.chargerStatus || "—"}
                        </td>

                        <td className="px-6 py-6 text-base text-slate-400">
                          {formatDate(lead.createdAt)}
                        </td>

                        <td className="px-6 py-6">
                          <span
                            className={`inline-flex rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.08em] ${
                              isNew
                                ? "border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
                                : "border border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                            }`}
                          >
                            {lead.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right">
                          {isNew ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => qualifyLead(lead.id)}
                              className="rounded-full bg-emerald-400 px-5 py-2.5 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdating ? "Updating..." : "Qualify"}
                            </button>
                          ) : isQualified ? (
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => inviteLead(lead)}
                              className="rounded-full bg-cyan-300 px-5 py-2.5 text-base font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isUpdating ? "Updating..." : "Invite"}
                            </button>
                          ) : (
                            <span className="text-base font-semibold text-slate-600">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
