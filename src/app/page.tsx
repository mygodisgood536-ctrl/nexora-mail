"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Mail,
  Shield,
  Clock,
  Key,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  Infinity,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const features = [
  {
    icon: Infinity,
    title: "Permanent Aliases",
    description:
      "Once created, an address is yours forever. Never recycled, never reassigned — even after deletion.",
  },
  {
    icon: Mail,
    title: "One Private Mailbox",
    description:
      "All your aliases deliver into a single secure internal mailbox. No external forwarding needed.",
  },
  {
    icon: Clock,
    title: "10-Day Auto-Expiry",
    description:
      "Messages automatically delete after 10 days. Privacy by design, not by configuration.",
  },
  {
    icon: Key,
    title: "Built for OTPs & Alerts",
    description:
      "Perfect for verification codes, login alerts, password resets, and account notifications.",
  },
  {
    icon: Shield,
    title: "Zero Forwarding",
    description:
      "Your messages stay inside Nexora. We never send them to Gmail, Outlook, or any external inbox.",
  },
  {
    icon: Lock,
    title: "Tenant Isolation",
    description:
      "Every mailbox is strictly isolated. No cross-user access is possible by design.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cinematic bg-mesh relative overflow-hidden">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px] animate-float" />
        <div className="absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-indigo-600/15 blur-[100px] animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px] animate-float" style={{ animationDelay: "4s" }} />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight">Nexora</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-5 py-2.5 text-sm font-medium rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-lg shadow-violet-600/25 hover:shadow-violet-500/40"
          >
            Get started
          </Link>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-violet-300 mb-8"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Permanent aliases · Private mailbox · 10-day retention</span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.1]"
          >
            One mailbox.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent glow-text">
              Infinite permanent aliases.
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
          >
            Create permanent email addresses for every website and service.
            Receive OTPs, verifications, and alerts in one private internal
            mailbox. No forwarding. No recycling. Ever.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href="/register"
              className="group flex items-center gap-2 px-8 py-3.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium text-base transition-all shadow-xl shadow-violet-600/30 hover:shadow-violet-500/50 hover:scale-[1.02]"
            >
              Create your first alias
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-3.5 rounded-full glass text-sm font-medium hover:bg-white/5 transition-colors"
            >
              See how it works
            </Link>
          </motion.div>
        </motion.div>

        {/* Product preview card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 relative mx-auto max-w-4xl"
        >
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600/30 via-purple-500/20 to-indigo-600/30 blur-xl" />
          <div className="relative glass-strong rounded-2xl p-1 overflow-hidden">
            <div className="rounded-xl bg-[#0a0a12] overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-white/5 text-xs text-muted-foreground">
                    app.nexora.mail/mailbox
                  </div>
                </div>
              </div>
              {/* Fake inbox */}
              <div className="p-6 space-y-3">
                {[
                  { from: "GitHub", subject: "Your verification code is 847291", alias: "github-otp", time: "2m ago", unread: true },
                  { from: "Stripe", subject: "Payment receipt for Invoice #3921", alias: "billing", time: "1h ago", unread: true },
                  { from: "Notion", subject: "Confirm your email address", alias: "work-login", time: "3h ago", unread: false },
                  { from: "Vercel", subject: "Deployment succeeded — production", alias: "dev-alerts", time: "5h ago", unread: false },
                ].map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className={`flex items-center gap-4 p-3.5 rounded-xl transition-colors ${
                      msg.unread ? "bg-violet-500/10 border border-violet-500/20" : "bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    <div className={`h-2 w-2 rounded-full ${msg.unread ? "bg-violet-400" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${msg.unread ? "font-semibold text-white" : "text-muted-foreground"}`}>
                          {msg.from}
                        </span>
                        <span className="text-xs text-muted-foreground/60 truncate">
                          → {msg.alias}@nexora.mail
                        </span>
                      </div>
                      <p className={`text-sm truncate ${msg.unread ? "text-foreground/90" : "text-muted-foreground"}`}>
                        {msg.subject}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{msg.time}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Designed for privacy & permanence
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Not disposable. Not a forwarding service. A proper permanent alias platform with a private internal mailbox.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group glass rounded-2xl p-6 hover:bg-white/[0.04] transition-all duration-300 hover:border-violet-500/20"
            >
              <div className="h-11 w-11 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                <f.icon className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works steps */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">Three steps. Zero DNS.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Create an account", desc: "Sign up in seconds. You instantly get one private internal mailbox." },
            { step: "02", title: "Generate aliases", desc: "Create custom or random permanent addresses on our domains." },
            { step: "03", title: "Receive & forget", desc: "OTPs and alerts land in your mailbox. Auto-deleted after 10 days." },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-violet-500/30 mb-3">{s.step}</div>
              <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-strong rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-transparent" />
          <div className="relative">
            <Zap className="h-10 w-10 text-violet-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">
              Ready for permanent addresses?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Stop exposing your real email. Start using permanent, controlled aliases today.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-xl shadow-violet-600/30"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-violet-400" />
            <span>Nexora Mail</span>
          </div>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/acceptable-use" className="hover:text-foreground transition-colors">Acceptable Use</Link>
          </div>
          <p>© {new Date().getFullYear()} Nexora. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
