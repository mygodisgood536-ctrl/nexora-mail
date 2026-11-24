import { LegalLayout } from "@/components/legal-layout";

export const metadata = { title: "Privacy Policy — Nexora Mail" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        We collect only the information needed to create and protect your
        account: your full name, a unique username, a password hash, and basic security metadata.
        No phone number or email verification code is required to use the service.
      </p>
      <p>
        Email received at your aliases is processed transiently so it can be
        displayed in your private mailbox. Message content is stored in private
        object storage and is automatically deleted no later than ten days after
        receipt. Manual deletion removes content from active storage. Only
        minimal non-content metadata may be retained for security,
        deduplication, abuse prevention, and legal obligations.
      </p>
      <p>
        Every mailbox is isolated. Backend authorization is enforced on every
        mailbox and message operation. We do not sell your data, do not use
        message content for advertising, and do not forward alias messages to
        external email addresses. Email HTML is sanitized and rendered in a
        sandbox with remote images blocked by default.
      </p>
      <p>
        Account deletion retires your aliases permanently, deletes or expires
        mailbox content, revokes sessions, and retains only the minimum records
        required by law and for permanent address reservation.
      </p>
      <p>
        This policy is a product summary. Final legal wording and any required
        data-processing disclosures should be reviewed by qualified counsel
        before public launch.
      </p>
    </LegalLayout>
  );
}
