"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  useAuth,
  type KivoAccountRole,
} from "@/context/AuthContext";

import {
  auth,
} from "@/lib/firebase";

function destinationForRoles(
  roles: KivoAccountRole[]
) {
  const driver =
    roles.includes("driver");

  const host =
    roles.includes("host");

  if (driver && host) {
    return "/account";
  }

  if (driver) {
    return "/driver/home";
  }

  if (host) {
    return "/host/home";
  }

  return "/account";
}

export default function LoginPage() {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    firebaseReady,
    refreshAccountTypes,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  async function submit() {
    setError("");

    if (!email.trim()) {
      setError(
        "Enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Enter your password."
      );
      return;
    }

    if (
      !auth ||
      !firebaseReady
    ) {
      setError(
        "KIVO authentication is not available."
      );
      return;
    }

    setLoading(true);

    try {
      const credential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const roles =
        await refreshAccountTypes(
          credential.user
        );

      const requestedNext =
        searchParams.get("next");

      const safeNext =
        requestedNext &&
        requestedNext.startsWith("/") &&
        !requestedNext.startsWith("//")
          ? requestedNext
          : null;

      router.replace(
        safeNext ||
          destinationForRoles(
            roles
          )
      );
    } catch (err: any) {
      const code =
        String(
          err?.code || ""
        );

      if (
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
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to sign in."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-xl sm:p-9">

          <Link
            href="/"
            className="inline-block"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-20 w-auto object-contain"
            />
          </Link>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
            KIVO ACCOUNT
          </p>

          <h1 className="mt-3 text-3xl font-black">
            Welcome back
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to your KIVO account.
            Your account determines whether
            you enter KivoDriver,
            KivoHost, or both.
          </p>

          <div className="mt-8 space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
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
                autoComplete="email"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
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
                    e.key === "Enter"
                  ) {
                    submit();
                  }
                }}
                placeholder="Password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-4 font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Log in"}
          </button>

          <div className="mt-7 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-slate-400">
              New to KIVO?
            </p>

            <div className="mt-3 flex justify-center gap-5 text-sm font-semibold">
              <Link
                href="/driver/signup"
                className="text-cyan-300 hover:text-cyan-200"
              >
                Become a Driver
              </Link>

              <Link
                href="/host"
                className="text-emerald-300 hover:text-emerald-200"
              >
                Become a Host
              </Link>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
