"use client";

import { useEffect, useState } from "react";
import {
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "admin@kivocharge.com";

export default function AdminLoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth?.currentUser) {
      return;
    }

    const currentUser = auth.currentUser;

    if (
      currentUser.email?.toLowerCase() === ADMIN_EMAIL &&
      currentUser.emailVerified
    ) {
      window.location.href = "/admin/hosts";
    }
  }, []);

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!auth) {
      setError("Firebase authentication is unavailable.");
      return;
    }

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError("This account is not authorized for KIVO admin access.");
      return;
    }

    if (!password) {
      setError("Enter the admin password.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = credential.user;

      if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
        await signOut(auth);
        setError("This account is not authorized for KIVO admin access.");
        return;
      }

      if (!user.emailVerified) {
        await sendEmailVerification(user);

        setMessage(
          "Verification email sent to admin@kivocharge.com. Open that email, verify the account, then return here and sign in again."
        );

        await signOut(auth);
        return;
      }

      window.location.href = "/admin/hosts";
    } catch (err: any) {
      const code = String(err?.code || "");

      if (
        code.includes("invalid-credential") ||
        code.includes("wrong-password") ||
        code.includes("user-not-found")
      ) {
        setError("Admin email or password is incorrect.");
      } else if (code.includes("too-many-requests")) {
        setError("Too many attempts. Please wait and try again.");
      } else {
        console.error("KIVO admin login failed:", err);
        setError("Unable to sign in to KIVO admin.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-[520px]">

        <div className="mb-10 text-center">
          <img
            src="/kivo/kivo-wordmark.png"
            alt="KIVO"
            className="mx-auto h-[110px] w-auto object-contain"
          />

          <p className="mt-2 text-sm font-black uppercase tracking-[0.22em] text-emerald-400">
            KIVO ADMIN
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Internal access
          </h1>

          <p className="mt-4 text-lg leading-7 text-slate-400">
            Sign in with the authorized KIVO administration account.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-[28px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur-md sm:p-8"
        >
          <label className="block">
            <span className="text-sm font-bold text-slate-300">
              Admin email
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#06101f] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-bold text-slate-300">
              Password
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-white/15 bg-[#06101f] px-4 py-3.5 text-base text-white outline-none transition focus:border-emerald-400"
            />
          </label>

          {error && (
            <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200">
              {error}
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-emerald-400 px-5 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in to KIVO Admin"}
          </button>
        </form>
      </div>
    </main>
  );
}
