"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

type GateStatus = {
  status?: string;
};

type ActivationRecord = {
  uid: string;
  leadId?: string | null;
  status: string;
  gates: {
    safety?: GateStatus;
    propertyAccess?: GateStatus;
    charger?: GateStatus;
    legal?: GateStatus;
    listing?: GateStatus;
  };
};

type HostIdentity = {
  uid: string;
  name: string;
  email: string;
  postalCode: string;
  status: string;
};

function formatStatus(value?: string) {
  return String(value || "not_started")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function gateClasses(status?: string) {
  if (status === "passed") {
    return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "needs_changes" || status === "failed") {
    return "border-red-300/20 bg-red-300/10 text-red-200";
  }

  if (status === "pending") {
    return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  }

  return "border-white/10 bg-white/[0.035] text-slate-300";
}

export default function ActivationReadinessQueue() {
  const [activations, setActivations] =
    useState<ActivationRecord[]>([]);

  const [hosts, setHosts] =
    useState<Record<string, HostIdentity>>({});

  const [loadingActivations, setLoadingActivations] =
    useState(true);

  const [loadingHosts, setLoadingHosts] =
    useState(true);

  const [error, setError] = useState("");
  const [initializingUid, setInitializingUid] =
    useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoadingActivations(false);
      return;
    }

    return onSnapshot(
      collection(db, "hostActivations"),
      (snapshot) => {
        const next = snapshot.docs.map((recordDoc) => {
          const data = recordDoc.data();

          return {
            uid: recordDoc.id,
            leadId:
              typeof data.leadId === "string"
                ? data.leadId
                : null,
            status: String(
              data.status ?? "activation_in_progress"
            ),
            gates: data.gates ?? {},
          } satisfies ActivationRecord;
        });

        setActivations(next);
        setLoadingActivations(false);
      },
      (err) => {
        console.error(
          "Unable to load Host activation readiness:",
          err
        );
        setError(
          "Unable to load Host activation readiness records."
        );
        setLoadingActivations(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!db) {
      setLoadingHosts(false);
      return;
    }

    return onSnapshot(
      collection(db, "hostOnboarding"),
      (snapshot) => {
        const next: Record<string, HostIdentity> = {};

        for (const recordDoc of snapshot.docs) {
          const data = recordDoc.data();

          if (String(data.status ?? "") !== "approved") {
            continue;
          }

          next[recordDoc.id] = {
            uid: recordDoc.id,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            postalCode: String(data.postalCode ?? ""),
            status: String(data.status ?? ""),
          };
        }

        setHosts(next);
        setLoadingHosts(false);
      },
      (err) => {
        console.error(
          "Unable to load approved Host identities:",
          err
        );
        setError(
          "Unable to load approved Host information."
        );
        setLoadingHosts(false);
      }
    );
  }, []);

  const loading =
    loadingActivations || loadingHosts;

  const activationByUid =
    Object.fromEntries(
      activations.map((activation) => [
        activation.uid,
        activation,
      ])
    );

  async function initializeReadiness(uid: string) {
    if (!auth?.currentUser) {
      setError("KIVO admin authentication is unavailable.");
      return;
    }

    setInitializingUid(uid);
    setError("");

    try {
      const idToken =
        await auth.currentUser.getIdToken(true);

      const response =
        await fetch("/api/admin/approve-host", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid }),
        });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to initialize Host activation readiness."
        );
      }
    } catch (err) {
      console.error(
        "Unable to initialize Host activation readiness:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to initialize Host activation readiness."
      );
    } finally {
      setInitializingUid(null);
    }
  }

  if (loading) {
    return (
      <section className="mb-12 rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
        Loading Host activation readiness...
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          HOST ACTIVATION
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Activation readiness
        </h2>

        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-400">
          Approved Hosts remain private and unbookable until all
          required activation gates are complete.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-red-200">
          {error}
        </div>
      )}

      {Object.keys(hosts).length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
          <p className="font-bold text-white">
            No approved Hosts yet.
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Activation readiness begins after Host approval.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.values(hosts).map((host) => {
            const activation =
              activationByUid[host.uid];

            const gates = [
              ["Safety", activation?.gates.safety?.status],
              [
                "Property & Access",
                activation?.gates.propertyAccess?.status,
              ],
              ["Charger", activation?.gates.charger?.status],
              ["Legal", activation?.gates.legal?.status],
              ["Listing", activation?.gates.listing?.status],
            ] as const;

            return (
              <article
                key={host.uid}
                className="rounded-[30px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {host.name || "Approved KIVO Host"}
                    </h3>

                    <p className="mt-2 text-base text-slate-300">
                      {host.email || host.uid}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {host.postalCode
                        ? `ZIP ${host.postalCode} · `
                        : ""}
                      UID {host.uid}
                    </p>
                  </div>

                  {activation ? (
                    <span className="self-start rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-200">
                      {formatStatus(activation.status)}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={initializingUid === host.uid}
                      onClick={() =>
                        initializeReadiness(host.uid)
                      }
                      className="self-start rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition hover:border-emerald-300/40 hover:text-emerald-200 disabled:opacity-50"
                    >
                      {initializingUid === host.uid
                        ? "Initializing..."
                        : "Initialize readiness"}
                    </button>
                  )}
                </div>

                {activation ? (
                  <>
                    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      {gates.map(([label, status]) => (
                        <div
                          key={label}
                          className={`rounded-2xl border p-4 ${gateClasses(
                            status
                          )}`}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">
                            {label}
                          </p>

                          <p className="mt-2 text-sm font-black">
                            {formatStatus(status)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <p className="mt-6 text-sm leading-6 text-slate-500">
                      Private operational record only. No public
                      listing is created or activated from this
                      screen.
                    </p>
                  </>
                ) : (
                  <div className="mt-7 rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] p-5">
                    <p className="font-bold text-amber-100">
                      Activation record not initialized.
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      This Host was approved before the Activation
                      Readiness layer existed. Initializing creates
                      the private five-gate readiness record only.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
