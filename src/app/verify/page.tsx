"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";

function VerifyContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      void Promise.resolve().then(() => {
        setStatus("error");
        setMessage("This verification link is missing its token.");
      });
      return;
    }

    let active = true;
    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("error");
          setMessage("Verification service is unavailable.");
        }
      });
    return () => {
      active = false;
    };
  }, [params]);

  return (
    <div className="min-h-screen bg-cinematic bg-mesh flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-strong rounded-2xl p-8 text-center"
      >
        <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center mx-auto mb-5">
          <Mail className="h-6 w-6 text-violet-400" />
        </div>
        <h1 className="text-xl font-semibold mb-2">Account verification</h1>

        {status === "verifying" && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-6">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            Verifying your address…
          </div>
        )}
        {status === "success" && (
          <>
            <p className="flex items-center justify-center gap-2 text-sm text-green-400 mt-6">
              <CheckCircle2 className="h-4 w-4" />
              Your account email is verified.
            </p>
            <Link
              href="/aliases"
              className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              Go to aliases
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="flex items-center justify-center gap-2 text-sm text-red-400 mt-6">
              <XCircle className="h-4 w-4" />
              {message}
            </p>
            <Link href="/login" className="inline-block mt-6 text-sm text-violet-400 hover:text-violet-300">
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cinematic bg-mesh flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
