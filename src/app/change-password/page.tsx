"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, fieldClass } from "@/components/auth-shell";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [challengeToken, setChallengeToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const data = await res.json();
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok && data.challengeToken) setChallengeToken(data.challengeToken);
        else setError(data.error || "Could not start verification");
      } catch {
        setError("Could not reach the server");
      }
    });
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      if (!/^\d{6}$/.test(code)) return setError("Enter a 6-digit code");
      setStep(2);
      setError("");
      return;
    }
    if (newPassword.length < 10 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return setError("At least 10 characters with a letter and a number");
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: challengeToken, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Change failed");
      toast.success("Password changed. Please sign in again.");
      router.push("/login");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Change password"
      subtitle="Confirm with your authenticator, then choose a new password."
      step={step}
      steps={2}
      footer={<Link href="/settings" className="font-semibold text-accent hover:text-accent-hover">Back to settings</Link>}
    >
      <AnimatePresence mode="wait">
        <motion.form key={step} onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-ink">
            <ShieldCheck className="h-4 w-4 text-accent" /> Authenticator verification required
          </div>
          {step === 1 ? (
            <>
              <label className="block text-sm font-semibold text-ink" htmlFor="code">Authenticator code</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className={`${fieldClass} text-center text-lg font-bold tracking-[0.5em]`} />
              <button type="submit" disabled={code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">Continue <ArrowRight className="h-4 w-4" /></button>
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold text-ink" htmlFor="newPassword">New password</label>
              <input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} placeholder="At least 10 characters" />
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Change password <ArrowRight className="h-4 w-4" /></>}
              </button>
            </>
          )}
          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
        </motion.form>
      </AnimatePresence>
    </AuthShell>
  );
}
