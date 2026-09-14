import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const firebaseAdmin =
    await import("../src/lib/firebaseAdmin");

  const adminDb =
    firebaseAdmin.adminDb;

  const adminAuth =
    firebaseAdmin.adminAuth;

  const ADMIN_EMAIL =
    "admin@kivocharge.com";

  const ADMIN_UID =
    "mxDJ9bWX6RP3Z95iXC0h1lGkAz33";

  const PRESERVE_COLLECTIONS =
    new Set([
      "platformConfig",
      "foundingHostRecovery",
    ]);

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "KIVO PRE-RESET DRY RUN"
  );
  console.log(
    "NO DATA WILL BE DELETED"
  );
  console.log(
    "========================================"
  );

  // ==========================================================
  // FIREBASE AUTH
  // ==========================================================

  const authUsers: Array<{
    uid: string;
    email: string;
  }> = [];

  let pageToken:
    | string
    | undefined =
    undefined;

  do {
    const result =
      await adminAuth.listUsers(
        1000,
        pageToken
      );

    for (const user of result.users) {
      authUsers.push({
        uid: user.uid,
        email:
          user.email
            ?.trim()
            .toLowerCase() ?? "",
      });
    }

    pageToken =
      result.pageToken;
  } while (pageToken);

  const adminAuthUser =
    authUsers.find(
      (u) =>
        u.uid === ADMIN_UID ||
        u.email === ADMIN_EMAIL
    );

  const authToDelete =
    authUsers.filter(
      (u) =>
        u.uid !== ADMIN_UID &&
        u.email !== ADMIN_EMAIL
    );

  console.log("");
  console.log(
    "===== FIREBASE AUTH ====="
  );

  console.log(
    `Total Auth users: ${authUsers.length}`
  );

  console.log(
    `Admin preserved: ${
      adminAuthUser
        ? `${adminAuthUser.email} (${adminAuthUser.uid})`
        : "NOT FOUND"
    }`
  );

  console.log(
    `Auth users that WOULD be deleted: ${authToDelete.length}`
  );

  for (const user of authToDelete) {
    console.log(
      `  DELETE AUTH: ${user.email || "(no email)"} | ${user.uid}`
    );
  }

  // ==========================================================
  // FIRESTORE COLLECTIONS
  // ==========================================================

  console.log("");
  console.log(
    "===== FIRESTORE ====="
  );

  const collections =
    await adminDb.listCollections();

  let totalFirestoreDocsToDelete =
    0;

  for (const collection of collections) {
    const collectionId =
      collection.id;

    const snapshot =
      await collection.get();

    if (
      PRESERVE_COLLECTIONS.has(
        collectionId
      )
    ) {
      console.log(
        `PRESERVE COLLECTION: ${collectionId} (${snapshot.size} docs)`
      );

      continue;
    }

    let deleteCount = 0;
    let preserveCount = 0;

    for (const doc of snapshot.docs) {
      const data =
        doc.data();

      const email =
        String(
          data.email ?? ""
        )
          .trim()
          .toLowerCase();

      const uid =
        String(
          data.uid ??
          data.ownerUid ??
          data.userId ??
          doc.id ??
          ""
        ).trim();

      const preserveAdminUser =
        collectionId === "users" &&
        (
          doc.id === ADMIN_UID ||
          uid === ADMIN_UID ||
          email === ADMIN_EMAIL
        );

      if (preserveAdminUser) {
        preserveCount += 1;

        console.log(
          `  PRESERVE: ${collectionId}/${doc.id}`
        );

        continue;
      }

      deleteCount += 1;
      totalFirestoreDocsToDelete += 1;
    }

    console.log(
      `${collectionId}: WOULD DELETE ${deleteCount}, PRESERVE ${preserveCount}, TOTAL ${snapshot.size}`
    );
  }

  console.log("");
  console.log(
    `Total top-level Firestore documents that WOULD be deleted: ${totalFirestoreDocsToDelete}`
  );

  // ==========================================================
  // IMPORTANT COLLECTION COUNTS
  // ==========================================================

  console.log("");
  console.log(
    "===== KEY KIVO COLLECTIONS ====="
  );

  const importantCollections = [
    "users",
    "foundingHostLeads",
    "hostOnboarding",
    "hostActivations",
    "hostProfiles",
    "hosts",
    "drivers",
    "driverActivations",
    "bookingRequests",
    "platformConfig",
    "foundingHostRecovery",
  ];

  for (
    const collectionName
    of importantCollections
  ) {
    const snapshot =
      await adminDb
        .collection(
          collectionName
        )
        .get();

    console.log(
      `${collectionName}: ${snapshot.size}`
    );
  }

  console.log("");
  console.log(
    "========================================"
  );
  console.log(
    "DRY RUN COMPLETE"
  );
  console.log(
    "NO AUTH USERS OR FIRESTORE DATA DELETED"
  );
  console.log(
    "========================================"
  );
}

main().catch((error) => {
  console.error(
    "Dry-run inventory failed:",
    error
  );

  process.exit(1);
});
