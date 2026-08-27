"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  useEffect,
  useState,
} from "react";

import {
  auth,
} from "@/lib/firebase";

import {
  useAuth,
  type KivoAccountRole,
} from "@/context/AuthContext";

type AccountModalProps = {
  open: boolean;

  initialRole?:
    KivoAccountRole;

  initialMode?:
    "signup" | "signin";

  onClose: () => void;
};

export default function AccountModal({
  open,
  initialRole = "driver",
  initialMode = "signup",
  onClose,
}: AccountModalProps) {
  const {
    user,
    addAccountType,
    hasRole,
    firebaseReady,
  } = useAuth();

  const [mode, setMode] =
    useState<
      "signup" |
      "signin"
    >("signup");

  const [role, setRole] =
    useState<KivoAccountRole>(
      initialRole
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (!open) return;

    setRole(initialRole);
    setError("");
    setMessage("");

    // If already signed in,
    // this modal becomes a role-adder.
    if (user) {
      setMode("signin");
    } else {
      setMode(initialMode);
    }
  }, [
    open,
    initialRole,
    initialMode,
    user,
  ]);

  if (!open) {
    return null;
  }

  async function finishRoleSetup() {
    await addAccountType(role);

    setMessage(
      role === "driver"
        ? "KivoDriver access added."
        : "KivoHost access added."
    );

    setTimeout(
      onClose,
      400
    );
  }

  async function submit() {
    setError("");
    setMessage("");

    // KIVO Host access is approval-based.
    // Users cannot grant themselves the Host role.
    if (role === "host") {
      onClose();
      window.location.href = "/host";
      return;
    }

    // Already authenticated:
    // just add the selected KIVO role.
    if (user) {
      if (
        hasRole(role)
      ) {
        setMessage(
          role === "driver"
            ? "This account already has KivoDriver access."
            : "This account already has KivoHost access."
        );

        setTimeout(
          onClose,
          500
        );

        return;
      }

      await finishRoleSetup();
      return;
    }

    if (!email.trim()) {
      setError(
        "Enter your email address."
      );
      return;
    }

    if (
      password.length < 6
    ) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      !auth ||
      !firebaseReady
    ) {
      setError(
        "Firebase is not configured yet."
      );
      return;
    }

    setLoading(true);

    try {
      const credential =
        mode === "signup"
          ? await createUserWithEmailAndPassword(
              auth,
              email.trim(),
              password
            )
          : await signInWithEmailAndPassword(
              auth,
              email.trim(),
              password
            );

      await addAccountType(
        role,
        credential.user
      );

      onClose();
    } catch (
      err: any
    ) {
      const code =
        String(
          err?.code || ""
        );

      if (
        code.includes(
          "email-already-in-use"
        )
      ) {
        setMode(
          "signin"
        );

        setError(
          "That email already has a KIVO account. Sign in below and we’ll add this role to the same account."
        );
      } else if (
        code.includes(
          "invalid-credential"
        ) ||
        code.includes(
          "wrong-password"
        )
      ) {
        setError(
          "Email or password is incorrect."
        );
      } else if (
        code.includes(
          "invalid-email"
        )
      ) {
        setError(
          "Enter a valid email address."
        );
      } else if (
        code.includes(
          "weak-password"
        )
      ) {
        setError(
          "Please choose a stronger password."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Authentication failed."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
              KIVO Account
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              {user
                ? "Add another KIVO role"
                : mode ===
                    "signup"
                ? "Create your account"
                : "Welcome back"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              One KIVO account can be
              both a Driver and a Host.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-slate-400 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() =>
              setRole(
                "driver"
              )
            }
            className={`rounded-2xl border p-4 text-left transition ${
              role ===
              "driver"
                ? "border-cyan-400 bg-cyan-400/10"
                : "border-slate-700 bg-slate-950/50"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
              KivoDriver
            </p>

            <p className="mt-2 text-sm font-semibold">
              Find charging
            </p>

            {user &&
              hasRole(
                "driver"
              ) && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">
                  ✓ Already active
                </p>
              )}
          </button>

          <button
            onClick={() =>
              setRole("host")
            }
            className={`rounded-2xl border p-4 text-left transition ${
              role === "host"
                ? "border-emerald-400 bg-emerald-400/10"
                : "border-slate-700 bg-slate-950/50"
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-400">
              KivoHost
            </p>

            <p className="mt-2 text-sm font-semibold">
              Share your charger
            </p>

            {user &&
              hasRole(
                "host"
              ) && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">
                  ✓ Already active
                </p>
              )}
          </button>
        </div>

        {!user && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                    "Enter"
                  ) {
                    submit();
                  }
                }}
                placeholder="Minimum 6 characters"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : user
            ? hasRole(role)
              ? "Role already active"
              : role ===
                  "driver"
              ? "Add KivoDriver"
              : "Add KivoHost"
            : mode ===
                "signup"
            ? role ===
                "driver"
              ? "Create KivoDriver account"
              : "Create KivoHost account"
            : role ===
                "driver"
            ? "Sign in + add KivoDriver"
            : "Sign in + add KivoHost"}
        </button>

        {!user && (
          <button
            onClick={() => {
              setMode(
                mode ===
                  "signup"
                  ? "signin"
                  : "signup"
              );

              setError("");
            }}
            className="mt-4 w-full text-sm text-slate-400 transition hover:text-white"
          >
            {mode ===
            "signup"
              ? "Already have a KIVO account? Sign in"
              : "New to KIVO? Create an account"}
          </button>
        )}
      </div>
    </div>
  );
}
