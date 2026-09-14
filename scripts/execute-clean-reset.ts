import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  if (process.env.RESET_KIVO !== "YES") {
    throw new Error(
      'Safety stop. Run with RESET_KIVO=YES only when you intend to perform the reset.'
    );
  }

  const {
    adminDb,
    adminAuth,
  } = await import("../src/lib/firebaseAdmin");

  const { getStorage } =
    await import("firebase-admin/storage");

  const { FieldValue } =
    await import("firebase-admin/firestore");

  const ADMIN_EMAIL =
    "admin@kivocharge.com";

  const ADMIN_UID =
    "mxDJ9bWX6RP3Z95iXC0h1lGkAz33";

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing."
    );
  }

  console.log("");
  console.log("======================================");
  console.log("KIVO CLEAN RESET");
  console.log("======================================");

  // ----------------------------------------------------------
  // SAFETY CHECKS
  // ----------------------------------------------------------

  const adminUser =
    await adminAuth.getUser(ADMIN_UID);

  if (
    adminUser.email?.toLowerCase() !==
    ADMIN_EMAIL
  ) {
    throw new Error(
      "Admin UID/email safety check failed."
    );
  }

  const recoverySnapshot =
    await adminDb
      .collection("foundingHostRecovery")
      .get();

  if (recoverySnapshot.size < 2) {
    throw new Error(
      "Recovery archive looks incomplete. Reset aborted."
    );
  }

  const resetMetadata =
    await adminDb
      .collection("foundingHostRecovery")
      .doc("RESET_METADATA")
      .get();

  if (!resetMetadata.exists) {
    throw new Error(
      "RESET_METADATA missing. Reset aborted."
    );
  }

  console.log(
    `Recovery archive verified: ${recoverySnapshot.size} docs`
  );

  console.log(
    `Admin verified: ${ADMIN_EMAIL}`
  );

  // ----------------------------------------------------------
  // FIRESTORE
  // ----------------------------------------------------------

  console.log("");
  console.log("===== FIRESTORE RESET =====");

  const deleteCollections = [
    "foundingHostLeads",
    "hostOnboarding",
    "hostActivations",
    "hostProfiles",
    "hosts",
    "drivers",
    "driverActivations",
    "bookingRequests",
  ];

  for (const name of deleteCollections) {
    const ref =
      adminDb.collection(name);

    const snapshot =
      await ref.get();

    console.log(
      `${name}: deleting ${snapshot.size} top-level docs`
    );

    if (!snapshot.empty) {
      await adminDb.recursiveDelete(ref);
    }
  }

  // Delete every users document except Admin.
  const usersSnapshot =
    await adminDb
      .collection("users")
      .get();

  let deletedUserDocs = 0;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();

    const email =
      String(data.email ?? "")
        .trim()
        .toLowerCase();

    if (
      doc.id === ADMIN_UID ||
      email === ADMIN_EMAIL
    ) {
      console.log(
        `PRESERVED users/${doc.id}`
      );
      continue;
    }

    await adminDb.recursiveDelete(
      adminDb
        .collection("users")
        .doc(doc.id)
    );

    deletedUserDocs += 1;
  }

  console.log(
    `Deleted user documents: ${deletedUserDocs}`
  );

  // ----------------------------------------------------------
  // RESET FOUNDING HOST COUNTER
  // ----------------------------------------------------------

  await adminDb
    .collection("platformConfig")
    .doc("foundingHosts")
    .set(
      {
        cap: 200,
        status: "open",
        approvedCount: 0,
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  console.log(
    "Founding Host counter reset to 0 / 200."
  );

  // ----------------------------------------------------------
  // FIREBASE AUTH
  // ----------------------------------------------------------

  console.log("");
  console.log("===== AUTH RESET =====");

  let pageToken:
    | string
    | undefined;

  const deleteUids: string[] = [];

  do {
    const result =
      await adminAuth.listUsers(
        1000,
        pageToken
      );

    for (const user of result.users) {
      const email =
        user.email
          ?.trim()
          .toLowerCase() ?? "";

      if (
        user.uid === ADMIN_UID ||
        email === ADMIN_EMAIL
      ) {
        console.log(
          `PRESERVED AUTH: ${email} | ${user.uid}`
        );
        continue;
      }

      deleteUids.push(user.uid);

      console.log(
        `DELETE AUTH: ${email || "(no email)"} | ${user.uid}`
      );
    }

    pageToken =
      result.pageToken;
  } while (pageToken);

  if (deleteUids.length > 0) {
    const result =
      await adminAuth.deleteUsers(
        deleteUids
      );

    console.log(
      `Auth deleted successfully: ${result.successCount}`
    );

    console.log(
      `Auth deletion failures: ${result.failureCount}`
    );

    if (result.failureCount > 0) {
      for (
        const error
        of result.errors
      ) {
        console.log(
          `  ERROR index ${error.index}: ${error.error.message}`
        );
      }
    }
  }

  // ----------------------------------------------------------
  // FIREBASE STORAGE
  // ----------------------------------------------------------

  console.log("");
  console.log("===== STORAGE RESET =====");

  const bucket =
    getStorage().bucket(bucketName);

  const prefixes = [
    "hostOnboarding/",
    "hostProfiles/",
    "driverProfiles/",
  ];

  let deletedFiles = 0;

  for (const prefix of prefixes) {
    const [files] =
      await bucket.getFiles({
        prefix,
      });

    console.log(
      `${prefix}: deleting ${files.length} files`
    );

    for (const file of files) {
      await file.delete({
        ignoreNotFound: true,
      });

      deletedFiles += 1;

      console.log(
        `  DELETED ${file.name}`
      );
    }
  }

  console.log(
    `Storage files deleted: ${deletedFiles}`
  );

  // ----------------------------------------------------------
  // VERIFY FINAL STATE
  // ----------------------------------------------------------

  console.log("");
  console.log("===== FINAL VERIFICATION =====");

  const authAfter =
    await adminAuth.listUsers(1000);

  console.log(
    `Firebase Auth users remaining: ${authAfter.users.length}`
  );

  for (const user of authAfter.users) {
    console.log(
      `  ${user.email ?? "(no email)"} | ${user.uid}`
    );
  }

  const usersAfter =
    await adminDb
      .collection("users")
      .get();

  console.log(
    `users docs remaining: ${usersAfter.size}`
  );

  const recoveryAfter =
    await adminDb
      .collection("foundingHostRecovery")
      .get();

  console.log(
    `foundingHostRecovery docs remaining: ${recoveryAfter.size}`
  );

  const configAfter =
    await adminDb
      .collection("platformConfig")
      .doc("foundingHosts")
      .get();

  console.log(
    "Founding Host config:"
  );

  console.log(
    JSON.stringify(
      configAfter.data(),
      null,
      2
    )
  );

  const [storageAfter] =
    await bucket.getFiles();

  console.log(
    `Storage objects remaining: ${storageAfter.length}`
  );

  for (const name of deleteCollections) {
    const snapshot =
      await adminDb
        .collection(name)
        .get();

    console.log(
      `${name}: ${snapshot.size}`
    );
  }

  console.log("");
  console.log("======================================");
  console.log("KIVO FIREBASE RESET COMPLETE");
  console.log("STRIPE WAS NOT MODIFIED");
  console.log("======================================");
}

main().catch((error) => {
  console.error(
    "RESET FAILED:",
    error
  );

  process.exit(1);
});
