"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, fieldClass } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestChallenge(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Request failed");
      if (!data.challengeToken) return setError("If that account exists, its authenticator is required.");
      setChallengeToken(data.challengeToken);
      setStep(2);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken, code }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Verification failed");
      setResetToken(data.resetToken);
      setStep(3);
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return setError("At least 10 characters with a letter and a number");
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Reset failed");
      toast.success("Password updated. Sign in again.");
      router.push("/login");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Your authenticator is the only way to recover your account. No email is used."
      step={step}
      steps={3}
      footer={<Link href="/login" className="font-semibold text-accent hover:text-accent-hover">Back to sign in</Link>}
    >
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {step === 1 && (
            <form onSubmit={requestChallenge} className="space-y-4">
              <label className="block text-sm font-semibold text-ink" htmlFor="username">Username</label>
              <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} placeholder="ada.lovelace" />
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-ink">
                <KeyRound className="h-4 w-4 text-accent" /> Enter the code for <strong>{username}</strong>
              </div>
              <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={`${fieldClass} text-center text-lg font-bold tracking-[0.5em]`} />
              <button type="submit" disabled={loading || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify code <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={reset} className="space-y-4">
              <label className="block text-sm font-semibold text-ink" htmlFor="newPassword">New password</label>
              <input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} placeholder="At least 10 characters" />
              <p className="text-xs text-muted-foreground">Use at least 10 characters with a letter and a number. All sessions will be signed out.</p>
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Set new password <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          {error && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
