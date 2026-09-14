import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
const { adminDb } =
  await import("../src/lib/firebaseAdmin");

const ADMIN_EMAIL =
  "admin@kivocharge.com";

type RecoveryPerson = {
  email: string;
  name: string;
  phone: string;
  originalUid: string;
  originalSignupDate: string;
  wasFoundingHost: boolean;
  oldFoundingHostNumber: number | null;
  oldCommissionPlan: string;
  recoveryStatus: string;
  sourceCollections: Set<string>;
};

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function dateString(value: any) {
  if (!value) return "";

  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  } catch {
    return "";
  }
}

function csvEscape(value: unknown) {
  const s = String(value ?? "");

  if (
    s.includes(",") ||
    s.includes('"') ||
    s.includes("\n")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }

  return s;
}

const people =
  new Map<string, RecoveryPerson>();

function ensurePerson(email: string) {
  let person = people.get(email);

  if (!person) {
    person = {
      email,
      name: "",
      phone: "",
      originalUid: "",
      originalSignupDate: "",
      wasFoundingHost: false,
      oldFoundingHostNumber: null,
      oldCommissionPlan: "",
      recoveryStatus:
        "pre_reset_restart_required",
      sourceCollections: new Set(),
    };

    people.set(email, person);
  }

  return person;
}

function keepEarliest(
  current: string,
  candidate: string
) {
  if (!candidate) return current;
  if (!current) return candidate;

  return new Date(candidate).getTime() <
    new Date(current).getTime()
    ? candidate
    : current;
}

// ============================================================
// FOUNDING HOST LEADS
// ============================================================

const leadsSnapshot =
  await adminDb
    .collection("foundingHostLeads")
    .get();

for (const doc of leadsSnapshot.docs) {
  const data = doc.data();

  const email =
    normalizeEmail(data.email);

  if (
    !email ||
    email === ADMIN_EMAIL
  ) {
    continue;
  }

  const person =
    ensurePerson(email);

  person.sourceCollections.add(
    "foundingHostLeads"
  );

  if (!person.name) {
    person.name =
      String(data.name ?? "").trim();
  }

  if (!person.phone) {
    person.phone =
      String(data.phone ?? "").trim();
  }

  person.wasFoundingHost =
    data.foundingHost === true ||
    person.wasFoundingHost;

  person.originalSignupDate =
    keepEarliest(
      person.originalSignupDate,
      dateString(data.createdAt)
    );
}

// ============================================================
// HOST ONBOARDING
// ============================================================

const onboardingSnapshot =
  await adminDb
    .collection("hostOnboarding")
    .get();

for (const doc of onboardingSnapshot.docs) {
  const data = doc.data();

  const email =
    normalizeEmail(data.email);

  if (
    !email ||
    email === ADMIN_EMAIL
  ) {
    continue;
  }

  const person =
    ensurePerson(email);

  person.sourceCollections.add(
    "hostOnboarding"
  );

  if (!person.name) {
    person.name =
      String(data.name ?? "").trim();
  }

  if (!person.phone) {
    person.phone =
      String(data.phone ?? "").trim();
  }

  if (!person.originalUid) {
    person.originalUid =
      String(
        data.uid ??
        doc.id ??
        ""
      ).trim();
  }

  person.wasFoundingHost =
    data.foundingHost === true ||
    person.wasFoundingHost;

  const oldNumber =
    Number(
      data.foundingHostNumber
    );

  if (
    Number.isFinite(oldNumber) &&
    oldNumber > 0
  ) {
    person.oldFoundingHostNumber =
      oldNumber;
  }

  if (!person.oldCommissionPlan) {
    person.oldCommissionPlan =
      String(
        data.commissionPlan ?? ""
      ).trim();
  }

  person.originalSignupDate =
    keepEarliest(
      person.originalSignupDate,
      dateString(data.createdAt)
    );
}

// ============================================================
// HOST ACTIVATIONS
// ============================================================

const activationSnapshot =
  await adminDb
    .collection("hostActivations")
    .get();

