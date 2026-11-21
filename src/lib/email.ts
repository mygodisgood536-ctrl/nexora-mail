const RESEND_ENDPOINT = "https://api.resend.com/emails";

function notificationFrom(): string {
  return (
    process.env.NOTIFICATION_FROM_EMAIL ||
    "Nexora Mail <onboarding@resend.dev>"
  );
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Nexora] RESEND_API_KEY is not set — account notification email skipped."
      );
    } else {
      console.error(
        "[Nexora] RESEND_API_KEY is not set — could not send account notification."
      );
    }
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notificationFrom(),
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[Nexora] Notification provider rejected request:", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Nexora] Notification provider unavailable:", err);
    return false;
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/verify?token=${encodeURIComponent(token)}`;
  return sendEmail(
    to,
    "Verify your Nexora Mail account",
    `Welcome to Nexora Mail.\n\nVerify your account contact address by opening this link within 24 hours:\n\n${url}\n\nIf you did not create an account, you can ignore this message.\n\nNexora Mail`
  );
}
