import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KIVO Host FAQ — Your questions, answered.",
  description:
    "Learn how KIVO hosting is intended to work, including safety, privacy, property access, earnings, charger requirements and the Founding Host program.",
};

type FAQ = {
  question: string;
  answer: React.ReactNode;
};

type FAQSection = {
  id: string;
  eyebrow: string;
  title: string;
  intro: string;
  items: FAQ[];
};

const sections: FAQSection[] = [
  {
    id: "about",
    eyebrow: "START HERE",
    title: "About KIVO",
    intro:
      "KIVO is building a structured marketplace for private EV charging — giving homeowners control over when and how their chargers are shared while giving Drivers another charging option.",
    items: [
      {
        question: "What is KIVO?",
        answer: (
          <>
            KIVO is a marketplace designed to connect EV Drivers with private
            residential Level 2 chargers made available by Hosts.
            <br /><br />
            The intended experience is structured:
            <strong> discover → request → Host approval → arrival → charge → completion → payment/history.</strong>
          </>
        ),
      },
      {
        question: "Why does KIVO exist?",
        answer: (
          <>
            Millions of private EV chargers spend much of the day unused while
            Drivers still encounter charging gaps, detours, queues and limited
            options away from major charging corridors.
            <br /><br />
            KIVO exists to help make that already-installed charging capacity
            useful.
          </>
        ),
      },
      {
        question: "Is KIVO trying to replace public charging networks?",
        answer: (
          <>
            No. KIVO is designed to complement public charging infrastructure,
            not replace it.
            <br /><br />
            Public fast charging remains essential. KIVO is intended to provide
            another option when a neighborhood, residential, rural or
            destination charger is more convenient.
          </>
        ),
      },
      {
        question: "How is KIVO different from a charger directory?",
        answer: (
          <>
            Finding a charger is only one part of the problem.
            <br /><br />
            KIVO is intended to provide the transaction and trust layer around
            private charging: availability, booking requests, Host approval,
            protected arrival details, session history, payment and reputation.
          </>
        ),
      },
    ],
  },

  {
    id: "safety",
    eyebrow: "A CORE KIVO PRINCIPLE",
    title: "Safety & Trust",
    intro:
      "Residential charging requires a higher level of trust than stopping at an anonymous public station. KIVO is being designed around safety on both sides of the transaction.",
    items: [
      {
        question: "Will KIVO screen Hosts and Drivers?",
        answer: (
          <>
            <strong>Yes — safety screening is intended to be a launch requirement.</strong>
            <br /><br />
            KIVO is evaluating the screening process and providers that should
            be required before someone can participate in residential charging
            transactions.
            <br /><br />
            The launch approach is expected to include identity/contact checks
            and additional screening intended to identify disqualifying safety
            concerns.
            <br /><br />
            KIVO will only describe a specific screening check as active once
            that process has actually been implemented and tested.
          </>
        ),
      },
      {
        question: "Does screening guarantee that someone is safe?",
        answer: (
          <>
            No. No screening process can eliminate all risk.
            <br /><br />
            KIVO intends to use multiple layers of protection, including
            screening, Host approval, protected residential addresses,
            transaction history, reporting, blocking and two-sided reputation.
          </>
        ),
      },
      {
        question: "Can somebody simply show up at my house because they saw my charger?",
        answer: (
          <>
            No. That is specifically what KIVO is being designed to prevent.
            <br /><br />
            A Driver should not receive private arrival information merely
            because a charger appears in search results. The Host controls
            whether a request is accepted.
          </>
        ),
      },
      {
        question: "When does a Driver receive my exact address?",
        answer: (
          <>
            KIVO's intended model is to show enough approximate location
            information for a Driver to decide whether the charger is useful,
            while keeping the exact residential address and detailed arrival
            instructions protected until the appropriate stage of an accepted
            booking.
          </>
        ),
      },
      {
        question: "Can I decline a Driver?",
        answer: (
          <>
            Yes. Host approval is a core part of the KIVO model.
            <br /><br />
            Hosts should be able to review a request before deciding whether to
            accept it.
          </>
        ),
      },
      {
        question: "What if I feel uncomfortable with a booking?",
        answer: (
          <>
            Hosts should never feel obligated to accept a booking they are not
            comfortable with.
            <br /><br />
            KIVO is also planning reporting, blocking and safety-support
            mechanisms. Detailed cancellation and safety policies are still
            being developed.
          </>
        ),
      },
      {
        question: "Will Hosts and Drivers have ratings or history?",
        answer: (
          <>
            That is part of the planned marketplace.
            <br /><br />
            KIVO intends to develop two-sided reputation so both Hosts and
            Drivers can make more informed decisions based on marketplace
            history.
          </>
        ),
      },
      {
        question: "Will KIVO conduct background screening?",
        answer: (
          <>
            KIVO intends to incorporate meaningful safety screening before
            launch and is currently evaluating appropriate third-party
            screening solutions and policies.
            <br /><br />
            The exact screening scope, provider, disqualifying criteria and
            review process are still being finalized. We will not represent a
            particular background check as operational until it actually is.
          </>
        ),
      },
    ],
  },

  {
    id: "founding",
    eyebrow: "EARLY HOSTS",
    title: "The Founding Host Program",
    intro:
      "The Founding Host program lets early homeowners raise their hand before the full KIVO marketplace is activated in their area.",
    items: [
      {
        question: "What is a Founding Host?",
        answer: (
          <>
            A Founding Host is an early homeowner interested in potentially
            making a private EV charger available through KIVO.
          </>
        ),
      },
      {
        question: "Am I committing to host someone by applying?",
        answer: (
          <>
            No.
            <br /><br />
            Joining the Founding Host list does not currently make your charger
            bookable, publish your property or require you to accept future
            sessions.
          </>
        ),
      },
      {
        question: "Does applying make my home publicly visible?",
        answer: (
          <>
            No. The current Founding Host application is an interest and
            qualification step only.
          </>
        ),
      },
      {
        question: "What happens after I apply?",
        answer: (
          <>
            KIVO reviews basic information such as your location, parking setup
            and charger status.
            <br /><br />
            Selected early Hosts may later be invited to complete full
            onboarding, including charger details, access preferences, photos
            and availability.
          </>
        ),
      },
      {
        question: "Why join early?",
        answer: (
          <>
            Founding Hosts can help shape how KIVO works as the marketplace is
            developed.
            <br /><br />
            KIVO's current launch plan also anticipates preferred Founding Host
            economics, including a planned 0% Host platform fee during launch.
            Final long-term pricing has not yet been established.
          </>
        ),
      },
    ],
  },

  {
    id: "property",
    eyebrow: "YOUR PROPERTY. YOUR RULES.",
    title: "Property Access & Privacy",
    intro:
      "Hosting is about charger access — not automatically about access to your home.",
    items: [
      {
        question: "Does a Driver enter my house?",
        answer: (
          <>
            Not by default.
            <br /><br />
            For many Hosts, the expected setup may simply be a designated
            driveway parking space plus access to the charger.
          </>
        ),
      },
      {
        question: "Does my charger have to be outside?",
        answer: (
          <>
            No. A garage-mounted charger may work if the cable can safely reach
            the designated parking area.
          </>
        ),
      },
      {
        question: "Can a setup requiring garage access qualify?",
        answer: (
          <>
            Potentially, but it requires more consideration.
            <br /><br />
            Any access beyond the designated parking and charging area should
            be disclosed in advance and agreed as part of the booking.
          </>
        ),
      },
      {
        question: "Do I have to provide a restroom?",
        answer: <>No.</>,
      },
      {
        question: "Do I have to interact with the Driver?",
        answer: (
          <>
            No. KIVO should support low-interaction and contactless hosting.
          </>
        ),
      },
      {
        question: "Can I offer amenities?",
        answer: (
          <>
            Yes, potentially.
            <br /><br />
            A Host may eventually choose to offer optional amenities such as
            Wi-Fi, restroom access, seating, workspace or other features.
            <br /><br />
            Amenities should always be optional, accurately disclosed and known
            before the reservation is confirmed.
          </>
        ),
      },
      {
        question: "Who decides where the Driver parks?",
        answer: (
          <>
            The Host. The designated charging/parking space should be clearly
            defined during Host onboarding and communicated as part of the
            booking.
          </>
        ),
      },
    ],
  },

  {
    id: "charger",
    eyebrow: "THE HARDWARE",
    title: "Your Charger",
    intro:
      "KIVO is initially focused on residential Level 2 charging.",
    items: [
      {
        question: "What kind of charger do I need?",
        answer: (
          <>
            KIVO's initial Host model is focused primarily on residential
            Level 2 charging.
          </>
        ),
      },
      {
        question: "Does it need to be a smart charger?",
        answer: (
          <>
            Not necessarily.
            <br /><br />
            Connected chargers may eventually simplify energy measurement and
            session tracking, but KIVO is not currently limiting Founding Host
            interest to smart chargers.
          </>
        ),
      },
      {
        question: "What about connector compatibility?",
        answer: (
          <>
            Connector compatibility will be part of the full Host listing and
            Driver vehicle profile.
            <br /><br />
            KIVO's goal is ultimately to help prevent incompatible bookings
            before a Driver requests a session.
          </>
        ),
      },
      {
        question: "Who is responsible for an adapter?",
        answer: (
          <>
            Current direction: the Driver should be responsible for confirming
            compatibility and supplying any required approved adapter unless
            the Host specifically lists one as provided.
          </>
        ),
      },
      {
        question: "Does KIVO need my charger username or password?",
        answer: (
          <>
            Current direction: no.
            <br /><br />
            KIVO should avoid unnecessary access to private charger accounts.
            A future authorized charger integration may be different, but no
            such access should occur without clear Host permission.
          </>
        ),
      },
    ],
  },

  {
    id: "money",
    eyebrow: "HOST ECONOMICS",
    title: "Earnings & Costs",
    intro:
      "Hosting has to make economic sense. KIVO is still validating final marketplace pricing and payment structure.",
    items: [
      {
        question: "How much could I earn?",
        answer: (
          <>
            Earnings will depend on session frequency, session duration,
            electricity cost, charger output, local demand and final marketplace
            pricing.
            <br /><br />
            KIVO's current earnings calculator is illustrative only and does
            not represent guaranteed or average Host earnings.
          </>
        ),
      },
      {
        question: "Who pays for the electricity?",
        answer: (
          <>
            KIVO pricing is intended to compensate the Host for providing the
            charging session, including the electricity associated with that
            session.
            <br /><br />
            The final calculation and reimbursement methodology is still being
            validated.
          </>
        ),
      },
      {
        question: "Does KIVO charge Hosts?",
        answer: (
          <>
            KIVO's planned Founding Host structure currently anticipates a
            <strong> 0% Host platform fee during launch.</strong>
            <br /><br />
            Final long-term pricing has not yet been established.
          </>
        ),
      },
      {
        question: "Who sets the charging price?",
        answer: (
          <>
            KIVO is currently testing the best pricing structure for both Hosts
            and Drivers.
            <br /><br />
            The goal is for pricing to compensate Hosts appropriately while
            remaining attractive enough that Drivers choose KIVO when it is the
            better charging option.
          </>
        ),
      },
      {
        question: "When will Hosts be paid?",
        answer: (
          <>
            The intended model is to pay the Host after a successfully
            completed session, subject to payment processing and any applicable
            dispute period.
            <br /><br />
            Final payout timing has not yet been established.
          </>
        ),
      },
      {
        question: "What if a Driver cancels at the last minute?",
        answer: (
          <>
            KIVO intends to develop cancellation protection so Hosts are not
            unfairly penalized after reserving a charging window.
            <br /><br />
            The exact cancellation cutoff, fee and Host compensation structure
            are still being researched.
          </>
        ),
      },
    ],
  },

  {
    id: "control",
    eyebrow: "STAY FLEXIBLE",
    title: "Availability & Control",
    intro:
      "Hosting should fit around your schedule — not control it.",
    items: [
      {
        question: "Do I have to host every day?",
        answer: <>No.</>,
      },
      {
        question: "Can I host only on weekends or certain hours?",
        answer: (
          <>
            Yes. Host-controlled availability is a core part of KIVO's intended
            model.
          </>
        ),
      },
      {
        question: "Can I temporarily pause hosting?",
        answer: (
          <>
            That is intended to be a core Host control.
          </>
        ),
      },
      {
        question: "Can I control session duration?",
        answer: (
          <>
            Hosts should be able to set or approve permitted charging windows.
          </>
        ),
      },
      {
        question: "Can I stop being a Host?",
        answer: (
          <>
            Yes. KIVO is not intended to require permanent charger
            availability.
            <br /><br />
            Final marketplace terms around existing confirmed reservations will
            be established before broad launch.
          </>
        ),
      },
    ],
  },

  {
    id: "insurance",
    eyebrow: "BEING BUILT CAREFULLY",
    title: "Insurance & Liability",
    intro:
      "This is one of KIVO's most important pre-launch research areas. We would rather say what is still being solved than make promises that are not yet backed by a real policy.",
    items: [
      {
        question: "Does my homeowners insurance cover KIVO hosting?",
        answer: (
          <>
            Coverage may vary by insurer, policy and jurisdiction.
            <br /><br />
            KIVO is researching the appropriate insurance and legal framework
            before broad marketplace launch and cannot currently represent that
            ordinary homeowners coverage automatically applies.
          </>
        ),
      },
      {
        question: "Will KIVO provide Host protection?",
        answer: (
          <>
            KIVO is actively evaluating Host protection and marketplace
            insurance options.
            <br /><br />
            A final protection program has not yet been established.
          </>
        ),
      },
      {
        question: "What happens if a Driver damages my property or charger?",
        answer: (
          <>
            KIVO will need a defined claims and dispute process before broad
            marketplace launch.
            <br /><br />
            The exact coverage and responsibility structure is currently being
            researched.
          </>
        ),
      },
      {
        question: "What if someone is injured?",
        answer: (
          <>
            Bodily injury is part of the insurance and legal framework KIVO is
            researching before broad residential marketplace launch.
          </>
        ),
      },
      {
        question: "Does KIVO inspect my electrical installation?",
        answer: (
          <>
            KIVO does not currently operate an electrical inspection program.
            Hosts remain responsible for maintaining charging equipment and
            electrical installations appropriately.
            <br /><br />
            Host onboarding requirements may evolve as KIVO's safety and
            insurance framework is finalized.
          </>
        ),
      },
    ],
  },
];

