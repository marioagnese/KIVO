"use client";

import { useMemo, useState } from "react";

const chargerOptions = [
  { label: "7.7 kW Level 2", value: 7.7 },
  { label: "9.6 kW Level 2", value: 9.6 },
  { label: "11.5 kW Level 2", value: 11.5 },
];

const sessionOptions = [1, 2, 3, 4];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function HostEarningsCalculator() {
  const [chargerKw, setChargerKw] = useState(9.6);
  const [sessionHours, setSessionHours] = useState(2);
  const [electricityRate, setElectricityRate] = useState(0.16);
  const [sessionsPerMonth, setSessionsPerMonth] = useState(10);

  const economics = useMemo(() => {
    const energy = chargerKw * sessionHours;
    const electricityCost = energy * electricityRate;

    // Validation assumption only:
    // model the illustrative Host payout at $6 per booked hour.
    // This is NOT final KIVO pricing.
    const hostPayout = sessionHours * 6;

    const netPerSession = Math.max(
      0,
      hostPayout - electricityCost
    );

    const monthlyNet =
      netPerSession * sessionsPerMonth;

    return {
      energy,
      electricityCost,
      hostPayout,
      netPerSession,
      monthlyNet,
    };
  }, [
    chargerKw,
    sessionHours,
    electricityRate,
    sessionsPerMonth,
  ]);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(2,8,23,0.10)] sm:p-8">

      <div className="flex flex-col gap-2 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            HOST EARNINGS ESTIMATOR
          </p>

          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Try your numbers.
          </h3>
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Illustrative only
        </span>

      </div>


      <div className="mt-6 grid gap-4 sm:grid-cols-2">

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Charger
          </span>

          <select
            value={chargerKw}
            onChange={(event) =>
              setChargerKw(Number(event.target.value))
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500"
          >
            {chargerOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>


        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Typical session
          </span>

          <select
            value={sessionHours}
            onChange={(event) =>
              setSessionHours(Number(event.target.value))
            }
            className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500"
          >
            {sessionOptions.map((hours) => (
              <option
                key={hours}
                value={hours}
              >
                {hours} {hours === 1 ? "hour" : "hours"}
              </option>
            ))}
          </select>
        </label>


        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Your electricity rate
          </span>

          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">
              $
            </span>

            <input
              type="number"
              min="0.01"
              max="1"
              step="0.01"
              value={electricityRate}
              onChange={(event) =>
                setElectricityRate(
                  Math.max(
                    0,
                    Number(event.target.value)
                  )
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3.5 pl-8 pr-16 text-base font-semibold text-slate-950 outline-none transition focus:border-emerald-500"
            />

            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
              /kWh
            </span>
          </div>
        </label>


        <div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Sessions per month
            </span>

            <span className="text-lg font-black text-slate-950">
              {sessionsPerMonth}
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={sessionsPerMonth}
            onChange={(event) =>
              setSessionsPerMonth(
                Number(event.target.value)
              )
            }
            className="mt-5 w-full accent-emerald-500"
          />

          <div className="mt-1 flex justify-between text-[11px] text-slate-400">
            <span>1</span>
            <span>30</span>
          </div>
        </div>

      </div>


      <div className="mt-7 grid gap-3 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            ENERGY / SESSION
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {economics.energy.toFixed(1)} kWh
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            ELECTRICITY
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {money(economics.electricityCost)}
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            ILLUSTRATIVE PAYOUT
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {money(economics.hostPayout)}
          </p>
        </div>

      </div>


      <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 p-6">

        <div className="grid gap-6 sm:grid-cols-2">

          <div>
            <p className="text-sm font-bold text-emerald-900">
              Estimated net per session
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight text-emerald-700">
              {money(economics.netPerSession)}
            </p>

            <p className="mt-2 text-xs text-emerald-900/60">
              after estimated electricity
            </p>
          </div>


          <div className="border-t border-emerald-200 pt-5 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <p className="text-sm font-bold text-emerald-900">
              Potential monthly net
            </p>

            <p className="mt-2 text-4xl font-black tracking-tight text-emerald-700">
              {money(economics.monthlyNet)}
            </p>

            <p className="mt-2 text-xs text-emerald-900/60">
              at {sessionsPerMonth} sessions/month
            </p>
          </div>

        </div>

      </div>


      <p className="mt-5 text-xs leading-5 text-slate-500">
        This calculator is for KIVO marketplace validation only.
        It assumes an illustrative Host payout of $6 per booked
        hour. Final pricing, fees, electricity reimbursement and
        Host earnings have not yet been established and are not
        guaranteed.
      </p>


      <a
        href="#founding-host"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
      >
        Become a Founding Host
        <span aria-hidden="true">→</span>
      </a>

    </div>
  );
}
