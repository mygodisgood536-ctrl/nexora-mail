"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react";
import { AuthShell, fieldClass } from "@/components/auth-shell";

export default function VerifyLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = sessionStorage.getItem("twoFactorToken");
      if (!stored) {
        setError("Your verification session expired. Please sign in again.");
      } else {
        setToken(stored);
      }
    });
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken: token, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      sessionStorage.removeItem("twoFactorToken");
      router.push("/mailbox");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Two-factor verification"
      subtitle="Enter the current 6-digit code from your authenticator app to finish signing in."
      step={3}
      footer={<span>Codes refresh every 30 seconds.</span>}
    >
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm text-ink">
          <ShieldCheck className="h-4 w-4 text-accent" /> Your password was accepted. One more step.
        </div>
        <form onSubmit={verify} className="space-y-4">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
            className={`${fieldClass} text-center text-lg font-bold tracking-[0.5em]`}
          />
          {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify and sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </motion.div>
    </AuthShell>
  );
}
