export const KIVO_HOST_AGREEMENT_VERSION =
  "2026-08-v1";

export const KIVO_HOST_AGREEMENT_TITLE =
  "KIVO Host Agreement";

export default function KivoHostAgreement() {
  return (
    <div className="space-y-7 text-sm leading-7 text-slate-300">
      <div>
        <h3 className="text-lg font-black text-white">
          KIVO HOST AGREEMENT
        </h3>

        <p className="mt-2 font-bold text-slate-400">
          Version: {KIVO_HOST_AGREEMENT_VERSION}
        </p>

        <p className="mt-4 font-black text-white">
          IMPORTANT: PLEASE READ THIS AGREEMENT CAREFULLY.
          BY ACCEPTING THIS AGREEMENT, YOU AGREE TO BE
          BOUND BY ITS TERMS.
        </p>
      </div>

      <AgreementSection title="1. KIVO and Your Role as a Host">
        <p>
          KIVO operates a technology marketplace that helps
          electric vehicle drivers (“Drivers”) discover and
          request access to electric vehicle charging equipment
          made available by participating property owners or
          authorized occupants (“Hosts”).
        </p>

        <p>
          As a Host, you decide whether and when to make your
          charging location available, subject to KIVO&apos;s
          policies and any confirmed booking.
        </p>

        <p>
          KIVO does not own, operate, install, maintain, inspect
          or control your property, electrical system, EV
          charging equipment or vehicle parking area. Except
          where KIVO expressly states otherwise, KIVO acts as a
          marketplace connecting Hosts and Drivers.
        </p>
      </AgreementSection>

      <AgreementSection title="2. Authority to Host">
        <p>
          By offering charging through KIVO, you represent that
          you have the legal right and authority to make the
          charging location available.
        </p>

        <p>
          You are responsible for determining whether hosting is
          permitted by applicable laws, regulations, utility
          requirements, leases, homeowner or condominium
          association rules, property restrictions, permits,
          insurance policies and other obligations applicable to
          you or the property.
        </p>

        <p>
          If you do not own the property, you represent that you
          have obtained any permission required from the property
          owner or other person having authority over the
          property.
        </p>
      </AgreementSection>

      <AgreementSection title="3. Electrical System and Charging Equipment">
        <p>
          You are responsible for ensuring that the EV charging
          equipment you make available through KIVO is reasonably
          safe, operational and appropriate for its intended use.
        </p>

        <p>
          You are responsible for the condition and maintenance
          of the charger and associated electrical infrastructure
          under your control, including applicable circuits,
          breakers, outlets, wiring, connectors and charging
          cables.
        </p>

        <p>
          You agree not to knowingly make charging equipment
          available if you believe it is damaged, malfunctioning,
          improperly installed or unsafe.
        </p>

        <p>
          Unless KIVO expressly provides a separate inspection or
          certification service, KIVO does not inspect, certify
          or warrant the safety, installation, electrical
          capacity or regulatory compliance of a Host&apos;s
          charger or electrical system.
        </p>
      </AgreementSection>

      <AgreementSection title="4. Charger Information">
        <p>
          You agree to provide accurate information concerning
          your charging equipment, including, where applicable,
          connector type, charger type, approximate charging
          capability, available amperage or power, charger
          location, parking arrangement, access restrictions and
          known limitations that could materially affect a
          Driver&apos;s ability to charge.
        </p>

        <p>
          You must update or temporarily disable your listing if
          material information changes or the charger becomes
          unavailable or unsafe.
        </p>
      </AgreementSection>

      <AgreementSection title="5. Property and Driver Access">
        <p>
          You control which portions of your property a Driver
          may access.
        </p>

        <p>
          A confirmed charging session does not give a Driver
          permission to enter your residence, garage, yard or any
          other area unless you have expressly made that area
          available.
        </p>

        <p>
          You agree to provide reasonably safe access to the
          charger and parking area during an accepted charging
          session and to disclose material access conditions or
          known hazards that a Driver should reasonably know
          about.
        </p>
      </AgreementSection>

      <AgreementSection title="6. Host Rules and Amenities">
        <p>
          You may establish reasonable rules for use of your
          property, parking area, charger and any optional
          amenities offered through KIVO.
        </p>

        <p>
          Drivers will be expected to comply with those rules.
        </p>

        <p>
          Optional amenities, including restrooms, waiting areas,
          Wi-Fi, refreshments, outdoor areas or other features,
          are offered at the Host&apos;s discretion and must be
          accurately described.
        </p>

        <p>
          KIVO may establish additional minimum community and
          safety standards that apply regardless of individual
          Host rules.
        </p>
      </AgreementSection>

      <AgreementSection title="7. Reservations and Availability">
        <p>
          You control the times when your charger is available.
        </p>

        <p>
          If you accept a charging request, you agree to make
          reasonable efforts to provide the Driver with the
          charging access represented in the confirmed booking.
        </p>

        <p>
          You should promptly notify the Driver through KIVO if
          the charger becomes unavailable, unsafe or inaccessible.
        </p>

        <p>
          Repeated cancellations, materially inaccurate listings
          or failure to honor confirmed sessions may result in
          restrictions or suspension of a listing or Host
          account.
        </p>
      </AgreementSection>

      <AgreementSection title="8. Electricity, Pricing and Host Earnings">
        <p>
          KIVO may facilitate payments between Drivers and Hosts
          for charging sessions.
        </p>

        <p>
          Host compensation may take into account charging
          access, parking, time, electricity, amenities or other
          components of the charging experience as permitted by
          applicable law and KIVO&apos;s pricing policies.
        </p>

        <p>
          KIVO may deduct disclosed marketplace commissions,
          processing fees, taxes or other applicable amounts
          before issuing Host payouts.
        </p>

        <p>
          Hosts are responsible for complying with any laws,
          utility tariffs, restrictions or other requirements
          applicable to charging for access to electricity or EV
          charging equipment at their property.
        </p>
      </AgreementSection>

      <AgreementSection title="9. Driver Conduct and Damage">
        <p>
          Drivers are expected to use charging equipment and Host
          property responsibly, follow Host instructions and
          access only authorized areas.
        </p>

        <p>
          A Driver who causes damage through misuse, negligence
          or prohibited conduct may be responsible for that
          damage under KIVO&apos;s Driver Terms and applicable
          law.
        </p>

        <p>
          Hosts should promptly document and report significant
          property damage, charger damage, safety incidents or
          Driver misconduct through KIVO.
        </p>

        <p>
          KIVO does not guarantee that a Driver will reimburse a
          Host for damage unless KIVO expressly provides a
          separate protection program stating otherwise.
        </p>
      </AgreementSection>

      <AgreementSection title="10. Insurance">
        <p>
          You are responsible for determining whether your
          homeowner&apos;s, renter&apos;s, automobile, umbrella,
          commercial or other insurance provides appropriate
          coverage for activities conducted through KIVO.
        </p>

        <p>
          You should contact your insurance provider if you are
          uncertain whether allowing third parties to charge
          vehicles on your property affects your coverage.
        </p>

        <p>
          Unless KIVO expressly announces a specific insurance or
          Host protection program, participation in KIVO does not
          provide insurance coverage for your property, charging
          equipment or liability.
        </p>
      </AgreementSection>

      <AgreementSection title="11. Accidents, Injuries and Emergencies">
        <p>
          You should not permit use of charging equipment that
          you reasonably believe presents an immediate
          electrical, fire or physical safety hazard.
        </p>

        <p>
          In an emergency, Hosts and Drivers should contact
          appropriate emergency services before contacting KIVO.
        </p>

        <p>
          Serious incidents involving injury, fire, electrical
          malfunction, vehicle damage or significant property
          damage should also be reported to KIVO as soon as
          reasonably practicable.
        </p>
      </AgreementSection>

      <AgreementSection title="12. KIVO Is a Marketplace">
        <p>
          KIVO provides technology that facilitates interactions
          between independent Hosts and Drivers.
        </p>

        <p>
          KIVO is not the owner or operator of the Host&apos;s
          property, an electric utility, the manufacturer of the
          Host&apos;s charger, the installer or electrician
          responsible for the Host&apos;s electrical system, the
          owner or operator of the Driver&apos;s vehicle, the
          Host&apos;s property manager, or the employer, partner,
          joint venturer or agent of a Host or Driver except
          where expressly stated.
        </p>

        <p>
          Hosts and Drivers are responsible for their own acts
          and omissions.
        </p>
      </AgreementSection>

      <AgreementSection title="13. No Guarantee of Drivers, Income or Bookings">
        <p>
          KIVO does not guarantee that a Host will receive
          charging requests, bookings or any particular amount of
          income.
        </p>

        <p>
          KIVO also cannot guarantee the conduct of every Driver
          or Host.
        </p>

        <p>
          Identity verification, reviews, ratings, background
          screening or other trust-and-safety measures may reduce
          risk but cannot eliminate risk.
        </p>
      </AgreementSection>

      <AgreementSection title="14. Privacy and Private Address Information">
        <p>
          KIVO may collect and maintain a Host&apos;s exact
          charging address and other information necessary to
          operate the marketplace.
        </p>

        <p>
          KIVO may limit the public visibility of exact
          residential addresses and disclose precise location or
          arrival information to Drivers when reasonably
          necessary for an authorized charging session.
        </p>

        <p>
          Hosts agree not to misuse Driver personal information
          obtained through KIVO.
        </p>

        <p>
          KIVO&apos;s separate Privacy Policy will govern
          KIVO&apos;s collection, use and disclosure of personal
          information.
        </p>
      </AgreementSection>

      <AgreementSection title="15. Compliance With Law">
        <p>
          Hosts are responsible for complying with laws and
          regulations applicable to their activities, property
          and charging equipment.
        </p>

        <p>
          These may include electrical and building codes,
          permitting requirements, zoning rules, utility
          requirements, tax obligations, accessibility
          requirements and other local, state or federal
          requirements.
        </p>

        <p>
          KIVO&apos;s approval of a Host or listing does not
          constitute legal, electrical, zoning, insurance or
          regulatory approval.
        </p>
      </AgreementSection>

      <AgreementSection title="16. Taxes">
        <p>
          Hosts are responsible for determining and satisfying
          taxes applicable to their Host earnings except where
          KIVO is legally required to calculate, collect,
          withhold or remit a tax.
        </p>

        <p>
          KIVO may collect information reasonably necessary for
          tax reporting and compliance.
        </p>
      </AgreementSection>

      <AgreementSection title="17. Suspension and Removal">
        <p>
          KIVO may restrict, suspend or remove a Host, listing or
          charging location when reasonably necessary to protect
          Drivers, Hosts, KIVO or the community.
        </p>

        <p>
          Reasons may include unsafe charging equipment or
          property conditions, fraud or misrepresentation,
          repeated cancellations, materially inaccurate
          information, abusive or discriminatory behavior,
          suspected illegal activity, serious complaints,
          failure to complete required verification or violations
          of KIVO policies or this Agreement.
        </p>
      </AgreementSection>

      <AgreementSection title="18. Assumption of Ordinary Hosting Risks">
        <p>
          You acknowledge that allowing another person and their
          vehicle onto your property involves risks, including
          property damage, personal injury, vehicle damage,
          electrical malfunction and interactions with other
          people.
        </p>

        <p>
          You agree to use reasonable judgment when deciding when
          and how to host.
        </p>

        <p>
          Nothing in this section releases KIVO from liability
          that cannot legally be waived.
        </p>
      </AgreementSection>

      <AgreementSection title="19. Limitation of KIVO Liability">
        <p className="font-black text-white">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW,
          KIVO WILL NOT BE RESPONSIBLE FOR INDIRECT, INCIDENTAL,
          SPECIAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES ARISING
          FROM HOSTING ACTIVITIES, DRIVER CONDUCT, PROPERTY
          DAMAGE, VEHICLE DAMAGE, LOSS OF INCOME OR FAILURE OF
          CHARGING EQUIPMENT, EXCEPT TO THE EXTENT SUCH LIABILITY
          CANNOT LAWFULLY BE LIMITED.
        </p>
      </AgreementSection>

      <AgreementSection title="20. Indemnification">
        <p>
          To the extent permitted by applicable law, you agree to
          indemnify and hold harmless KIVO and its affiliates,
          officers, employees and agents from third-party claims
          arising from your material breach of this Agreement,
          your violation of applicable law, or your negligent or
          wrongful acts in connection with hosting.
        </p>
      </AgreementSection>

      <AgreementSection title="21. Disputes and Governing Law">
        <p>
          KIVO intends to establish procedures governing disputes
          between KIVO and Hosts and between marketplace
          participants.
        </p>

        <p>
          The final commercial version may include governing-law,
          informal dispute-resolution, arbitration and
          class-action-waiver provisions.
        </p>
      </AgreementSection>

      <AgreementSection title="22. Changes to This Agreement">
        <p>
          KIVO may update this Agreement as the marketplace,
          laws or services evolve.
        </p>

        <p>
          Material revisions may require Hosts to review and
          affirmatively accept a new version before continuing to
          host.
        </p>

        <p>
          KIVO will maintain a version identifier and acceptance
          record for each agreement accepted through the
          platform.
        </p>
      </AgreementSection>

      <AgreementSection title="23. Electronic Acceptance">
        <p>
          By selecting “I have read and agree to the KIVO Host
          Agreement” and submitting your acceptance, you
          acknowledge that you have had an opportunity to review
          this Agreement, understand that it is intended to
          create legally binding obligations, confirm that the
          information you have provided to KIVO is accurate to
          the best of your knowledge, and agree electronically to
          the version identified above.
        </p>
      </AgreementSection>
    </div>
  );
}

function AgreementSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="text-base font-black text-white">
        {title}
      </h4>

      <div className="mt-3 space-y-3">
        {children}
      </div>
    </section>
  );
}
