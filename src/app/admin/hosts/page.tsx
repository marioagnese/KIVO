"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

const ADMIN_EMAIL = "admin@kivocharge.com";

type HostRecord = {
  uid: string;
  name: string;
  email: string;
  postalCode: string;
  status: string;
  activationStatus: string;
};

type ActivationRecord = {
  uid: string;
  status: string;
  gates: Record<
    string,
    {
      status?: string;
    }
  >;
};


function prettyStatus(value?: string) {
  return String(value || "not_started")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const REQUIRED_HOST_GATES = [
  "safety",
  "propertyAccess",
  "charger",
  "legal",
  "listing",
  "payouts",
] as const;

function statusNeedsAttention(value?: string) {
  return value === "failed" || value === "needs_changes";
}

function allRequiredGatesComplete(
  activation?: ActivationRecord
) {
  if (!activation) {
    return false;
  }

  return REQUIRED_HOST_GATES.every(
    (gateName) =>
      activation.gates?.[gateName]?.status === "complete"
  );
}

export default function AdminHostsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [hosts, setHosts] = useState<HostRecord[]>([]);
  const [activations, setActivations] = useState<ActivationRecord[]>([]);
  const [loadingHosts, setLoadingHosts] = useState(true);
  const [loadingActivations, setLoadingActivations] = useState(true);

  const [error, setError] = useState("");

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
    if (!user || !db) return;

    return onSnapshot(
      collection(db, "hostOnboarding"),
      (snapshot) => {
        const nextHosts: HostRecord[] = snapshot.docs.map((recordDoc) => {
          const data = recordDoc.data();

          return {
            uid: recordDoc.id,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            postalCode: String(data.postalCode ?? ""),
            status: String(data.status ?? ""),
            activationStatus: String(data.activationStatus ?? ""),
          };
        });

        setHosts(nextHosts);
        setLoadingHosts(false);
      },
      (snapshotError) => {
        console.error("Unable to load Host records:", snapshotError);
        setError("Unable to load Host records.");
        setLoadingHosts(false);
      }
    );
  }, [user]);

  useEffect(() => {
    if (!user || !db) return;

    return onSnapshot(
      collection(db, "hostActivations"),
      (snapshot) => {
        const nextActivations: ActivationRecord[] =
          snapshot.docs.map((recordDoc) => {
            const data = recordDoc.data();

            return {
              uid: recordDoc.id,
              status: String(
                data.status ?? "activation_in_progress"
              ),
              gates: data.gates ?? {},
            };
          });

        setActivations(nextActivations);
        setLoadingActivations(false);
      },
      (snapshotError) => {
        console.error(
          "Unable to load Host activation records:",
          snapshotError
        );
        setError("Unable to load Host activation records.");
        setLoadingActivations(false);
      }
    );
  }, [user]);


  const activationByUid = useMemo(
    () =>
      Object.fromEntries(
        activations.map((activation) => [
          activation.uid,
          activation,
        ])
      ),
    [activations]
  );

  const activeHosts = useMemo(
    () =>
      hosts.filter((host) => {
        const activation = activationByUid[host.uid];

        return (
          host.activationStatus === "active" ||
          activation?.status === "active"
        );
      }),
    [hosts, activationByUid]
  );

  const hostsNeedingAttention = useMemo(
    () =>
      hosts.filter((host) => {
        const activation = activationByUid[host.uid];

        if (!activation || activation.status === "active") {
          return false;
        }

        const hasException =
          Object.values(activation.gates ?? {}).some(
            (gate) => statusNeedsAttention(gate?.status)
          );

        const readyForFinalActivation =
          allRequiredGatesComplete(activation);

        return hasException || readyForFinalActivation;
      }),
    [hosts, activationByUid]
  );

  const hostsInProgress = useMemo(
    () =>
      hosts.filter((host) => {
        const activation = activationByUid[host.uid];

        if (
          host.activationStatus === "active" ||
          activation?.status === "active"
        ) {
          return false;
        }

        return (
          host.status === "approved" ||
          Boolean(activation)
        );
      }),
    [hosts, activationByUid]
  );

  async function handleSignOut() {
    if (!auth) return;

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

  if (!user) return null;

  const loading =
    loadingHosts || loadingActivations;

  return (
    <main className="min-h-screen bg-[#020817] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-bold text-emerald-300 hover:text-emerald-200"
            >
              ← Admin Home
            </Link>

            <p className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
              KIVO HOST
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              Host Operations
            </h1>

            <p className="mt-3 max-w-3xl text-base text-slate-400 sm:text-lg">
              Monitor active Hosts, exceptions and activation progress.
              Routine onboarding should not require Admin intervention.
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

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.05] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
              Active Hosts
            </p>

            <p className="mt-3 text-4xl font-black">
              {loading ? "—" : activeHosts.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Live on the KIVO marketplace
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
              Needs Attention
            </p>

            <p className="mt-3 text-4xl font-black">
              {loading ? "—" : hostsNeedingAttention.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Exceptions requiring KIVO review
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Activation In Progress
            </p>

            <p className="mt-3 text-4xl font-black">
              {loading ? "—" : hostsInProgress.length}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Monitoring only unless an exception occurs
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
              LIVE MARKETPLACE
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Active Hosts
            </h2>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
              Loading active Hosts...
            </div>
          ) : activeHosts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
              <p className="font-bold text-white">
                No active Hosts yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="border-b border-white/10 bg-white/[0.035]">
                    <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">ZIP</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.07]">
                    {activeHosts.map((host) => (
                      <tr key={host.uid}>
                        <td className="px-6 py-5 font-bold text-white">
                          {host.name || "Unnamed Host"}
                        </td>

                        <td className="px-6 py-5 text-slate-300">
                          {host.email || "—"}
                        </td>

                        <td className="px-6 py-5 text-slate-400">
                          {host.postalCode || "—"}
                        </td>

                        <td className="px-6 py-5">
                          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-emerald-200">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-amber-300">
              ADMIN ACTION
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Needs Your Attention
            </h2>

            <p className="mt-2 text-slate-400">
              Only genuine exceptions or Hosts ready for final marketplace
              activation appear here.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
              Checking Host exceptions...
            </div>
          ) : hostsNeedingAttention.length === 0 ? (
            <div className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.035] p-7">
              <p className="font-bold text-emerald-200">
                Nothing requires your attention.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Routine Host onboarding is continuing without Admin work.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {hostsNeedingAttention.map((host) => {
                const activation = activationByUid[host.uid];

                const problemGates = Object.entries(
                  activation?.gates ?? {}
                )
                  .filter(([, gate]) =>
                    statusNeedsAttention(gate?.status)
                  )
                  .map(([name]) => prettyStatus(name));

                const readyForFinalActivation =
                  allRequiredGatesComplete(activation);

                return (
                  <div
                    key={host.uid}
                    className="flex flex-col gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-lg font-black">
                        {host.name || "Unnamed Host"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {host.email}
                      </p>

                      <p className="mt-3 text-sm font-bold text-amber-200">
                        {readyForFinalActivation
                          ? "Ready for final activation"
                          : `Exception: ${problemGates.join(", ")}`}
                      </p>
                    </div>

                    <Link
                      href="/admin/hosts/activation"
                      className="rounded-full border border-amber-300/30 px-5 py-2.5 text-sm font-black text-amber-200 hover:bg-amber-300/10"
                    >
                      {readyForFinalActivation
                        ? "Review & activate"
                        : "Review exception"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                MONITORING
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Activation In Progress
              </h2>

              <p className="mt-2 text-slate-400">
                These Hosts are moving through setup. No action is required
                unless they appear above.
              </p>
            </div>

            <Link
              href="/admin/hosts/activation"
              className="text-sm font-black text-emerald-300 hover:text-emerald-200"
            >
              Open activation tools →
            </Link>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
              Loading activation progress...
            </div>
          ) : hostsInProgress.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
              No Hosts are currently in activation.
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left">
                  <thead className="border-b border-white/10 bg-white/[0.035]">
                    <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      <th className="px-6 py-4">Host</th>
                      <th className="px-6 py-4">ZIP</th>
                      <th className="px-6 py-4">Onboarding</th>
                      <th className="px-6 py-4">Activation</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.07]">
                    {hostsInProgress.map((host) => {
                      const activation = activationByUid[host.uid];

                      return (
                        <tr key={host.uid}>
                          <td className="px-6 py-5">
                            <p className="font-bold text-white">
                              {host.name || "Unnamed Host"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {host.email}
                            </p>
                          </td>

                          <td className="px-6 py-5 text-slate-400">
                            {host.postalCode || "—"}
                          </td>

                          <td className="px-6 py-5 text-slate-300">
                            {prettyStatus(host.status)}
                          </td>

                          <td className="px-6 py-5 text-slate-300">
                            {prettyStatus(
                              activation?.status ||
                                host.activationStatus
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
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/hosts/applications"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-300/30"
          >
            <p className="font-black text-white">
              Applications & Review
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Secondary onboarding review and development workspace.
            </p>

            <p className="mt-4 text-sm font-bold text-emerald-300">
              Open applications →
            </p>
          </Link>

          <Link
            href="/admin/hosts/activation"
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-300/30"
          >
            <p className="font-black text-white">
              Activation Tools
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Inspect activation gates and perform exceptional Admin actions.
            </p>

            <p className="mt-4 text-sm font-bold text-emerald-300">
              Open activation tools →
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
