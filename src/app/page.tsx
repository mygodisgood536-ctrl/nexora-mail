"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Mail, Clock, Shield, KeyRound, AtSign } from "lucide-react";

const features = [
  {
    title: "Permanent by design",
    body: "An address you create stays reserved. It is never recycled or handed to someone else, even after you retire it.",
  },
  {
    title: "One mailbox, many aliases",
    body: "Every alias you own delivers into the same private mailbox. Nothing is forwarded to an external inbox.",
  },
  {
    title: "Content expires in ten days",
    body: "Messages are removed automatically ten days after receipt. Deleting a message never releases its alias.",
  },
];

const previews = [
  { from: "GitHub", subject: "Your verification code is 847291", alias: "github-otp", time: "2m" },
  { from: "Stripe", subject: "Payment receipt for Invoice #3921", alias: "billing", time: "1h" },
  { from: "Notion", subject: "Confirm your email address", alias: "work-login", time: "3h" },
];

export default function LandingPage() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    void Promise.resolve().then(() => setYear(new Date().getFullYear()));
  }, []);

  return (
    <div className="min-h-screen bg-cinematic text-foreground">
      <header className="border-b border-[#26221d]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg border border-accent/60 flex items-center justify-center">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <span className="text-base font-semibold tracking-tight">Nexora Mail</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-lg border border-accent/60 text-accent hover:bg-accent/10 transition-colors"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-14 md:gap-20 items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent mb-5">
              Permanent email aliases
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-[1.12] tracking-tight">
              One mailbox.
              <br />
              <span className="text-accent">Every address you own.</span>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground max-w-lg">
              Create a separate address for each website and service. Verification codes,
              login alerts, and password resets all arrive in one private mailbox.
              Nothing is forwarded. No address is ever reused.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent hover:bg-accent text-white text-sm font-semibold transition-colors"
              >
                Create your account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How it works
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-accent" /> Private by default</span>
              <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-accent" /> 10-day retention</span>
              <span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-accent" /> Built for OTPs</span>
            </div>
          </div>

          <div className="border border-[#2b2620] rounded-xl bg-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-[#2b2620] flex items-center justify-between">
              <span className="text-sm font-medium">Your mailbox</span>
              <span className="text-xs text-muted-foreground">3 messages</span>
            </div>
            <div className="divide-y divide-[#26221d]">
              {previews.map((item) => (
                <div key={item.alias} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.from}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{item.subject}</p>
                    <p className="text-xs text-accent/80 mt-1.5 flex items-center gap-1">
                      <AtSign className="h-3 w-3" /> {item.alias}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-[#2b2620] text-xs text-muted-foreground">
              Messages are deleted automatically after 10 days.
            </div>
          </div>
        </section>

        <section className="border-y border-[#26221d] bg-surface">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Built for a narrow purpose</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xl">
              A focused tool for account-related email — not a general-purpose mail provider.
            </p>
            <div className="mt-10 grid md:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div key={feature.title} className="border-t border-accent/50 pt-5">
                  <span className="text-xs text-accent">0{i + 1}</span>
                  <h3 className="mt-2 text-base font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-8">
            {[
              ["01", "Create an account", "A password is all you need. You get one private mailbox immediately."],
              ["02", "Add aliases", "Choose a name or generate a random one. Each address is reserved permanently."],
              ["03", "Receive and forget", "Messages land in your mailbox and disappear after ten days."],
            ].map(([num, title, body]) => (
              <div key={num}>
                <p className="text-sm font-medium text-accent">{num}</p>
                <h3 className="mt-2 text-base font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24">
          <div className="border border-[#2b2620] rounded-xl bg-surface px-8 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Start with one address.</h2>
              <p className="mt-2 text-sm text-muted-foreground">No DNS. No external mailbox. No forwarding.</p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent hover:bg-accent text-white text-sm font-semibold transition-colors"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#26221d] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>Nexora Mail</span>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
          </div>
          <span>© {year} Nexora</span>
        </div>
      </footer>
    </div>
  );
}