export default function HostFAQPage() {
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020817]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[92px] max-w-[1600px] items-center justify-between px-3 sm:h-[112px] sm:px-6 lg:h-[176px] lg:px-12">

          <Link
            href="/"
            className="shrink-0"
            aria-label="Back to KIVO"
          >
            <img
              src="/kivo/kivo-wordmark.png"
              alt="KIVO — Your Neighborhood Charger"
              className="h-[72px] w-auto object-contain sm:h-[96px] lg:h-[184px]"
            />
          </Link>

          <nav className="flex shrink-0 items-center gap-2 lg:gap-4">

            <Link
              href="/host"
              className="group hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-cyan-300/70 hover:bg-cyan-400/10 sm:inline-flex lg:px-6 lg:text-base"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                className="h-5 w-5 text-cyan-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 12h16M10 6l-6 6 6 6"
                />
              </svg>
              <span>Back to Hosting</span>
            </Link>

            <Link
              href="/host/apply"
              className="group inline-flex h-11 shrink-0 items-center justify-center gap-2.5 rounded-full border border-emerald-300/30 bg-emerald-400/[0.08] px-4 text-sm font-semibold text-white backdrop-blur-md transition hover:border-emerald-300/70 hover:bg-emerald-400/15 sm:h-auto sm:px-5 sm:py-3.5 lg:px-6 lg:text-base"
            >
              <span className="hidden sm:inline">
                Become a Founding Host
              </span>
              <span className="sm:hidden">Join</span>
            </Link>

          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-slate-200 bg-[#020817] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">

          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-400 sm:text-base">
            KIVO HOST FAQ
          </p>

          <h1 className="mt-5 max-w-[1000px] text-[48px] font-black leading-[0.96] tracking-[-0.045em] sm:text-[64px] lg:text-[78px]">
            Questions are good.
            <br />
            Hosts should know what they’re joining.
          </h1>

          <p className="mt-7 max-w-[900px] text-xl leading-8 text-slate-300 sm:text-2xl sm:leading-9">
            KIVO is still in its Founding Host and marketplace validation phase.
            Some policies are decided. Others are being researched before broad
            launch. This page tells you which is which.
          </p>

          <div className="mt-10 max-w-[1050px] rounded-3xl border border-emerald-300/20 bg-emerald-400/[0.07] p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">
              SAFETY FIRST
            </p>

            <h2 className="mt-3 text-2xl font-black sm:text-3xl">
              Charging at a home requires trust.
            </h2>

            <p className="mt-4 text-lg leading-8 text-slate-300">
              A residential charger is different from an anonymous public
              station. Hosts should know who they are accepting. Drivers should
              know where they are going. Residential addresses should remain
              protected until appropriate. KIVO intends to require safety
              screening before participants can transact through the
              residential marketplace.
            </p>

            <p className="mt-4 text-lg font-bold leading-8 text-white">
              Trust and safety are not secondary features of KIVO. They are
              part of the product.
            </p>
          </div>
        </div>
      </section>

      {/* QUICK NAV */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-wrap gap-3 px-5 py-6 sm:px-8 lg:px-12">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
            >
              {section.title}
            </a>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">

        {sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            id={section.id}
            className={sectionIndex === 0 ? "" : "mt-20"}
          >
            <div className="grid gap-8 lg:grid-cols-[0.34fr_0.66fr] lg:gap-14">

              <div className="lg:sticky lg:top-[205px] lg:self-start">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-600">
                  {section.eyebrow}
                </p>

                <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] sm:text-5xl">
                  {section.title}
                </h2>

                <p className="mt-5 text-lg leading-8 text-slate-600">
                  {section.intro}
                </p>
              </div>

              <div className="space-y-4">
                {section.items.map((item) => (
                  <details
                    key={item.question}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-6 py-5 text-lg font-black text-slate-950 sm:px-7 sm:py-6 sm:text-xl">
                      <span>{item.question}</span>

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl font-medium text-slate-700 transition group-open:rotate-45 group-open:bg-emerald-100 group-open:text-emerald-800">
                        +
                      </span>
                    </summary>

                    <div className="border-t border-slate-100 px-6 py-5 text-base leading-7 text-slate-600 sm:px-7 sm:py-6 sm:text-lg sm:leading-8">
                      {item.answer}
                    </div>
                  </details>
                ))}
              </div>

            </div>
          </section>
        ))}

      </div>

      {/* FINAL CTA */}
      <section className="bg-[#020817] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-16 text-center sm:px-8 lg:px-12 lg:py-20">

          <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-400">
            KIVO FOUNDING HOSTS
          </p>

          <h2 className="mx-auto mt-4 max-w-[900px] text-4xl font-black tracking-[-0.04em] sm:text-5xl">
            Still interested?
            <br />
            Raise your hand. No commitment.
          </h2>

          <p className="mx-auto mt-5 max-w-[760px] text-xl leading-8 text-slate-300">
            Joining the Founding Host list does not create a public listing or
            make your charger bookable. Full Host setup comes later.
          </p>

          <Link
            href="/host/apply"
            className="mt-8 inline-flex min-h-[60px] items-center justify-center rounded-xl bg-emerald-400 px-8 py-4 text-lg font-black text-slate-950 transition hover:bg-emerald-300"
          >
            Become a Founding Host →
          </Link>

        </div>
      </section>

    </main>
  );
}
