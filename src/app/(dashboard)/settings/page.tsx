"use client";

import { Settings, LogOut, Shield, Clock, Mail, KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function SettingsPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out");
    router.push("/");
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold flex items-center gap-2 mb-8">
        <Settings className="h-5 w-5 text-accent" />
        Settings
      </h1>

      <div className="space-y-4">
        <div className="glass rounded-xl p-5">
          <h2 className="font-medium mb-1 flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            Your mailbox
          </h2>
          <p className="text-sm text-muted-foreground">
            You have one private internal mailbox. All aliases deliver into it.
            There is no external forwarding destination.
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="font-medium mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            Message retention
          </h2>
          <p className="text-sm text-muted-foreground">
            Every message is automatically deleted 10 days after it is received.
            Manual deletion is available at any time. Deleted content cannot be recovered.
          </p>
        </div>

        <div className="glass rounded-xl p-5">
          <h2 className="font-medium mb-1 flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            Permanent aliases
          </h2>
          <p className="text-sm text-muted-foreground">
            Once an alias is successfully created it is permanently reserved.
            Pausing or deleting stops delivery but the address is never released to anyone else.
          </p>
        </div>

        <Link
          href="/change-password"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-accent hover:bg-accent-soft transition-colors"
        >
          <KeyRound className="h-4 w-4" />
          Change password
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-danger hover:bg-danger/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
