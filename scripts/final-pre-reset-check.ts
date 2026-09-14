import fs from "node:fs";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { adminDb } =
    await import("../src/lib/firebaseAdmin");

  console.log("");
  console.log("===== PLATFORM CONFIG =====");

  const platformSnapshot =
    await adminDb
      .collection("platformConfig")
      .get();

  for (const doc of platformSnapshot.docs) {
    console.log(`DOCUMENT: ${doc.id}`);
    console.log(
      JSON.stringify(
        doc.data(),
        null,
        2
      )
    );
  }

  console.log("");
  console.log(
    "===== STRIPE CONNECT BACKUP ====="
  );

  const hostProfiles =
    await adminDb
      .collection("hostProfiles")
      .get();

  const rows: string[][] = [
    [
      "uid",
      "field",
      "accountId",
      "mode",
    ],
  ];

  for (const doc of hostProfiles.docs) {
    const data = doc.data();

    const candidates = [
      [
        "stripeConnectLive",
        data.stripeConnectLive,
        "live",
      ],
      [
        "stripeConnectTest",
        data.stripeConnectTest,
        "test",
      ],
      [
        "stripeConnect",
        data.stripeConnect,
        "legacy",
      ],
    ] as const;

    for (const [field, value, mode] of candidates) {
      if (
        !value ||
        typeof value !== "object"
      ) {
        continue;
      }

      const accountId =
        String(
          (value as any).accountId ??
          ""
        ).trim();

      if (!accountId) {
        continue;
      }

      rows.push([
        doc.id,
        field,
        accountId,
        mode,
      ]);

      console.log(
        `${doc.id} | ${field} | ${accountId} | ${mode}`
      );
    }
  }

  const csv =
    rows
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(
              /"/g,
              '""'
            )}"`
          )
          .join(",")
      )
      .join("\n");

  const output =
    "kivo-pre-reset-stripe-accounts-2026-09-14.csv";

  fs.writeFileSync(
    output,
    csv
  );

  console.log("");
  console.log(
    `Stripe backup written: ${output}`
  );

  console.log("");
  console.log(
    "NO DATA WAS MODIFIED OR DELETED."
  );
}

main().catch((error) => {
  console.error(
    "Final pre-reset check failed:",
    error
  );
  process.exit(1);
});
