"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

export const KIVO_DRIVER_TERMS_VERSION =
  "2026-08-v1";

type Props = {
  accepted: boolean;
  saving: boolean;
  error: string;
  onAccept: () => void;
  onCancel: () => void;
};

export default function KivoDriverAgreement({
  accepted,
  saving,
  error,
  onAccept,
  onCancel,
}: Props) {
  const scrollRef =
    useRef<HTMLDivElement | null>(null);

  const [scrolled, setScrolled] =
    useState(accepted);

  const [confirmed, setConfirmed] =
    useState(accepted);

  useEffect(() => {
    if (accepted) {
      setScrolled(true);
      setConfirmed(true);
    }
  }, [accepted]);

  function checkScroll() {
    const element =
      scrollRef.current;

    if (!element) return;

    const reachedBottom =
      element.scrollTop +
        element.clientHeight >=
      element.scrollHeight - 20;

    if (reachedBottom) {
      setScrolled(true);
    }
  }

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-5 text-sm leading-7 text-slate-300"
      >
        <p className="font-bold text-white">
          KIVO Driver Agreement
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Version {KIVO_DRIVER_TERMS_VERSION}
        </p>

        <p className="mt-5">
          KIVO operates a marketplace that helps
          Drivers discover and request charging
          sessions from independent Hosts. KIVO does
          not own, operate or control a Host's
          property, charger or vehicle.
        </p>

        <h3 className="mt-6 font-bold text-white">
          1. Driver account and eligibility
        </h3>

        <p className="mt-2">
          You agree to provide accurate account,
          vehicle and charging information and to
          keep that information reasonably current.
          You may not use another person's identity
          or KIVO account to request a charging
          session.
        </p>

        <h3 className="mt-6 font-bold text-white">
          2. Charging requests
        </h3>

        <p className="mt-2">
          A charging request is not confirmed until
          the Host accepts it. Hosts may control
          their availability and may accept or
          decline requests subject to KIVO policies
          and applicable law.
        </p>

        <h3 className="mt-6 font-bold text-white">
          3. Host property
        </h3>

        <p className="mt-2">
          You agree to enter and use Host property
          only for the authorized charging session,
          follow reasonable arrival, parking,
          charging and access instructions, respect
          property boundaries, and avoid disturbing
          the Host, neighbors or other occupants.
        </p>

        <h3 className="mt-6 font-bold text-white">
          4. Charger compatibility
        </h3>

        <p className="mt-2">
          You are responsible for confirming that
          your vehicle, connector, adapter and other
          equipment are compatible with the charging
          option you request. Do not use equipment
          that appears damaged, unsafe or unsuitable.
        </p>

        <h3 className="mt-6 font-bold text-white">
          5. Safe conduct
        </h3>

        <p className="mt-2">
          You agree to operate your vehicle safely,
          comply with applicable laws, avoid
          obstructing driveways or access areas, and
          promptly stop using charging equipment if
          you observe a potentially unsafe condition.
        </p>

        <h3 className="mt-6 font-bold text-white">
          6. Private arrival information
        </h3>

        <p className="mt-2">
          Exact Host addresses, access instructions
          and other private arrival details are
          provided only when appropriate for an
          authorized session. You agree not to
          publish, redistribute or use those details
          for another purpose.
        </p>

        <h3 className="mt-6 font-bold text-white">
          7. Damage and responsibility
        </h3>

        <p className="mt-2">
          You are responsible for damage or loss
          caused by your vehicle, equipment, guests
          or conduct to the extent provided by
          applicable law and KIVO marketplace
          policies.
        </p>

        <h3 className="mt-6 font-bold text-white">
          8. Identity and safety
        </h3>

        <p className="mt-2">
          KIVO may require identity or safety
          verification before permitting real
          marketplace activity. Verification helps
          support trust but does not guarantee the
          identity, conduct, reliability or safety
          of any participant.
        </p>

        <h3 className="mt-6 font-bold text-white">
          9. Payments and cancellations
        </h3>

        <p className="mt-2">
          When KIVO enables marketplace payments,
          charging prices, service fees,
          cancellations, refunds and payment
          authorization will be governed by the
          pricing and policies presented for the
          applicable session.
        </p>

        <h3 className="mt-6 font-bold text-white">
          10. Marketplace role
        </h3>

        <p className="mt-2">
          Hosts remain responsible for their
          property and charging equipment, and
          Drivers remain responsible for their
          vehicles and conduct. KIVO facilitates the
          connection between marketplace
          participants.
        </p>

        <h3 className="mt-6 font-bold text-white">
          11. Acceptance
        </h3>

        <p className="mt-2 pb-4">
          By accepting this Agreement, you confirm
          that you have reviewed these terms and
          agree to comply with KIVO marketplace
          rules, applicable laws and the reasonable
          requirements of an authorized Host
          charging session.
        </p>
      </div>

      {!scrolled && (
        <p className="mt-3 text-xs text-amber-300">
          Scroll through the agreement before accepting.
        </p>
      )}

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          disabled={!scrolled || saving}
          onChange={(event) =>
            setConfirmed(event.target.checked)
          }
          className="mt-1 h-4 w-4"
        />

        <span className="text-sm leading-6 text-slate-300">
          I have reviewed and agree to the KIVO
          Driver Agreement.
        </span>
      </label>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onAccept}
          disabled={
            !scrolled ||
            !confirmed ||
            saving
          }
          className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Accepting..."
            : accepted
              ? "Agreement accepted"
              : "Accept Driver Agreement"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300"
        >
          Close
        </button>
      </div>
    </div>
  );
}
