"use client";

import Link from "next/link";
import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  useAuth,
} from "@/context/AuthContext";


type DriverPage =
  | "home"
  | "find"
  | "trips"
  | "profile";


type KivoDriverShellProps = {
  active: DriverPage;
  children: ReactNode;
};


const NAV_ITEMS: Array<{
  key: DriverPage;
  label: string;
  href: string;
}> = [
  {
    key: "home",
    label: "Home",
    href: "/driver/home",
  },
  {
    key: "find",
    label: "Find",
    href: "/driver/find",
  },
  {
    key: "trips",
    label: "Trips",
    href: "/driver/trips",
  },
  {
    key: "profile",
    label: "Profile",
    href: "/driver/profile",
  },
];


export default function KivoDriverShell({
  active,
  children,
}: KivoDriverShellProps) {
  const router =
    useRouter();

  const {
    user,
    loading,
    hasRole,
    accountTypes,
    logout,
  } = useAuth();

  const [
    accountOpen,
    setAccountOpen,
  ] =
    useState(false);

  const accountRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!hasRole("driver")) {
      router.replace("/account");
    }
  }, [
    loading,
    user,
    hasRole,
    router,
  ]);


  useEffect(() => {
    function closeMenu(
      event: MouseEvent
    ) {
      if (
        accountRef.current &&
        !accountRef.current.contains(
          event.target as Node
        )
      ) {
        setAccountOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      closeMenu
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        closeMenu
      );
    };
  }, []);


  if (
    loading ||
    !user ||
    !hasRole("driver")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa] text-slate-950">

        <div className="text-center">

          <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-700">
            KivoDriver
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Opening your Driver workspace...
          </p>

        </div>

      </main>
    );
  }


  const dualRole =
    accountTypes.includes("host");

  const fullName =
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "KIVO Driver";

  const firstName =
    fullName.split(" ")[0];

  const initial =
    firstName
      .slice(0, 1)
      .toUpperCase() ||
    "D";


  async function signOut() {
    setAccountOpen(false);

    await logout();

    router.replace("/login");
  }


  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-20 text-slate-950 md:pb-0">

      {/* =====================================================
          PERMANENT KIVODRIVER HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between gap-6 px-5 sm:px-7">

          {/* BRAND */}

          <Link
            href="/driver/home"
            className="flex shrink-0 items-center gap-4"
            aria-label="KivoDriver Home"
          >

            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO"
              className="h-12 w-auto sm:h-14"
            />

            <div className="border-l border-slate-200 pl-4">

              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-700">
                KivoDriver
              </p>

              <p className="mt-0.5 hidden text-xs font-medium text-slate-400 xl:block">
                Your charging network
              </p>

            </div>

          </Link>


          {/* DESKTOP PRIMARY NAV */}

          <nav
            className="hidden items-center gap-1 md:flex"
            aria-label="KivoDriver navigation"
          >

            {NAV_ITEMS.map(
              (item) => {
                const selected =
                  active === item.key;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={
                      selected
                        ? "rounded-xl bg-cyan-50 px-4 py-2.5 text-sm font-black text-cyan-700"
                        : "rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                    }
                  >
                    {item.label}
                  </Link>
                );
              }
            )}

          </nav>


          {/* ACCOUNT / WORKSPACE */}

          <div
            ref={accountRef}
            className="relative flex shrink-0 items-center gap-3"
          >

            {dualRole && (
              <Link
                href="/host/home"
                className="hidden rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 lg:inline-flex"
              >
                KivoHost
                <span className="ml-1.5">
                  ↗
                </span>
              </Link>
            )}


            <button
              type="button"
              aria-label="Open Driver menu"
              aria-expanded={accountOpen}
              onClick={() =>
                setAccountOpen(
                  (current) =>
                    !current
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
            >
              {initial}
            </button>


            {accountOpen && (
              <div className="absolute right-0 top-[calc(100%+12px)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">

                <div className="border-b border-slate-100 px-5 py-4">

                  <p className="truncate text-sm font-black text-slate-950">
                    {fullName}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {user.email}
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700">
                    KivoDriver
                  </span>

                </div>


                <div className="p-2">

                  <Link
                    href="/driver/profile"
                    onClick={() =>
                      setAccountOpen(false)
                    }
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Driver profile
                    <span className="text-slate-300">
                      →
                    </span>
                  </Link>

                  <Link
                    href="/account"
                    onClick={() =>
                      setAccountOpen(false)
                    }
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    KIVO account
                    <span className="text-slate-300">
                      →
                    </span>
                  </Link>


                  {dualRole && (
                    <Link
                      href="/host/home"
                      onClick={() =>
                        setAccountOpen(false)
                      }
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Switch to KivoHost
                      <span>
                        →
                      </span>
                    </Link>
                  )}

                </div>


                <div className="border-t border-slate-100 p-2">

                  <button
                    type="button"
                    onClick={
                      signOut
                    }
                    className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    Sign out
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* =====================================================
          PAGE CONTENT
      ====================================================== */}

      {children}


      {/* =====================================================
          MOBILE NAVIGATION
      ====================================================== */}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl md:hidden"
        aria-label="KivoDriver mobile navigation"
      >

        <div className="mx-auto grid max-w-md grid-cols-4">

          {NAV_ITEMS.map(
            (item) => {
              const selected =
                active === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={
                    selected
                      ? "rounded-xl bg-cyan-50 px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-cyan-700"
                      : "rounded-xl px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.08em] text-slate-400"
                  }
                >
                  {item.label}
                </Link>
              );
            }
          )}

        </div>

      </nav>

    </main>
  );
}