for (const doc of activationSnapshot.docs) {
  const data = doc.data();

  let email = "";

  const uid =
    String(
      data.uid ??
      doc.id ??
      ""
    ).trim();

  // Try matching by UID first.
  for (const person of people.values()) {
    if (
      uid &&
      person.originalUid === uid
    ) {
      email = person.email;
      break;
    }
  }

  if (!email) {
    continue;
  }

  const person =
    ensurePerson(email);

  person.sourceCollections.add(
    "hostActivations"
  );

  person.wasFoundingHost =
    data.foundingHost === true ||
    person.wasFoundingHost;

  const oldNumber =
    Number(
      data.foundingHostNumber ??
      data.commissionEntitlement
        ?.foundingHostNumber
    );

  if (
    Number.isFinite(oldNumber) &&
    oldNumber > 0
  ) {
    person.oldFoundingHostNumber =
      oldNumber;
  }

  if (!person.oldCommissionPlan) {
    person.oldCommissionPlan =
      String(
        data.commissionPlan ?? ""
      ).trim();
  }
}

// ============================================================
// USERS
// ============================================================

const usersSnapshot =
  await adminDb
    .collection("users")
    .get();

for (const doc of usersSnapshot.docs) {
  const data = doc.data();

  const email =
    normalizeEmail(data.email);

  if (
    !email ||
    email === ADMIN_EMAIL
  ) {
    continue;
  }

  const person =
    ensurePerson(email);

  person.sourceCollections.add(
    "users"
  );

  if (!person.originalUid) {
    person.originalUid =
      doc.id;
  }

  if (!person.name) {
    person.name =
      String(
        data.displayName ??
        data.name ??
        ""
      ).trim();
  }

  person.originalSignupDate =
    keepEarliest(
      person.originalSignupDate,
      dateString(data.createdAt)
    );
}

// ============================================================
// WRITE RECOVERY COLLECTION
// ============================================================

const ordered =
  [...people.values()]
    .sort(
      (a, b) =>
        a.email.localeCompare(
          b.email
        )
    );

for (const person of ordered) {
  const safeId =
    person.email
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

  await adminDb
    .collection(
      "foundingHostRecovery"
    )
    .doc(safeId)
    .set(
      {
        email:
          person.email,

        name:
          person.name,

        phone:
          person.phone,

        originalUid:
          person.originalUid,

        originalSignupDate:
          person.originalSignupDate,

        wasFoundingHost:
          person.wasFoundingHost,

        oldFoundingHostNumber:
          person.oldFoundingHostNumber,

        oldCommissionPlan:
          person.oldCommissionPlan,

        recoveryStatus:
          person.recoveryStatus,

        sourceCollections:
          [...person.sourceCollections]
            .sort(),

        preservedDuringReset:
          true,

        resetCohort:
          "2026-09-14",
      },
      { merge: true }
    );
}

// ============================================================
// CSV BACKUP
// ============================================================

const headers = [
  "email",
  "name",
  "phone",
  "originalUid",
  "originalSignupDate",
  "wasFoundingHost",
  "oldFoundingHostNumber",
  "oldCommissionPlan",
  "recoveryStatus",
  "sourceCollections",
];

const rows = [
  headers.join(","),
  ...ordered.map(
    (p) =>
      [
        p.email,
        p.name,
        p.phone,
        p.originalUid,
        p.originalSignupDate,
        p.wasFoundingHost,
        p.oldFoundingHostNumber ?? "",
        p.oldCommissionPlan,
        p.recoveryStatus,
        [...p.sourceCollections]
          .sort()
          .join("|"),
      ]
        .map(csvEscape)
        .join(",")
  ),
];

const output =
  path.join(
    process.cwd(),
    "kivo-pre-reset-recovery-2026-09-14.csv"
  );

fs.writeFileSync(
  output,
  rows.join("\n")
);

console.log("");
console.log(
  "===================================="
);
console.log(
  "KIVO PRE-RESET RECOVERY COMPLETE"
);
console.log(
  "===================================="
);

console.log(
  `Recovery people preserved: ${ordered.length}`
);

console.log(
  `Founding Host leads read: ${leadsSnapshot.size}`
);

console.log(
  `Host onboarding records read: ${onboardingSnapshot.size}`
);

console.log(
  `Host activation records read: ${activationSnapshot.size}`
);

console.log(
  `User records read: ${usersSnapshot.size}`
);

console.log(
  `CSV backup: ${output}`
);

console.log("");
console.log(
  "NO USERS OR OPERATIONAL DATA WERE DELETED."
);

}

main().catch((error) => {
  console.error("Pre-reset recovery failed:", error);
  process.exit(1);
});
