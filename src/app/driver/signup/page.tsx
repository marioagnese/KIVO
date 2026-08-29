"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  auth,
} from "@/lib/firebase";

import {
  useAuth,
} from "@/context/AuthContext";

export default function DriverSignupPage() {
  const router =
    useRouter();

  const {
    user,
    loading: authLoading,
    firebaseReady,
    refreshAccountTypes,
  } = useAuth();

  const [mode, setMode] =
    useState<"signup" | "signin">(
      "signup"
    );

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (
      authLoading ||
      !user
    ) {
      return;
    }

    /*
     * Existing authenticated KIVO account.
     *
     * Ensure the shared users/{uid} account document exists
     * and load authoritative roles before routing.
     */
    void (async () => {
      const roles =
        await refreshAccountTypes(
          user
        );

      if (
        roles.includes("driver")
      ) {
        router.replace(
          "/driver/home"
        );
        return;
      }

      router.replace(
        "/driver/setup"
      );
    })();
  }, [
    authLoading,
    user,
    refreshAccountTypes,
    router,
  ]);

  async function submit() {
    setError("");

    if (!email.trim()) {
      setError(
        "Enter your email address."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (
      !auth ||
      !firebaseReady
    ) {
      setError(
        "KIVO authentication is unavailable."
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

      /*
       * Create/load the shared KIVO account before Driver
       * activation begins.
       *
       * This does NOT grant the Driver role.
       */
      const roles =
        await refreshAccountTypes(
          credential.user
        );

      if (
        roles.includes("driver")
      ) {
        router.replace(
          "/driver/home"
        );
        return;
      }

      router.replace(
        "/driver/setup"
      );
    } catch (err: any) {
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
          "That email already has a KIVO account. Enter your existing KIVO password to continue with the same account."
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
            : "Unable to create your KIVO account."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  if (
    authLoading ||
    user
  ) {
    return (
      <main className="min-h-screen bg-[#020817] text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <p className="text-slate-400">
            Opening KivoDriver...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-cyan-300/15 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl sm:p-9">

          <Link
            href="/driver"
            className="inline-block"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-20 w-auto object-contain"
            />
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
            KIVODRIVER
          </p>

          <h1 className="mt-3 text-3xl font-black">
            {mode === "signup"
              ? "Create your KIVO account"
              : "Continue with your KIVO account"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            {mode === "signup"
              ? "Create one secure KIVO account. After that, you’ll complete your Driver profile, agreement and Identity & Safety setup."
              : "Use your existing KIVO account so your Driver and Host access stay connected to one identity."}
          </p>

          <div className="mt-8 space-y-5">

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-300"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    submit();
                  }
                }}
                autoComplete={
                  mode === "signup"
                    ? "new-password"
                    : "current-password"
                }
                placeholder={
                  mode === "signup"
                    ? "Create password"
                    : "Your KIVO password"
                }
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-cyan-300"
              />
            </div>

          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-4 font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Create account & continue →"
              : "Sign in & continue →"}
          </button>

          <div className="mt-7 border-t border-white/10 pt-6 text-center">
            {mode === "signup" ? (
              <>
                <p className="text-sm text-slate-400">
                  Already have KIVO?
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setMode(
                      "signin"
                    );
                    setError("");
                  }}
                  className="mt-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Sign in with my existing account
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  New to KIVO?
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setMode(
                      "signup"
                    );
                    setError("");
                  }}
                  className="mt-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Create my KIVO account
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
