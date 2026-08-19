"use client";

import dynamic from "next/dynamic";

const KivoApp = dynamic(() => import("./KivoApp"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="text-center">
        <p className="text-lg font-bold tracking-[0.25em] text-emerald-400">
          KIVO
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Loading your charging network...
        </p>
      </div>
    </main>
  ),
});

export default function Page() {
  return <KivoApp />;
}
