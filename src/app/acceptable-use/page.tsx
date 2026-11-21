import { LegalLayout } from "@/components/legal-layout";

export const metadata = { title: "Acceptable Use — Nexora Mail" };

export default function AcceptableUsePage() {
  return (
    <LegalLayout title="Acceptable Use Policy">
      <p>
        Nexora Mail is for receiving account-related email such as OTPs,
        verification messages, login alerts, password resets, and transactional
        notifications. Use it only for accounts and services you are authorized
        to use.
      </p>
      <p>
        You must not use the service for fraud, impersonation, phishing, spam,
        malware, unlawful activity, or to defeat a third party&apos;s identity
        checks, account limits, bans, or anti-abuse controls. Bulk alias
        creation for those purposes is prohibited.
      </p>
      <p>
        You must not attempt to access another user&apos;s mailbox or data,
        probe or attack the service, abuse rate limits, or interfere with
        infrastructure. Aliases cannot be transferred or resold.
      </p>
      <p>
        We enforce reasonable rate limits, abuse controls, and temporary or
        permanent restrictions. Suspected abuse can be reported to the platform
        owner through the contact address published for the domain. Confirmed
        violations may result in account suspension while permanent address
        reservations remain in place.
      </p>
      <p>
        This policy is a product summary. Final legal wording should be reviewed
        by qualified counsel before public launch.
      </p>
    </LegalLayout>
  );
}
