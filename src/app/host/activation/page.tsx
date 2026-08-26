"use client";

import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  updatePassword,
} from "firebase/auth";

import {
  useEffect,
  useState,
} from "react";

import {
  auth,
} from "@/lib/firebase";

type ActivationData = {
  host: {
    uid: string;
    name: string;
    email: string;
    phone: string;
    postalCode: string;
  };

  existingSetup: {
    charger: Record<string, unknown>;
    property: Record<string, unknown>;
    hosting: Record<string, unknown>;
    photos: Record<string, unknown>;
  };

  activation: {
    status: string;

    account: {
      passwordConfigured: boolean;
    };

    gates: {
      safety: { status: string };
      propertyAccess: { status: string };
      charger: { status: string };
      legal: { status: string };
      listing: { status: string };
    };
  };
};

type PageStatus =
  | "checking"
  | "needs-email"
  | "password"
  | "ready"
  | "error";

export default function HostActivationPage() {
  const [status, setStatus] =
    useState<PageStatus>("checking");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [data, setData] =
    useState<ActivationData | null>(null);

  useEffect(() => {
    void initializeActivation();
  }, []);

  async function initializeActivation() {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setStatus("error");
      return;
    }

    try {
      if (
        isSignInWithEmailLink(
          auth,
          window.location.href
        )
      ) {
        const savedEmail =
          window.localStorage.getItem(
            "kivoHostActivationEmail"
          );

        if (!savedEmail) {
          setStatus("needs-email");
          return;
        }

        await completeEmailLinkSignIn(
          savedEmail
        );

        return;
      }

      if (auth.currentUser) {
        const result =
          await validateActivationAccess();

        setData(result);

        setStatus(
          result.activation.account.passwordConfigured
            ? "ready"
            : "password"
        );

        return;
      }

      setError(
        "Open the secure activation link from the approval email KIVO sent you."
      );

      setStatus("error");
    } catch (err) {
      console.error(
        "KIVO Host activation initialization failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't open your Host activation."
      );

      setStatus("error");
    }
  }

  async function completeEmailLinkSignIn(
    activationEmail: string
  ) {
    if (!auth) {
      setError("KIVO authentication is unavailable.");
      setStatus("error");
      return;
    }

    setStatus("checking");
    setError("");

    try {
      await signInWithEmailLink(
        auth,
        activationEmail
          .trim()
          .toLowerCase(),
        window.location.href
      );

      window.localStorage.removeItem(
        "kivoHostActivationEmail"
      );

      window.history.replaceState(
        {},
        "",
        "/host/activation"
      );

      const result =
        await validateActivationAccess();

      setData(result);

      setStatus(
        result.activation.account.passwordConfigured
          ? "ready"
          : "password"
      );
    } catch (err) {
      console.error(
        "KIVO Host activation email-link sign-in failed:",
        err
      );

      await signOut(auth).catch(
        () => undefined
      );

      setError(
        "We couldn't complete this secure sign-in. Enter the same email address used for your Founding Host application."
      );

      setStatus("needs-email");
    }
  }

  async function validateActivationAccess():
    Promise<ActivationData> {
    if (!auth?.currentUser) {
      throw new Error(
        "KIVO sign-in is required."
      );
    }

    const idToken =
      await auth.currentUser.getIdToken(
        true
      );

    const response =
      await fetch(
        "/api/host/activation-access",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${idToken}`,
          },
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result?.error ||
          "Unable to validate Host activation."
      );
    }

    return result as ActivationData;
  }

  async function handleEmailSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Enter the email used for your Founding Host application."
      );
      return;
    }

    window.localStorage.setItem(
      "kivoHostActivationEmail",
      normalizedEmail
    );

    await completeEmailLinkSignIn(
      normalizedEmail
    );
  }

  async function handlePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!auth?.currentUser || !data) {
      setError(
        "Your secure KIVO session is unavailable."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Choose a password with at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "The passwords do not match."
      );
      return;
    }

    setSavingPassword(true);
    setError("");

    try {
      await updatePassword(
        auth.currentUser,
        password
      );

      const idToken =
        await auth.currentUser.getIdToken(
          true
        );

      const response =
        await fetch(
          "/api/host/activation-password-complete",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${idToken}`,
            },
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Your password was created, but KIVO could not save your activation progress."
        );
      }

      setData((current) =>
        current
          ? {
              ...current,
              activation: {
                ...current.activation,
                account: {
                  passwordConfigured: true,
                },
              },
            }
          : current
      );

      setPassword("");
      setConfirmPassword("");
      setStatus("ready");
    } catch (err) {
      console.error(
        "Unable to create KIVO password:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't create your KIVO password."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO HOST ACTIVATION
          </p>

          <h1 className="mt-4 text-3xl font-black">
            Opening your secure activation...
          </h1>
        </div>
      </main>
    );
  }

  if (status === "needs-email") {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO HOST ACTIVATION
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Confirm your email.
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            Enter the same email address used for your approved KIVO Founding Host setup.
          </p>

          <form
            onSubmit={handleEmailSubmit}
            className="mt-8 rounded-[28px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
          >
            <label className="block">
              <span className="text-base font-black text-slate-200">
                Email address
              </span>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none focus:border-emerald-400"
              />
            </label>

            {error && (
              <ErrorBox message={error} />
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
            >
              Continue securely →
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] px-6 text-white">
        <div className="max-w-xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">
            KIVO HOST ACTIVATION
          </p>

          <h1 className="mt-4 text-4xl font-black">
            We couldn't open your activation.
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (
    status === "password" &&
    data
  ) {
    return (
      <main className="min-h-screen bg-[#020817] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
            KIVO HOST ACTIVATION
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Welcome back, {data.host.name || "Host"}.
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            Your Founding Host setup is approved. First, create a permanent KIVO password so you can return to your account without another invitation.
          </p>

          <form
            onSubmit={handlePasswordSubmit}
            className="mt-8 rounded-[28px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
          >
            <label className="block">
              <span className="text-base font-black text-slate-200">
                Create password
              </span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                autoComplete="new-password"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none focus:border-emerald-400"
              />
            </label>

            <label className="mt-5 block">
              <span className="text-base font-black text-slate-200">
                Confirm password
              </span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-lg text-white outline-none focus:border-emerald-400"
              />
            </label>

            {error && (
              <ErrorBox message={error} />
            )}

            <button
              type="submit"
              disabled={savingPassword}
              className="mt-6 w-full rounded-full bg-emerald-400 px-7 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {savingPassword
                ? "Securing account..."
                : "Create KIVO password →"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  const charger =
    data.existingSetup.charger;

  const property =
    data.existingSetup.property;

  return (
    <main className="min-h-screen bg-[#020817] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          KIVO HOST ACTIVATION
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
          Finish becoming a KIVO Host.
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
          Your Founding Host setup is approved. We already have your charger, parking, photos and hosting preferences, so you won't need to enter them again.
        </p>

        <div className="mt-8 rounded-[28px] border border-emerald-300/20 bg-emerald-300/[0.06] p-6 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
            ALREADY COMPLETED
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SummaryCard
              title="Charger"
              lines={[
                [
                  String(charger.brand ?? ""),
                  String(charger.model ?? ""),
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  "Charger information saved",
                String(
                  charger.connector ??
                    "Connector saved"
                ),
                String(
                  charger.power ??
                    "Power saved"
                ),
              ]}
            />

            <SummaryCard
              title="Property & access"
              lines={[
                String(
                  property.setup ??
                    "Parking setup saved"
                ),
                String(
                  property.gatedAccess ??
                    "Access information saved"
                ),
                `ZIP ${data.host.postalCode || "saved"}`,
              ]}
            />
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            FINAL ACTIVATION
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <ActivationCard
              title="Identity & safety"
              description="Complete KIVO's identity and safety verification."
              status={data.activation.gates.safety.status}
            />

            <ActivationCard
              title="Property confirmation"
              description="Confirm your private charging address and authority to host there."
              status={data.activation.gates.propertyAccess.status}
            />

            <ActivationCard
              title="Charger confirmation"
              description="Review the charger information you already supplied and confirm it is operational."
              status={data.activation.gates.charger.status}
            />

            <ActivationCard
              title="Host agreement"
              description="Review and accept the current KIVO Host agreement and required terms."
              status={data.activation.gates.legal.status}
            />

            <ActivationCard
              title="Public listing"
              description="Confirm the public-safe information Drivers will see. Your exact address remains private."
              status={data.activation.gates.listing.status}
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-4 text-sm leading-6 text-slate-400">
          Your charger will remain private and unavailable for booking until all required activation steps are complete and KIVO performs final activation.
        </div>
      </div>
    </main>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-base font-semibold text-red-200">
      {message}
    </div>
  );
}

function SummaryCard({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#07111f] p-5">
      <h2 className="text-lg font-black">
        {title}
      </h2>

      <div className="mt-3 space-y-1 text-sm text-slate-400">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

function ActivationCard({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: string;
}) {
  const normalized =
    status.replaceAll("_", " ");

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#07111f] p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-black">
          {title}
        </h2>

        <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
          {normalized}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}
