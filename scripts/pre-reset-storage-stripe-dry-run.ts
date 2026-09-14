import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { adminDb } =
    await import("../src/lib/firebaseAdmin");

  const { getStorage } =
    await import("firebase-admin/storage");

  const {
    stripe,
    stripeMode,
  } = await import("../src/lib/stripe");

  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not configured."
    );
  }

  console.log("");
  console.log(
    "=========================================="
  );
  console.log(
    "KIVO STORAGE + STRIPE PRE-RESET DRY RUN"
  );
  console.log(
    "NO DATA WILL BE DELETED"
  );
  console.log(
    "=========================================="
  );

  // ==========================================================
  // FIREBASE STORAGE
  // ==========================================================

  console.log("");
  console.log(
    "===== FIREBASE STORAGE ====="
  );

  const bucket =
    getStorage().bucket(bucketName);

  const [files] =
    await bucket.getFiles();

  const hostOnboardingFiles =
    files.filter(
      (file) =>
        file.name.startsWith(
          "hostOnboarding/"
        )
    );

  const hostProfileFiles =
    files.filter(
      (file) =>
        file.name.startsWith(
          "hostProfiles/"
        )
    );

  const driverProfileFiles =
    files.filter(
      (file) =>
        file.name.startsWith(
          "driverProfiles/"
        )
    );

  const knownUserFiles =
    new Set([
      ...hostOnboardingFiles.map(
        (f) => f.name
      ),
      ...hostProfileFiles.map(
        (f) => f.name
      ),
      ...driverProfileFiles.map(
        (f) => f.name
      ),
    ]);

  const otherFiles =
    files.filter(
      (file) =>
        !knownUserFiles.has(
          file.name
        )
    );

  console.log(
    `Bucket: ${bucketName}`
  );

  console.log(
    `Total Storage objects: ${files.length}`
  );

  console.log(
    `hostOnboarding files: ${hostOnboardingFiles.length}`
  );

  console.log(
    `hostProfiles files: ${hostProfileFiles.length}`
  );

  console.log(
    `driverProfiles files: ${driverProfileFiles.length}`
  );

  console.log(
    `Other/unclassified files: ${otherFiles.length}`
  );

  console.log("");
  console.log(
    "Files that WOULD be removed during customer reset:"
  );

  for (
    const file
    of [
      ...hostOnboardingFiles,
      ...hostProfileFiles,
      ...driverProfileFiles,
    ]
  ) {
    console.log(
      `  DELETE STORAGE: ${file.name}`
    );
  }

  if (otherFiles.length > 0) {
    console.log("");
    console.log(
      "Other files that would be PRESERVED pending review:"
    );

    for (const file of otherFiles) {
      console.log(
        `  PRESERVE STORAGE: ${file.name}`
      );
    }
  }

  // ==========================================================
  // STRIPE ACCOUNT IDS REFERENCED BY KIVO
  // ==========================================================

  console.log("");
  console.log(
    "===== STRIPE CONNECT REFERENCES ====="
  );

  console.log(
    `Current Stripe environment: ${stripeMode}`
  );

  const profilesSnapshot =
    await adminDb
      .collection("hostProfiles")
      .get();

  type StripeReference = {
    uid: string;
    field: string;
    accountId: string;
  };

  const refs:
    StripeReference[] =
    [];

  for (
    const doc
    of profilesSnapshot.docs
  ) {
    const data =
      doc.data();

    const candidates = [
      [
        "stripeConnectLive",
        data.stripeConnectLive,
      ],
      [
        "stripeConnectTest",
        data.stripeConnectTest,
      ],
      [
        "stripeConnect",
        data.stripeConnect,
      ],
    ] as const;

    for (
      const [
        field,
        value,
      ] of candidates
    ) {
      if (
        !value ||
        typeof value !== "object"
      ) {
        continue;
      }

      const accountId =
        String(
          (value as any)
            .accountId ?? ""
        ).trim();

      if (!accountId) {
        continue;
      }

      refs.push({
        uid: doc.id,
        field,
        accountId,
      });
    }
  }

  // Deduplicate same Stripe account stored
  // in legacy + mode-specific fields.
  const uniqueAccounts =
    new Map<
      string,
      StripeReference[]
    >();

  for (const ref of refs) {
    const current =
      uniqueAccounts.get(
        ref.accountId
      ) ?? [];

    current.push(ref);

    uniqueAccounts.set(
      ref.accountId,
      current
    );
  }

  console.log(
    `Host profiles read: ${profilesSnapshot.size}`
  );

  console.log(
    `Stripe references found: ${refs.length}`
  );

  console.log(
    `Unique referenced Stripe accounts: ${uniqueAccounts.size}`
  );

  console.log("");

  for (
    const [
      accountId,
      accountRefs,
    ]
    of uniqueAccounts
  ) {
    console.log(
      `ACCOUNT: ${accountId}`
    );

    for (
      const ref
      of accountRefs
    ) {
      console.log(
        `  Firestore: hostProfiles/${ref.uid}.${ref.field}`
      );
    }

    /*
     * Only retrieve accounts belonging to the
     * CURRENT configured Stripe mode.
     *
     * A live key cannot retrieve a test account
     * and vice versa.
     */
    const shouldRetrieve =
      accountRefs.some(
        (ref) =>
          stripeMode === "live"
            ? ref.field ===
                "stripeConnectLive"
            : ref.field ===
                "stripeConnectTest" ||
              ref.field ===
                "stripeConnect"
      );

    if (!shouldRetrieve) {
      console.log(
        `  Stripe API: skipped — reference belongs to another mode`
      );

      console.log("");
      continue;
    }

    try {
      const account =
        await stripe.v2.core.accounts.retrieve(
          accountId,
          {
            include: [
              "configuration.recipient",
              "requirements",
              "future_requirements",
            ],
          }
        );

      const recipient =
        account.configuration
          ?.recipient;

      const transfers =
        recipient
          ?.capabilities
          ?.stripe_balance
          ?.stripe_transfers;

      console.log(
        `  Retrieved: YES`
      );

      console.log(
        `  Livemode: ${String(
          account.livemode
        )}`
      );

      console.log(
        `  Contact email: ${String(
          account.contact_email ?? ""
        )}`
      );

      console.log(
        `  KIVO Host UID: ${String(
          account.metadata
            ?.kivoHostUid ?? ""
        )}`
      );

      console.log(
        `  Transfers status: ${String(
          transfers?.status ?? ""
        )}`
      );

      console.log(
        `  Requirements due: ${
          account.requirements
            ?.entries
            ?.length ?? 0
        }`
      );
    } catch (error: any) {
      console.log(
        `  Retrieved: NO`
      );

      console.log(
        `  Reason: ${
          error?.message ??
          String(error)
        }`
      );
    }

    console.log("");
  }

  // ==========================================================
  // SUMMARY
  // ==========================================================

  console.log(
    "=========================================="
  );
  console.log(
    "SUMMARY"
  );
  console.log(
    "=========================================="
  );

  console.log(
    `Storage user files that WOULD be deleted: ${
      hostOnboardingFiles.length +
      hostProfileFiles.length +
      driverProfileFiles.length
    }`
  );

  console.log(
    `Storage files currently preserved for review: ${otherFiles.length}`
  );

  console.log(
    `Unique Stripe accounts referenced by Firestore: ${uniqueAccounts.size}`
  );

  console.log("");
  console.log(
    "NO STORAGE FILES, STRIPE ACCOUNTS, AUTH USERS,"
  );

  console.log(
    "OR FIRESTORE DOCUMENTS WERE DELETED."
  );
}

main().catch((error) => {
  console.error(
    "Storage/Stripe dry run failed:",
    error
  );

  process.exit(1);
});
