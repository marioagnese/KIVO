"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/context/AuthContext";

import KivoDriverAgreement from "@/components/driver/KivoDriverAgreement";

type DriverActivationResponse = {
  ok: boolean;

  driver: {
    uid: string;
    email: string;
    displayName: string;
    location: string;
    vehicle: string;
    connector: string;
  };

  activation: {
    status: string;

    profile: {
      status: string;
    };

    legal: {
      status: string;
      termsVersion: string;
    };

    identitySafety: {
      status: string;
      provider: string;
    };

    bookingReadiness: {
      status: string;
    };
  };

  error?: string;
};

function statusLabel(
  status: string
) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function isComplete(
  status: string
) {
  return (
    status === "complete" ||
    status === "verified" ||
    status === "booking_ready"
  );
}

export default function DriverSetupPage() {
  const router =
    useRouter();

  const {
    user,
    loading: authLoading,
    hasRole,
  } = useAuth();

  const [data, setData] =
    useState<DriverActivationResponse | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [profileError, setProfileError] =
    useState("");

  const [displayName, setDisplayName] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [vehicle, setVehicle] =
    useState("");

  const [connector, setConnector] =
    useState("");

  const [legalOpen, setLegalOpen] =
    useState(false);

  const [legalSaving, setLegalSaving] =
    useState(false);

  const [legalError, setLegalError] =
    useState("");

  const [safetySaving, setSafetySaving] =
    useState(false);

  const [safetyError, setSafetyError] =
    useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.replace("/login?next=/driver/setup");
      return;
    }

    if (hasRole("driver")) {
      router.replace("/driver/home");
      return;
    }

    const activeUser = user;

    async function loadActivation() {
      try {
        setLoading(true);
        setError("");

        const token =
          await activeUser.getIdToken();

        const response =
          await fetch(
            "/api/driver/activation-access",
            {
              method: "POST",

              headers: {
                authorization:
                  `Bearer ${token}`,
              },
            }
          );

        const payload =
          await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ||
              "Could not load Driver setup."
          );
        }

        const typedPayload =
          payload as DriverActivationResponse;

        setData(
          typedPayload
        );

        setDisplayName(
          typedPayload.driver.displayName
        );

        setLocation(
          typedPayload.driver.location
        );

        setVehicle(
          typedPayload.driver.vehicle
        );

        setConnector(
          typedPayload.driver.connector
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load Driver setup."
        );
      } finally {
        setLoading(false);
      }
    }

    loadActivation();
  }, [
    authLoading,
    user,
    hasRole,
    router,
  ]);

  async function saveDriverProfile() {
    if (!user) {
      return;
    }

    try {
      setProfileSaving(true);
      setProfileError("");

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/driver/activation-profile-complete",
          {
            method: "POST",

            headers: {
              authorization:
                `Bearer ${token}`,
              "content-type":
                "application/json",
            },

            body: JSON.stringify({
              displayName,
              location,
              vehicle,
              connector,
            }),
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not save Driver profile."
        );
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          driver: {
            ...current.driver,
            displayName,
            location,
            vehicle,
            connector,
          },

          activation: {
            ...current.activation,

            profile: {
              status: "complete",
            },
          },
        };
      });

      setProfileOpen(false);
    } catch (err) {
      setProfileError(
        err instanceof Error
          ? err.message
          : "Could not save Driver profile."
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function acceptDriverAgreement() {
    if (!user) {
      return;
    }

    try {
      setLegalSaving(true);
      setLegalError("");

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/driver/activation-legal-complete",
          {
            method: "POST",
            headers: {
              authorization:
                `Bearer ${token}`,
            },
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not accept Driver Agreement."
        );
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          activation: {
            ...current.activation,

            legal: {
              status:
                "complete",

              termsVersion:
                payload?.legal?.termsVersion ||
                "2026-08-v1",
            },

            bookingReadiness: {
              status:
                payload?.bookingReadiness?.status ||
                "incomplete",
            },
          },
        };
      });

      setLegalOpen(false);
    } catch (err) {
      setLegalError(
        err instanceof Error
          ? err.message
          : "Could not accept Driver Agreement."
      );
    } finally {
      setLegalSaving(false);
    }
  }


  async function startSafetyVerification() {
    if (!user) {
      return;
    }

    try {
      setSafetySaving(true);
      setSafetyError("");

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/driver/activation-safety-start",
          {
            method: "POST",
            headers: {
              authorization:
                `Bearer ${token}`,
            },
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not start identity verification."
        );
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          activation: {
            ...current.activation,

            identitySafety: {
              status:
                "pending_verification",

              provider:
                payload?.identitySafety?.provider ||
                "development_placeholder",
            },

            bookingReadiness: {
              status:
                "incomplete",
            },

            status:
              "setup",
          },
        };
      });
    } catch (err) {
      setSafetyError(
        err instanceof Error
          ? err.message
          : "Could not start identity verification."
      );
    } finally {
      setSafetySaving(false);
    }
  }


  async function confirmTestVerification() {
    if (!user) {
      return;
    }

    try {
      setSafetySaving(true);
      setSafetyError("");

      const token =
        await user.getIdToken();

      const response =
        await fetch(
          "/api/admin/verify-driver-safety",
          {
            method: "POST",
            headers: {
              authorization:
                `Bearer ${token}`,
            },
          }
        );

      const payload =
        await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Could not complete test verification."
        );
      }

      setData((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          activation: {
            ...current.activation,

            identitySafety: {
              status:
                "verified",

              provider:
                "development_placeholder",
            },

            bookingReadiness: {
              status:
                payload?.bookingReadiness?.status ||
                "incomplete",
            },

            status:
              payload?.status ||
              "setup",
          },
        };
      });
    } catch (err) {
      setSafetyError(
        err instanceof Error
          ? err.message
          : "Could not complete test verification."
      );
    } finally {
      setSafetySaving(false);
    }
  }

  if (
    authLoading ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm text-slate-400">
            Loading your KivoDriver setup...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-300">
            {error}
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const bookingReady =
    data.activation.bookingReadiness.status ===
    "complete" ||
    data.activation.status ===
      "booking_ready";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() =>
            router.push("/")
          }
          className="text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          ← Back to KIVO
        </button>

        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
            KivoDriver
          </p>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">
                Driver setup
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Complete your Driver profile, agreement and identity verification before requesting real KIVO charging sessions.
              </p>
            </div>

            <div
              className={`rounded-full border px-4 py-2 text-sm font-bold ${
                bookingReady
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {bookingReady
                ? "Booking Ready ✓"
                : "Setup Required"}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            KIVO Account
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">
                Email
              </p>

              <p className="mt-1 font-semibold">
                {data.driver.email}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">
                Driver
              </p>

              <p className="mt-1 font-semibold">
                {data.driver.displayName ||
                  "Profile name not set"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  Driver Profile
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Vehicle & charging profile
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Confirm your name, location, vehicle and connector so KIVO can match you with compatible Hosts.
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  isComplete(
                    data.activation.profile.status
                  )
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                {statusLabel(
                  data.activation.profile.status
                )}
              </span>
            </div>

            {!profileOpen ? (
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(true)
                }
                className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-400/15"
              >
                {isComplete(
                  data.activation.profile.status
                )
                  ? "Review Driver profile"
                  : "Complete Driver profile"}
              </button>
            ) : (
              <div className="mt-6 border-t border-slate-800 pt-6">

                <div className="grid gap-5 sm:grid-cols-2">

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">
                      Name
                    </span>

                    <input
                      value={displayName}
                      onChange={(event) =>
                        setDisplayName(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                      placeholder="Your name"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">
                      Home city / region
                    </span>

                    <input
                      value={location}
                      onChange={(event) =>
                        setLocation(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                      placeholder="Katy, TX"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">
                      Vehicle
                    </span>

                    <input
                      value={vehicle}
                      onChange={(event) =>
                        setVehicle(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                      placeholder="Tesla Model Y"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-slate-300">
                      Charging connector
                    </span>

                    <select
                      value={connector}
                      onChange={(event) =>
                        setConnector(
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
                    >
                      <option value="">
                        Select connector
                      </option>

                      <option value="NACS / Tesla">
                        NACS / Tesla
                      </option>

                      <option value="J1772">
                        J1772
                      </option>

                      <option value="CCS1">
                        CCS1
                      </option>

                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </label>

                </div>

                {profileError && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {profileError}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={
                      saveDriverProfile
                    }
                    disabled={
                      profileSaving
                    }
                    className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {profileSaving
                      ? "Saving..."
                      : "Save Driver profile"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setProfileError("");
                    }}
                    disabled={
                      profileSaving
                    }
                    className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/40 hover:text-white"
                  >
                    Cancel
                  </button>

                </div>

              </div>
            )}
          </div>

          {/* DRIVER AGREEMENT */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  Driver Terms
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Driver agreement
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Review and accept KIVO Driver responsibilities,
                  Host property rules, privacy expectations and
                  marketplace terms.
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  isComplete(
                    data.activation.legal.status
                  )
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                {statusLabel(
                  data.activation.legal.status
                )}
              </span>

            </div>

            {!legalOpen ? (
              <button
                type="button"
                onClick={() => {
                  setLegalError("");
                  setLegalOpen(true);
                }}
                className="mt-5 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-400/15"
              >
                {isComplete(
                  data.activation.legal.status
                )
                  ? "Review Driver Agreement"
                  : "Review Driver Agreement"}
              </button>
            ) : (
              <KivoDriverAgreement
                accepted={
                  data.activation.legal.status ===
                  "complete"
                }
                saving={legalSaving}
                error={legalError}
                onAccept={
                  acceptDriverAgreement
                }
                onCancel={() => {
                  setLegalOpen(false);
                  setLegalError("");
                }}
              />
            )}
          </div>


          {/* IDENTITY & SAFETY */}

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                  Identity & Safety
                </p>

                <h2 className="mt-2 text-xl font-bold">
                  Verify your identity
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  KIVO requires identity verification before a
                  Driver can request real charging sessions.
                  Driver and Host verification are designed to
                  support the same marketplace trust standard.
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                  data.activation.identitySafety.status ===
                  "verified"
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : data.activation.identitySafety.status ===
                      "pending_verification"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : "border-slate-700 bg-slate-950 text-slate-400"
                }`}
              >
                {statusLabel(
                  data.activation.identitySafety.status
                )}
              </span>

            </div>

            {data.activation.identitySafety.status ===
              "not_started" && (
              <div className="mt-5">

                <button
                  type="button"
                  onClick={
                    startSafetyVerification
                  }
                  disabled={
                    safetySaving
                  }
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {safetySaving
                    ? "Starting..."
                    : "Start identity verification"}
                </button>

                <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500">
                  KIVO will later connect this step to a
                  production identity-verification provider.
                  KIVO will not use the Driver profile as a
                  substitute for identity verification.
                </p>

              </div>
            )}

            {data.activation.identitySafety.status ===
              "pending_verification" && (
              <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">

                <p className="font-bold text-amber-300">
                  Identity verification pending
                </p>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  The production provider is not connected yet.
                  This development bridge lets us test the
                  marketplace lifecycle without pretending a
                  real verification has occurred.
                </p>

                {process.env.NODE_ENV !==
                  "production" && (
                  <button
                    type="button"
                    onClick={
                      confirmTestVerification
                    }
                    disabled={
                      safetySaving
                    }
                    className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm font-bold text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {safetySaving
                      ? "Confirming..."
                      : "DEV ONLY — Confirm test verification"}
                  </button>
                )}

              </div>
            )}

            {data.activation.identitySafety.status ===
              "verified" && (
              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">

                <p className="font-bold text-emerald-300">
                  Identity & Safety complete ✓
                </p>

                {data.activation.identitySafety.provider ===
                  "development_placeholder" && (
                  <p className="mt-2 text-xs leading-5 text-amber-300">
                    Development verification only. This must be
                    replaced by the production identity provider
                    before real-world launch.
                  </p>
                )}

              </div>
            )}

            {safetyError && (
              <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                {safetyError}
              </div>
            )}

          </div>
        </div>

        <div
          className={`mt-6 rounded-2xl border p-5 ${
            bookingReady
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-slate-800 bg-slate-900/50"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Booking Readiness
          </p>

          <h2 className="mt-2 text-xl font-bold">
            {bookingReady
              ? "You are ready to request KIVO charging sessions."
              : "Complete all Driver requirements to become booking-ready."}
          </h2>
        </div>
      </div>
    </main>
  );
}
