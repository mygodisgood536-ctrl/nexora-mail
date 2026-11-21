import { LegalLayout } from "@/components/legal-layout";

export const metadata = { title: "Terms of Service — Nexora Mail" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        Nexora Mail provides permanent email aliases that deliver incoming
        messages into one private internal mailbox per user. The service is
        intended for one-time passwords, account verification, password resets,
        security alerts, and transactional notifications.
      </p>
      <p>
        Aliases are permanent identities. Once an alias is successfully created
        it is reserved and is never released, recycled, or assigned to another
        user, including after pausing, deletion, or account closure.
      </p>
      <p>
        Message content is retained temporarily and is automatically deleted no
        later than ten days after receipt. You may delete a message earlier.
        Deleted content is not recoverable. The service does not forward alias
        messages to any external email inbox and does not provide outbound
        sending from aliases.
      </p>
      <p>
        Message size and usage limits apply and are published in the product.
        Provider free tiers and quotas are not permanent guarantees. Access may
        be suspended where required to prevent abuse, protect the platform, or
        comply with law.
      </p>
      <p>
        These terms are a product summary. Final legal wording should be
        reviewed by qualified counsel before public launch.
      </p>
    </LegalLayout>
  );
}
