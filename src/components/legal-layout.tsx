import Link from "next/link";
import { Mail } from "lucide-react";

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cinematic bg-mesh px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-10 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="h-4 w-4 text-violet-400" />
          Nexora Mail
        </Link>
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="text-2xl font-semibold mb-6">{title}</h1>
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
