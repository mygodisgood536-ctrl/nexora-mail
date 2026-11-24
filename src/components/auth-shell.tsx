"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  subtitle,
  step,
  steps = 3,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  step?: number;
  steps?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-cinematic flex flex-col">
      <div className="mx-auto w-full max-w-md px-5 pt-10">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="h-9 w-9 rounded-xl bg-ink flex items-center justify-center">
            <Mail className="h-4.5 w-4.5 text-white" />
          </span>
          <span className="text-base font-bold tracking-tight text-ink">Nexora Mail</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          {step && (
            <div className="mb-6 flex items-center gap-1.5" aria-label={`Step ${step} of ${steps}`}>
              {Array.from({ length: steps }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i < step ? "bg-accent" : "bg-line"
                  )}
                />
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_20px_50px_rgba(28,25,23,0.07)] sm:p-9">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
          </div>

          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </motion.div>
      </div>
    </main>
  );
}

export const fieldClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent-soft placeholder:text-muted-foreground/60";
