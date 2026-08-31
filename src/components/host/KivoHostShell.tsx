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


type HostPage =
  | "home"
  | "requests"
  | "listing"
  | "history"
  | "profile";


type KivoHostShellProps = {
  active: HostPage;
  children: ReactNode;
};


const NAV_ITEMS: Array<{
  key: HostPage;
  label: string;
  href: string;
}> = [
  {
    key: "home",
    label: "Home",
    href: "/host/home",
  },
  {
    key: "requests",
    label: "Requests",
    href: "/host/requests",
  },
  {
    key: "listing",
    label: "Listing",
    href: "/host/listing",
  },
  {
    key: "history",
    label: "History",
    href: "/host/history",
  },
  {
    key: "profile",
    label: "Profile",
    href: "/host/profile",
  },
];


export default function KivoHostShell({
  active,
  children,
}: KivoHostShellProps) {
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
    accountMenuOpen,
    setAccountMenuOpen,
  ] = useState(false);

  const menuRef =
    useRef<HTMLDivElement | null>(
      null
    );


  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace(
        "/login"
      );
      return;
    }

    if (!hasRole("host")) {
      router.replace(
        "/account"
      );
    }
  }, [
    loading,
    user,
    hasRole,
    router,
  ]);


  useEffect(() => {
    function handlePointerDown(
      event: MouseEvent
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node
        )
      ) {
        setAccountMenuOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown
      );
    };
  }, []);


  if (
    loading ||
    !user ||
    !hasRole("host")
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
            KivoHost
          </p>

          <p className="mt-3 text-sm text-slate-500">
            Opening your Host workspace...
          </p>
        </div>
      </main>
    );
  }


  const dualRole =
    accountTypes.includes(
      "driver"
    );

  const displayName =
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    "KIVO Host";

  const initial =
    displayName
      .charAt(0)
      .toUpperCase();


  async function signOut() {
    await logout();

    router.replace(
      "/login"
    );
  }


  return (
    <main className="min-h-screen bg-[#f5f7fa] pb-20 text-slate-950 md:pb-0">

      {/* =====================================================
          DESKTOP / TABLET HEADER
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl">

        <div className="mx-auto flex h-[78px] max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8">

          {/* BRAND */}

          <div className="flex min-w-0 items-center gap-5">

            <Link
              href="/host/home"
              className="flex shrink-0 items-center"
            >
              <img
                src="/kivo/kivo-wordmark.png"
                alt="KIVO"
                className="h-12 w-auto sm:h-14"
              />
            </Link>


            <div className="hidden border-l border-slate-200 pl-5 sm:block">

              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
                KivoHost
              </p>

              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                Your hosting workspace
              </p>

            </div>

          </div>


          {/* DESKTOP NAV */}

          <nav className="hidden items-center gap-1 lg:flex">

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
                        ? "rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700"
                        : "rounded-2xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    }
                  >
                    {item.label}
                  </Link>
                );
              }
            )}

          </nav>


          {/* ACCOUNT */}

          <div
            ref={menuRef}
            className="relative flex shrink-0 items-center gap-3"
          >

            {dualRole && (
              <Link
                href="/driver/home"
                className="hidden rounded-2xl border border-cyan-200 bg-cyan-50/60 px-4 py-2.5 text-xs font-black text-cyan-700 transition hover:bg-cyan-50 xl:inline-flex"
              >
                KivoDriver
              </Link>
            )}


            <button
              type="button"
              aria-label="Open Host account menu"
              aria-expanded={
                accountMenuOpen
              }
              onClick={() =>
                setAccountMenuOpen(
                  (current) =>
                    !current
                )
              }
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#020817] text-sm font-black text-white shadow-sm transition hover:scale-[1.03]"
            >
              {initial}
            </button>


            {accountMenuOpen && (
              <div className="absolute right-0 top-[58px] w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">

                <div className="border-b border-slate-100 px-5 py-5">

                  <p className="truncate font-black text-slate-950">
                    {displayName}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-400">
                    {user.email}
                  </p>

                  <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">
                    KivoHost
                  </span>

                </div>


                <div className="p-2">

                  <Link
                    href="/host/profile"
                    onClick={() =>
                      setAccountMenuOpen(
                        false
                      )
                    }
                    className="flex rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Host profile
                  </Link>

                  <Link
                    href="/account"
                    onClick={() =>
                      setAccountMenuOpen(
                        false
                      )
                    }
                    className="flex rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    KIVO account
                  </Link>


                  {dualRole && (
                    <Link
                      href="/driver/home"
                      onClick={() =>
                        setAccountMenuOpen(
                          false
                        )
                      }
                      className="flex rounded-2xl px-4 py-3 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                    >
                      Switch to KivoDriver
                    </Link>
                  )}


                  <div className="my-2 border-t border-slate-100" />


                  <button
                    type="button"
                    onClick={
                      signOut
                    }
                    className="flex w-full rounded-2xl px-4 py-3 text-left text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Sign out
                  </button>

                </div>

              </div>
            )}

          </div>

        </div>

      </header>


      {/* PAGE CONTENT */}

      {children}


      {/* =====================================================
          MOBILE NAV
      ===================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur-xl lg:hidden">

        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">

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
                      ? "rounded-xl bg-emerald-50 px-1 py-2 text-center text-[10px] font-black uppercase tracking-[0.06em] text-emerald-700"
                      : "rounded-xl px-1 py-2 text-center text-[10px] font-black uppercase tracking-[0.06em] text-slate-400"
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
