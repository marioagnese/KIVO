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

import KivoHostAgreement, {
  KIVO_HOST_AGREEMENT_VERSION,
} from "@/components/host/KivoHostAgreement";

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

    propertyConfirmation: {
      streetAddress: string;
      unit: string;
      city: string;
      state: string;
      postalCode: string;
      authority: string;
      privateAccessNotes: string;
      chargingLocationConfirmed: boolean;
      hostingAuthorityConfirmed: boolean;
    };

    chargerConfirmation: {
      informationConfirmed: boolean;
      operationalConfirmed: boolean;
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

  const [propertyOpen, setPropertyOpen] =
    useState(false);

  const [streetAddress, setStreetAddress] =
    useState("");

  const [unit, setUnit] =
    useState("");

  const [city, setCity] =
    useState("");

  const [propertyState, setPropertyState] =
    useState("");

  const [propertyPostalCode, setPropertyPostalCode] =
    useState("");

  const [authority, setAuthority] =
    useState("");

  const [privateAccessNotes, setPrivateAccessNotes] =
    useState("");

  const [
    chargingLocationConfirmed,
    setChargingLocationConfirmed,
  ] = useState(false);

  const [
    hostingAuthorityConfirmed,
    setHostingAuthorityConfirmed,
  ] = useState(false);

  const [savingProperty, setSavingProperty] =
    useState(false);

  const [chargerOpen, setChargerOpen] =
    useState(false);

  const [
    chargerInformationConfirmed,
    setChargerInformationConfirmed,
  ] = useState(false);

  const [
    chargerOperationalConfirmed,
    setChargerOperationalConfirmed,
  ] = useState(false);

  const [savingCharger, setSavingCharger] =
    useState(false);

  const [legalOpen, setLegalOpen] =
    useState(false);

  const [agreementScrolled, setAgreementScrolled] =
    useState(false);

  const [agreementAccepted, setAgreementAccepted] =
    useState(false);

  const [savingLegal, setSavingLegal] =
    useState(false);

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

  function openPropertyConfirmation() {
    if (!data) {
      return;
    }

    const saved =
      data.activation.propertyConfirmation;

    setStreetAddress(
      saved?.streetAddress || ""
    );
    setUnit(saved?.unit || "");
    setCity(saved?.city || "");
    setPropertyState(saved?.state || "");
    setPropertyPostalCode(
      saved?.postalCode ||
        data.host.postalCode ||
        ""
    );
    setAuthority(saved?.authority || "");
    setPrivateAccessNotes(
      saved?.privateAccessNotes || ""
    );
    setChargingLocationConfirmed(
      saved?.chargingLocationConfirmed === true
    );
    setHostingAuthorityConfirmed(
      saved?.hostingAuthorityConfirmed === true
    );

    setError("");
    setPropertyOpen(true);

    window.setTimeout(() => {
      document
        .getElementById("property-confirmation-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  async function handlePropertySubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!auth?.currentUser || !data) {
      setError(
        "Your secure KIVO session is unavailable."
      );
      return;
    }

    if (
      !streetAddress.trim() ||
      !city.trim() ||
      !propertyState.trim() ||
      !propertyPostalCode.trim() ||
      !authority
    ) {
      setError(
        "Complete all required property information."
      );
      return;
    }

    if (
      !chargingLocationConfirmed ||
      !hostingAuthorityConfirmed
    ) {
      setError(
        "Confirm both property statements before continuing."
      );
      return;
    }

    setSavingProperty(true);
    setError("");

    try {
      const idToken =
        await auth.currentUser.getIdToken(true);

      const response = await fetch(
        "/api/host/activation-property-complete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            streetAddress:
              streetAddress.trim(),
            unit:
              unit.trim(),
            city:
              city.trim(),
            state:
              propertyState.trim(),
            postalCode:
              propertyPostalCode.trim(),
            authority,
            privateAccessNotes:
              privateAccessNotes.trim(),
            chargingLocationConfirmed,
            hostingAuthorityConfirmed,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to save property confirmation."
        );
      }

      setData((current) =>
        current
          ? {
              ...current,
              activation: {
                ...current.activation,
                gates: {
                  ...current.activation.gates,
                  propertyAccess: {
                    status: "complete",
                  },
                },

                propertyConfirmation: {
                  streetAddress:
                    streetAddress.trim(),
                  unit:
                    unit.trim(),
                  city:
                    city.trim(),
                  state:
                    propertyState
                      .trim()
                      .toUpperCase(),
                  postalCode:
                    propertyPostalCode.trim(),
                  authority,
                  privateAccessNotes:
                    privateAccessNotes.trim(),
                  chargingLocationConfirmed:
                    true,
                  hostingAuthorityConfirmed:
                    true,
                },
              },
            }
          : current
      );

      setPropertyOpen(false);
    } catch (err) {
      console.error(
        "Unable to save KIVO property confirmation:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't save your property confirmation."
      );
    } finally {
      setSavingProperty(false);
    }
  }

  function openChargerConfirmation() {
    if (!data) {
      return;
    }

    setChargerInformationConfirmed(
      data.activation.chargerConfirmation
        ?.informationConfirmed === true
    );

    setChargerOperationalConfirmed(
      data.activation.chargerConfirmation
        ?.operationalConfirmed === true
    );

    setError("");
    setChargerOpen(true);

    window.setTimeout(() => {
      document
        .getElementById("charger-confirmation-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  async function handleChargerSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!auth?.currentUser || !data) {
      setError(
        "Your secure KIVO session is unavailable."
      );
      return;
    }

    if (
      !chargerInformationConfirmed ||
      !chargerOperationalConfirmed
    ) {
      setError(
        "Confirm both charger statements before continuing."
      );
      return;
    }

    setSavingCharger(true);
    setError("");

    try {
      const idToken =
        await auth.currentUser.getIdToken(true);

      const response = await fetch(
        "/api/host/activation-charger-complete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            informationConfirmed:
              chargerInformationConfirmed,
            operationalConfirmed:
              chargerOperationalConfirmed,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to save charger confirmation."
        );
      }

      setData((current) =>
        current
          ? {
              ...current,
              activation: {
                ...current.activation,
                gates: {
                  ...current.activation.gates,
                  charger: {
                    status: "complete",
                  },
                },

                chargerConfirmation: {
                  informationConfirmed: true,
                  operationalConfirmed: true,
                },
              },
            }
          : current
      );

      setChargerOpen(false);
    } catch (err) {
      console.error(
        "Unable to save KIVO charger confirmation:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't save your charger confirmation."
      );
    } finally {
      setSavingCharger(false);
    }
  }

  function openLegalConfirmation() {
    if (!data) {
      return;
    }

    setError("");

    const alreadyAccepted =
      data.activation.gates.legal.status ===
      "complete";

    setAgreementAccepted(alreadyAccepted);
    setAgreementScrolled(alreadyAccepted);
    setLegalOpen(true);

    window.setTimeout(() => {
      document
        .getElementById("host-agreement-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function handleAgreementScroll(
    event: React.UIEvent<HTMLDivElement>
  ) {
    const element = event.currentTarget;

    const nearBottom =
      element.scrollTop +
        element.clientHeight >=
      element.scrollHeight - 20;

    if (nearBottom) {
      setAgreementScrolled(true);
    }
  }

  async function handleLegalSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!auth?.currentUser || !data) {
      setError(
        "Your secure KIVO session is unavailable."
      );
      return;
    }

    if (!agreementScrolled) {
      setError(
        "Scroll through the Host Agreement before accepting it."
      );
      return;
    }

    if (!agreementAccepted) {
      setError(
        "You must agree to the KIVO Host Agreement before continuing."
      );
      return;
    }

    setSavingLegal(true);
    setError("");

    try {
      const idToken =
        await auth.currentUser.getIdToken(true);

      const response = await fetch(
        "/api/host/activation-legal-complete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accepted: true,
            version:
              KIVO_HOST_AGREEMENT_VERSION,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Unable to save Host Agreement acceptance."
        );
      }

      setData((current) =>
        current
          ? {
              ...current,
              activation: {
                ...current.activation,
                gates: {
                  ...current.activation.gates,
                  legal: {
                    status: "complete",
                  },
                },
              },
            }
          : current
      );

      setLegalOpen(false);
    } catch (err) {
      console.error(
        "Unable to save KIVO Host Agreement:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't save your Host Agreement acceptance."
      );
    } finally {
      setSavingLegal(false);
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
              onClick={openPropertyConfirmation}
              actionLabel={
                data.activation.gates.propertyAccess.status ===
                "complete"
                  ? "Review"
                  : "Complete"
              }
            />

            <ActivationCard
              title="Charger confirmation"
              description="Review the charger information you already supplied and confirm it is operational."
              status={data.activation.gates.charger.status}
              onClick={openChargerConfirmation}
              actionLabel={
                data.activation.gates.charger.status ===
                "complete"
                  ? "Review"
                  : "Complete"
              }
            />

            <ActivationCard
              title="Host agreement"
              description="Review and accept the current KIVO Host agreement and required terms."
              status={data.activation.gates.legal.status}
              onClick={openLegalConfirmation}
              actionLabel={
                data.activation.gates.legal.status ===
                "complete"
                  ? "Review"
                  : "Complete"
              }
            />

            <ActivationCard
              title="Public listing"
              description="Confirm the public-safe information Drivers will see. Your exact address remains private."
              status={data.activation.gates.listing.status}
            />
          </div>

          {legalOpen && (
            <form
              id="host-agreement-form"
              onSubmit={handleLegalSubmit}
              className="mt-6 scroll-mt-8 rounded-[28px] border border-emerald-300/20 bg-[#07111f] p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
                    HOST AGREEMENT
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Review the KIVO Host Agreement.
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Version {KIVO_HOST_AGREEMENT_VERSION}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLegalOpen(false);
                    setError("");
                  }}
                  className="shrink-0 text-sm font-black text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div
                onScroll={handleAgreementScroll}
                className="mt-7 h-[520px] overflow-y-auto rounded-2xl border border-white/10 bg-[#020817] p-6"
              >
                <KivoHostAgreement />
              </div>

              {data.activation.gates.legal.status !==
                "complete" && (
                <p className="mt-3 text-xs font-bold text-slate-500">
                  Scroll to the bottom of the agreement to enable acceptance.
                </p>
              )}

              <label className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-300">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  disabled={!agreementScrolled}
                  onChange={(event) =>
                    setAgreementAccepted(
                      event.target.checked
                    )
                  }
                  className="mt-1 h-4 w-4 disabled:opacity-40"
                />

                <span>
                  I have read and agree to the KIVO Host Agreement, version{" "}
                  <strong className="text-white">
                    {KIVO_HOST_AGREEMENT_VERSION}
                  </strong>
                  .
                </span>
              </label>

              {error && (
                <ErrorBox message={error} />
              )}

              {data.activation.gates.legal.status ===
              "complete" ? (
                <div className="mt-7 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-bold text-emerald-200">
                  This version of the KIVO Host Agreement has been accepted.
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={
                    savingLegal ||
                    !agreementScrolled ||
                    !agreementAccepted
                  }
                  className="mt-7 rounded-full bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {savingLegal
                    ? "Saving agreement..."
                    : "Accept Host Agreement →"}
                </button>
              )}
            </form>
          )}

          {chargerOpen && (
            <form
              id="charger-confirmation-form"
              onSubmit={handleChargerSubmit}
              className="mt-6 scroll-mt-8 rounded-[28px] border border-emerald-300/20 bg-[#07111f] p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
                    CHARGER CONFIRMATION
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Confirm your charger is ready.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    We already have the charger information you supplied during
                    your Founding Host setup. Review it below and confirm that
                    the charger is installed and operational.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setChargerOpen(false);
                    setError("");
                  }}
                  className="shrink-0 text-sm font-black text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                  SAVED CHARGER
                </p>

                <div className="mt-4 space-y-2 text-base text-slate-300">
                  <p>
                    <span className="font-black text-white">
                      Brand / model:
                    </span>{" "}
                    {[
                      String(charger.brand ?? ""),
                      String(charger.model ?? ""),
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                      "Information saved"}
                  </p>

                  <p>
                    <span className="font-black text-white">
                      Connector:
                    </span>{" "}
                    {String(
                      charger.connector ??
                        "Information saved"
                    )}
                  </p>

                  <p>
                    <span className="font-black text-white">
                      Power:
                    </span>{" "}
                    {String(
                      charger.power ??
                        "Information saved"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      chargerInformationConfirmed
                    }
                    onChange={(event) =>
                      setChargerInformationConfirmed(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    I confirm the charger information shown above is accurate.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={
                      chargerOperationalConfirmed
                    }
                    onChange={(event) =>
                      setChargerOperationalConfirmed(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    I confirm this charger is installed, operational and available
                    for charging sessions when I make it available through KIVO.
                  </span>
                </label>
              </div>

              {error && (
                <ErrorBox message={error} />
              )}

              <button
                type="submit"
                disabled={savingCharger}
                className="mt-7 rounded-full bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {savingCharger
                  ? "Saving charger..."
                  : "Confirm charger →"}
              </button>
            </form>
          )}

          {propertyOpen && (
            <form
              id="property-confirmation-form"
              onSubmit={handlePropertySubmit}
              className="mt-6 scroll-mt-8 rounded-[28px] border border-emerald-300/20 bg-[#07111f] p-6 sm:p-8"
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-300">
                    PROPERTY CONFIRMATION
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Confirm your private charging location.
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                    Your exact street address is private KIVO account information.
                    Drivers will not see it publicly. Private arrival details are only
                    shared through the controlled booking flow.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPropertyOpen(false);
                    setError("");
                  }}
                  className="shrink-0 text-sm font-black text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-sm font-black text-slate-200">
                    Street address *
                  </span>

                  <input
                    value={streetAddress}
                    onChange={(event) =>
                      setStreetAddress(event.target.value)
                    }
                    autoComplete="street-address"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-slate-200">
                    Unit / Apt
                  </span>

                  <input
                    value={unit}
                    onChange={(event) =>
                      setUnit(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-slate-200">
                    City *
                  </span>

                  <input
                    value={city}
                    onChange={(event) =>
                      setCity(event.target.value)
                    }
                    autoComplete="address-level2"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-slate-200">
                    State *
                  </span>

                  <input
                    value={propertyState}
                    onChange={(event) =>
                      setPropertyState(event.target.value)
                    }
                    maxLength={2}
                    placeholder="TX"
                    autoComplete="address-level1"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 uppercase text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label>
                  <span className="text-sm font-black text-slate-200">
                    ZIP code *
                  </span>

                  <input
                    value={propertyPostalCode}
                    onChange={(event) =>
                      setPropertyPostalCode(
                        event.target.value
                      )
                    }
                    autoComplete="postal-code"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-black text-slate-200">
                    Your authority at this property *
                  </span>

                  <select
                    value={authority}
                    onChange={(event) =>
                      setAuthority(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  >
                    <option value="">
                      Select one
                    </option>
                    <option value="owner">
                      I own this property
                    </option>
                    <option value="authorized_renter">
                      I rent and have authority to offer charging here
                    </option>
                    <option value="other_authorized">
                      I otherwise have authority to offer charging here
                    </option>
                  </select>
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-black text-slate-200">
                    Private arrival / access notes
                  </span>

                  <textarea
                    value={privateAccessNotes}
                    onChange={(event) =>
                      setPrivateAccessNotes(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Optional: gate instructions, driveway location, parking guidance, or other private arrival details."
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={chargingLocationConfirmed}
                    onChange={(event) =>
                      setChargingLocationConfirmed(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    I confirm this is the location where KIVO charging sessions would take place.
                  </span>
                </label>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    checked={hostingAuthorityConfirmed}
                    onChange={(event) =>
                      setHostingAuthorityConfirmed(
                        event.target.checked
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />

                  <span>
                    I confirm that I have authority to offer EV charging access at this property.
                  </span>
                </label>
              </div>

              {error && (
                <ErrorBox message={error} />
              )}

              <button
                type="submit"
                disabled={savingProperty}
                className="mt-7 rounded-full bg-emerald-400 px-7 py-4 text-base font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
              >
                {savingProperty
                  ? "Saving property..."
                  : "Confirm property →"}
              </button>
            </form>
          )}
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
  onClick,
  actionLabel,
}: {
  title: string;
  description: string;
  status: string;
  onClick?: () => void;
  actionLabel?: string;
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

      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="mt-5 rounded-full border border-emerald-300/30 px-4 py-2 text-sm font-black text-emerald-300 transition hover:bg-emerald-300/10"
        >
          {actionLabel || "Continue"} →
        </button>
      )}
    </div>
  );
}
