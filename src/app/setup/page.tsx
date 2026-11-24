"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Check, KeyRound, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, fieldClass } from "@/components/auth-shell";

type Enrollment = {
  username: string;
  qrDataUri: string;
  manualKey: string;
  issuer: string;
};

function SetupContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState("");
  const recoveryCodes: string[] = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("recoveryCodes") || "[]");
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const stored = sessionStorage.getItem("enrollmentToken");
      const fromUrl = params.get("token");
      const active = fromUrl || stored;
      if (!active) {
        setError("Your enrollment session expired. Sign in again to continue.");
        setLoading(false);
        return;
      }
      setToken(active);
      try {
        const res = await fetch(`/api/auth/enrollment?token=${encodeURIComponent(active)}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Invalid enrollment link");
        } else {
          setEnrollment(data);
        }
      } catch {
        setError("Could not load enrollment details");
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/enrollment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      sessionStorage.removeItem("enrollmentToken");
      setDone(true);
    } catch {
      setError("Could not reach the server");
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => {
      sessionStorage.removeItem("recoveryCodes");
      router.push("/login");
    }, 10000);
    return () => clearTimeout(timer);
  }, [done, router]);

  function copy(value: string, label: string) {
    void navigator.clipboard.writeText(value);
    setCopied(label);
    toast.success("Copied");
    setTimeout(() => setCopied(""), 1800);
  }

  return (
    <AuthShell
      title={done ? "You are all set" : "Set up your authenticator"}
      subtitle={
        done
          ? "Your account is protected. Save your recovery codes, then sign in."
          : "Scan the QR code with any authenticator app, then enter the code it shows."
      }
      step={done ? 3 : 2}
      footer={done ? <span>Keep your recovery codes safe. You will be sent to sign in shortly.</span> : undefined}
    >
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm font-medium text-ink">
              <ShieldCheck className="h-4 w-4 text-accent" /> Authenticator verified
            </div>
            {recoveryCodes.length > 0 && (
              <div className="rounded-xl border border-line bg-canvas p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recovery codes</p>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-ink">
                  {recoveryCodes.map((c) => <span key={c}>{c}</span>)}
                </div>
                <button
                  type="button"
                  onClick={() => copy(recoveryCodes.join("\n"), "codes")}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent-hover"
                >
                  {copied === "codes" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy all codes
                </button>
              </div>
            )}
            <button
              onClick={() => {
                sessionStorage.removeItem("recoveryCodes");
                router.push("/login");
              }}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
            >
              Continue to sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
        ) : loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : error && !enrollment ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
            <a href="/login" className="inline-block text-sm font-semibold text-accent hover:text-accent-hover">Back to sign in</a>
          </div>
        ) : (
          <motion.div key="setup" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col items-center gap-4 rounded-xl border border-line bg-canvas p-5">
              {enrollment && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={enrollment.qrDataUri} alt="Authenticator QR code" className="h-44 w-44 rounded-lg bg-white p-1" />
              )}
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Open your authenticator app, add a new account, and scan this code for <strong className="text-ink">{enrollment?.issuer}</strong>.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Or enter this key manually</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-line bg-canvas p-3">
                <KeyRound className="h-4 w-4 shrink-0 text-accent" />
                <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{enrollment?.manualKey}</code>
                <button
                  type="button"
                  onClick={() => enrollment && copy(enrollment.manualKey, "key")}
                  aria-label="Copy setup key"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-black/[0.04] hover:text-ink"
                >
                  {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <form onSubmit={verify} className="space-y-3">
              <label htmlFor="code" className="block text-sm font-semibold text-ink">Verification code</label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`${fieldClass} text-center text-lg font-bold tracking-[0.5em]`}
              />
              {error && <p className="text-xs font-medium text-danger">{error}</p>}
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60"
              >
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify and activate <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cinematic" />}>
      <SetupContent />
    </Suspense>
  );
}
