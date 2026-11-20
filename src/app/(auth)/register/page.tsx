"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }
      toast.success("Account created");
      router.push("/mailbox");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cinematic bg-mesh flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 h-72 w-72 rounded-full bg-violet-600/15 blur-[100px]" />
        <div className="absolute bottom-1/3 left-1/4 h-64 w-64 rounded-full bg-indigo-600/10 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-semibold">Nexora</span>
          </Link>
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Get one private mailbox and permanent aliases
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="glass-strong rounded-2xl p-8 space-y-5"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-muted-foreground/50"
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-muted-foreground/50"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-muted-foreground/50"
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
              One private internal mailbox
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
              Permanent aliases that are never recycled
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-violet-400" />
              Messages auto-delete after 10 days
            </li>
          </ul>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-lg shadow-violet-600/25 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create account
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
