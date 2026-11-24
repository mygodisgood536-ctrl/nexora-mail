"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, KeyRound } from "lucide-react";
import { AuthShell, fieldClass } from "@/components/auth-shell";

export default function RecoveryPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Recovery failed");
      sessionStorage.setItem("enrollmentToken", data.enrollmentToken);
      router.push("/setup");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Lost your authenticator?"
      subtitle="Use one of the single-use recovery codes saved when you enrolled. This lets you set up a new authenticator — nothing else can bypass it."
      footer={<Link href="/login" className="font-semibold text-accent hover:text-accent-hover">Back to sign in</Link>}
    >
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="username">Username</label>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} placeholder="ada.lovelace" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-ink" htmlFor="recoveryCode">Recovery code</label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input id="recoveryCode" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={`${fieldClass} pl-11 font-mono`} placeholder="ABCDE-12345" />
          </div>
        </div>
        {error && <p className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger">{error}</p>}
        <button type="submit" disabled={loading || !code} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue to setup <ArrowRight className="h-4 w-4" /></>}
        </button>
      </motion.form>
    </AuthShell>
  );
}
