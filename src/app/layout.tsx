import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexora Mail — Permanent Email Aliases, One Private Mailbox",
  description:
    "Create permanent email addresses for every website and service. Receive all OTPs, verifications, and notifications in one private internal mailbox. Messages auto-delete after 10 days. Aliases never recycled.",
  keywords: [
    "email alias",
    "permanent email",
    "OTP inbox",
    "private mailbox",
    "email privacy",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(12,12,20,0.95)",
              border: "1px solid rgba(139,92,246,0.2)",
              color: "#f4f4f8",
            },
          }}
        />
      </body>
    </html>
  );
}
