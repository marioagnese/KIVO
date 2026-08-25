"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  type Timestamp,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
} from "firebase/storage";

import {
  auth,
  db,
  storage,
} from "@/lib/firebase";

type OnboardingRecord = {
  uid: string;
  leadId: string;
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  status: string;
  submittedAt?: Timestamp | null;

  charger: {
    brand?: string;
    model?: string;
    connector?: string;
    power?: string;
    smartCharger?: string;
  };

  property: {
    setup?: string;
    gatedAccess?: string;
    parkingDetails?: string;
    accessNotes?: string;
  };

  hosting: {
    availability?: string[];
    approvalPreference?: string;
    maxSession?: string;
    interactionPreference?: string;
    amenities?: string[];
    notes?: string;
  };

  photos: Record<string, string>;
};

function formatDate(value?: Timestamp | null) {
  if (!value) return "—";

  try {
    return value.toDate().toLocaleString();
  } catch {
    return "—";
  }
}

export default function OnboardingReviewQueue() {
  const [records, setRecords] = useState<OnboardingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [approvingUid, setApprovingUid] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    return onSnapshot(
      collection(db, "hostOnboarding"),
      (snapshot) => {
        const next = snapshot.docs
          .map((recordDoc) => {
            const data = recordDoc.data();

            return {
              uid: recordDoc.id,
              leadId: String(data.leadId ?? ""),
              name: String(data.name ?? ""),
              email: String(data.email ?? ""),
              phone: String(data.phone ?? ""),
              postalCode: String(data.postalCode ?? ""),
              status: String(data.status ?? ""),
              submittedAt: data.submittedAt ?? null,
              charger: data.charger ?? {},
              property: data.property ?? {},
              hosting: data.hosting ?? {},
              photos: data.photos ?? {},
            } satisfies OnboardingRecord;
          })
          .filter(
            (record) =>
              record.status === "review_pending" ||
              record.status === "approved"
          );

        setRecords(next);
        setLoading(false);
      },
      (err) => {
        console.error("Unable to load Host onboarding reviews:", err);
        setError("Unable to load completed Host onboarding records.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!storage || records.length === 0) return;

    let cancelled = false;

    async function loadPhotos() {
      const next: Record<string, Record<string, string>> = {};

      for (const record of records) {
        const urls: Record<string, string> = {};

        for (const [key, path] of Object.entries(record.photos)) {
          if (!path) continue;

          try {
            urls[key] = await getDownloadURL(ref(storage!, path));
          } catch (err) {
            console.error(`Unable to load ${key} photo:`, err);
          }
        }

        next[record.uid] = urls;
      }

      if (!cancelled) {
        setPhotoUrls(next);
      }
    }

    void loadPhotos();

    return () => {
      cancelled = true;
    };
  }, [records]);

  async function approveHost(record: OnboardingRecord) {
    if (!auth?.currentUser) {
      setError("KIVO admin authentication is unavailable.");
      return;
    }

    if (
      !window.confirm(
        `Approve ${record.name || record.email} as a KIVO Host?\n\nThis grants Host account access but does not publish or activate a charger listing.`
      )
    ) {
      return;
    }

    setApprovingUid(record.uid);
    setError("");
    setMessage("");

    try {
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await fetch("/api/admin/approve-host", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: record.uid,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Unable to approve Host.");
      }

      setMessage(
        result.emailWarning
          ? `${record.name || "Host"} was approved, but the approval email needs attention.`
          : `${record.name || "Host"} is now an approved KIVO Host. Approval email sent.`
      );
    } catch (err) {
      console.error("Unable to approve KIVO Host:", err);

      setError(
        err instanceof Error ? err.message : "Unable to approve Host."
      );
    } finally {
      setApprovingUid(null);
    }
  }

  if (loading) {
    return (
      <section className="mb-10 rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-slate-400">
        Loading Host setups ready for review...
      </section>
    );
  }

  return (
    <section className="mb-12">
      <div className="mb-5">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
          HOST ONBOARDING
        </p>

        <h2 className="mt-2 text-3xl font-black text-white">
          Setups ready for review
        </h2>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-red-200">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-emerald-100">
          {message}
        </div>
      )}

      {records.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-7">
          No completed Host setups yet.
        </div>
      ) : (
        <div className="space-y-6">
          {records.map((record) => {
            const urls = photoUrls[record.uid] ?? {};
            const pending = record.status === "review_pending";

            return (
              <article
                key={record.uid}
                className="rounded-[30px] border border-white/10 bg-[#07111f] p-6 sm:p-8"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-white">
                      {record.name || "Unnamed Host"}
                    </h3>

                    <p className="mt-2 text-base text-slate-300">
                      {record.email}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      ZIP {record.postalCode || "—"} · Submitted{" "}
                      {formatDate(record.submittedAt)}
                    </p>
                  </div>

                  {pending ? (
                    <button
                      type="button"
                      disabled={approvingUid === record.uid}
                      onClick={() => approveHost(record)}
                      className="rounded-full bg-emerald-400 px-7 py-3.5 text-base font-black text-slate-950 disabled:opacity-50"
                    >
                      {approvingUid === record.uid
                        ? "Approving..."
                        : "Approve Host"}
                    </button>
                  ) : (
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-5 py-3 text-sm font-black text-emerald-200">
                      ✓ Approved
                    </span>
                  )}
                </div>

                <div className="mt-7 grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <ReviewBlock
                      title="Charger"
                      lines={[
                        `${record.charger.brand || "Brand not specified"} ${record.charger.model || ""}`.trim(),
                        record.charger.connector || "Connector not specified",
                        record.charger.power || "Power not specified",
                      ]}
                    />

                    <ReviewBlock
                      title="Parking & access"
                      lines={[
                        record.property.setup || "—",
                        record.property.gatedAccess || "—",
                        record.property.parkingDetails ||
                          "No parking details",
                      ]}
                    />

                    <ReviewBlock
                      title="Hosting preferences"
                      lines={[
                        record.hosting.availability?.join(", ") ||
                          "Availability not specified",
                        record.hosting.approvalPreference || "—",
                        record.hosting.maxSession || "—",
                        record.hosting.interactionPreference || "—",
                      ]}
                    />
                  </div>

                  <div>
                    <p className="text-lg font-black text-white">
                      Private onboarding photos
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {["charger", "parking", "arrival", "extra"].map(
                        (key) => (
                          <div
                            key={key}
                            className="overflow-hidden rounded-2xl border border-white/10"
                          >
                            {urls[key] ? (
                              <a
                                href={urls[key]}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={urls[key]}
                                  alt={`${key} onboarding`}
                                  className="h-40 w-full object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex h-40 items-center justify-center text-sm text-slate-600">
                                No photo
                              </div>
                            )}

                            <p className="px-4 py-3 text-sm font-bold capitalize text-slate-300">
                              {key}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ReviewBlock({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-lg font-black text-white">{title}</p>

      <div className="mt-3 space-y-2">
        {lines.map((line, index) => (
          <p
            key={`${title}-${index}`}
            className="text-base leading-7 text-slate-300"
          >
            {line || "—"}
          </p>
        ))}
      </div>
    </div>
  );
}
