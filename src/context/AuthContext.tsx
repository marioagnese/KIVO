"use client";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  auth,
  db,
  isFirebaseConfigured,
} from "@/lib/firebase";

export type KivoAccountRole =
  | "driver"
  | "host";

type AuthContextValue = {
  user: User | null;
  loading: boolean;

  accountTypes: KivoAccountRole[];

  hasRole: (
    role: KivoAccountRole
  ) => boolean;

  addAccountType: (
    role: KivoAccountRole,
    targetUser?: User
  ) => Promise<void>;

  firebaseReady: boolean;

  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null
  );

function sanitizeRoles(
  value: unknown
): KivoAccountRole[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      role
    ): role is KivoAccountRole =>
      role === "driver" ||
      role === "host"
  );
}

async function loadUserProfile(
  user: User
): Promise<KivoAccountRole[]> {
  if (!db) {
    return [];
  }

  const ref =
    doc(db, "users", user.uid);

  const snapshot =
    await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      email:
        user.email || "",
      roles: [],
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    });

    return [];
  }

  return sanitizeRoles(
    snapshot.data()?.roles
  );
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [
    accountTypes,
    setAccountTypes,
  ] =
    useState<KivoAccountRole[]>(
      []
    );

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          firebaseUser
        ) => {
          setUser(
            firebaseUser
          );

          if (
            !firebaseUser
          ) {
            setAccountTypes(
              []
            );

            setLoading(
              false
            );

            return;
          }

          try {
            const roles =
              await loadUserProfile(
                firebaseUser
              );

            setAccountTypes(
              roles
            );
          } catch (
            error
          ) {
            console.error(
              "Failed to load KIVO user profile:",
              error
            );

            setAccountTypes(
              []
            );
          }

          setLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, []);

  function hasRole(
    role: KivoAccountRole
  ) {
    return accountTypes.includes(
      role
    );
  }

  async function addAccountType(
    role: KivoAccountRole,
    targetUser?: User
  ) {
    const activeUser =
      targetUser ?? user;

    if (
      !activeUser ||
      !db
    ) {
      return;
    }

    const ref =
      doc(
        db,
        "users",
        activeUser.uid
      );

    const snapshot =
      await getDoc(ref);

    const existingRoles =
      snapshot.exists()
        ? sanitizeRoles(
            snapshot.data()?.roles
          )
        : [];

    const updated =
      existingRoles.includes(role)
        ? existingRoles
        : [
            ...existingRoles,
            role,
          ];

    await setDoc(
      ref,
      {
        email:
          activeUser.email || "",
        roles:
          updated,
        updatedAt:
          serverTimestamp(),
        ...(
          snapshot.exists()
            ? {}
            : {
                createdAt:
                  serverTimestamp(),
              }
        ),
      },
      {
        merge: true,
      }
    );

    setAccountTypes(
      updated
    );

    // Clean up old browser-only role keys
    // from the prototype phase.
    localStorage.removeItem(
      `kivo-role:${activeUser.uid}`
    );

    localStorage.removeItem(
      `kivo-roles:${activeUser.uid}`
    );
  }

  async function logout() {
    if (!auth) {
      return;
    }

    await signOut(
      auth
    );

    setAccountTypes(
      []
    );
  }

  const value =
    useMemo<AuthContextValue>(
      () => ({
        user,
        loading,
        accountTypes,
        hasRole,
        addAccountType,
        firebaseReady:
          isFirebaseConfigured,
        logout,
      }),
      [
        user,
        loading,
        accountTypes,
      ]
    );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(
      AuthContext
    );

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
