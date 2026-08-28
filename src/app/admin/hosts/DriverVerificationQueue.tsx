"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";

import {
  auth,
  db,
} from "@/lib/firebase";

type DriverActivation = {
  id: string;
  uid: string;
  email: string;
  status: string;

  profile?: {
    status?: string;
  };

  legal?: {
    status?: string;
  };

  identitySafety?: {
    status?: string;
    provider?: string;
    requestedAt?: Timestamp | null;
    verifiedAt?: Timestamp | null;
  };

  bookingReadiness?: {
    status?: string;
  };
};

export default function DriverVerificationQueue() {
  const [drivers, setDrivers] =
    useState<DriverActivation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [verifyingUid, setVerifyingUid] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!db) {
      setError(
        "KIVO database is not available."
      );
      setLoading(false);
      return;
    }

    const unsubscribe =
      onSnapshot(
        collection(
          db,
          "driverActivations"
        ),
        (snapshot) => {
          setDrivers(
            snapshot.docs.map((document) => ({
              id: document.id,
              uid: document.id,
              ...(document.data() as Omit<
                DriverActivation,
                "id" | "uid"
              >),
            }))
          );

          setLoading(false);
        },
        (snapshotError) => {
          console.error(
            snapshotError
          );

          setError(
            "Could not load Driver verification queue."
          );

          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const pendingDrivers =
    useMemo(
      () =>
        drivers.filter(
          (driver) =>
            driver.identitySafety?.status ===
            "pending_verification"
        ),
      [drivers]
    );

  async function verifyDriver(
    driver: DriverActivation
  ) {
    if (!auth?.currentUser) {
      setError(
        "KIVO Admin authentication is required."
      );
      return;
    }

    const adminUser =
      auth.currentUser;

    if (
      !window.confirm(
        `Confirm TEST identity verification for ${
          driver.email || "this Driver"
        }?\n\nThis is only a temporary KIVO Admin bridge until the production identity provider is connected.`
      )
    ) {
      return;
    }

    try {
      setVerifyingUid(driver.uid);
      setError("");
      setMessage("");

      const token =
        await adminUser.getIdToken(true);

      const response =
        await fetch(
          "/api/admin/verify-driver-safety",
          {
            method: "POST",
            headers: {
              authorization:
                `Bearer ${token}`,
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              uid: driver.uid,
            }),
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not verify Driver."
        );
      }

      setMessage(
        `${driver.email || "Driver"} test verification confirmed.`
      );
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Could not verify Driver."
      );
    } finally {
      setVerifyingUid(null);
    }
  }

  return (
    <section className="mb-10 rounded-3xl border border-cyan-300/15 bg-cyan-300/[0.035] p-6 sm:p-8">
      <div className="mb-6">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-300">
          KivoDriver
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Driver identity verification
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Temporary Admin bridge for marketplace testing.
          Production Driver verification will complete
          automatically through the identity provider.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-semibold text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-300/10 px-5 py-4 text-sm font-semibold text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">
          Loading Driver verification queue...
        </p>
      ) : pendingDrivers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/10 px-5 py-5 text-sm text-slate-400">
          No Drivers are waiting for identity verification.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDrivers.map(
            (driver) => {
              const profileComplete =
                driver.profile?.status ===
                "complete";

              const legalComplete =
                driver.legal?.status ===
                "complete";

              return (
                <div
                  key={driver.uid}
                  className="rounded-2xl border border-white/10 bg-[#071022] p-5"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-lg font-black text-white">
                        {driver.email ||
                          "KivoDriver"}
                      </p>

                      <p className="mt-1 break-all text-xs text-slate-500">
                        {driver.uid}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                        <span
                          className={
                            profileComplete
                              ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-200"
                              : "rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200"
                          }
                        >
                          Profile:{" "}
                          {profileComplete
                            ? "Complete"
                            : "Incomplete"}
                        </span>

                        <span
                          className={
                            legalComplete
                              ? "rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-emerald-200"
                              : "rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200"
                          }
                        >
                          Terms:{" "}
                          {legalComplete
                            ? "Complete"
                            : "Incomplete"}
                        </span>

                        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-amber-200">
                          Identity: Pending
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        verifyDriver(driver)
                      }
                      disabled={
                        verifyingUid ===
                          driver.uid ||
                        !profileComplete ||
                        !legalComplete
                      }
                      className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {verifyingUid ===
                      driver.uid
                        ? "Confirming..."
                        : "Confirm test verification"}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}
