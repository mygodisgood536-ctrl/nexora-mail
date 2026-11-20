"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Plus,
  Copy,
  Pause,
  Play,
  Trash2,
  Shuffle,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn, generateRandomLocalPart, isValidLocalPart, isReservedLocalPart } from "@/lib/utils";
import { toast } from "sonner";

type Alias = {
  id: string;
  fullAddress: string;
  localPart: string;
  domain: string;
  status: "active" | "paused" | "deleted";
  createdAt: string;
  lastReceivedAt: string | null;
  messageCount: number;
};

const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "nexora.mail";

export default function AliasesPage() {
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [localPart, setLocalPart] = useState("");
  const [mode, setMode] = useState<"custom" | "random">("custom");
  const [copied, setCopied] = useState<string | null>(null);

  async function loadAliases() {
    setLoading(true);
    try {
      const res = await fetch("/api/aliases");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      setAliases(data.aliases || []);
    } catch {
      toast.error("Failed to load aliases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAliases();
  }, []);

  async function createAlias() {
    let local = localPart.trim().toLowerCase();
    if (mode === "random") {
      local = generateRandomLocalPart(10);
    }
    if (!isValidLocalPart(local)) {
      toast.error("Invalid alias name");
      return;
    }
    if (isReservedLocalPart(local)) {
      toast.error("This name is reserved");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ localPart: local }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create alias");
        return;
      }
      toast.success("Alias created — permanently reserved");
      setShowCreate(false);
      setLocalPart("");
      loadAliases();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: "active" | "paused" | "deleted") {
    const res = await fetch(`/api/aliases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success(status === "deleted" ? "Alias permanently retired" : `Alias ${status}`);
    loadAliases();
  }

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <AtSign className="h-5 w-5 text-violet-400" />
            Aliases
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanent addresses that deliver into your one mailbox
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-all shadow-lg shadow-violet-600/20"
        >
          <Plus className="h-4 w-4" />
          New alias
        </button>
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-strong rounded-2xl p-6"
            >
              <h2 className="text-lg font-semibold mb-1">Create permanent alias</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Once created, this address is reserved forever and never reused.
              </p>

              <div className="flex gap-2 mb-4">
                {(["custom", "random"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-colors",
                      mode === m
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    )}
                  >
                    {m === "custom" ? "Custom" : "Random"}
                  </button>
                ))}
              </div>

              {mode === "custom" ? (
                <div className="flex items-center gap-0 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  <input
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._+-]/g, ""))}
                    placeholder="shopping-alerts"
                    className="flex-1 px-4 py-3 bg-transparent text-sm focus:outline-none"
                  />
                  <span className="px-3 text-sm text-muted-foreground border-l border-white/10">
                    @{PLATFORM_DOMAIN}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <Shuffle className="h-5 w-5 text-violet-400" />
                  <span className="text-sm text-muted-foreground">
                    A secure random local-part will be generated
                  </span>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createAlias}
                  disabled={creating || (mode === "custom" && !localPart)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-all"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Create permanently
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      ) : aliases.length === 0 ? (
        <div className="text-center py-20">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <AtSign className="h-6 w-6 text-violet-400" />
          </div>
          <p className="font-medium">No aliases yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Create your first permanent email address
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm"
          >
            Create alias
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {aliases.map((alias) => (
            <motion.div
              key={alias.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 flex items-center gap-4"
            >
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  alias.status === "active"
                    ? "bg-green-400"
                    : alias.status === "paused"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                )}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{alias.fullAddress}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alias.status} · {alias.messageCount} messages · created{" "}
                  {new Date(alias.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copyAddress(alias.fullAddress)}
                  className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied === alias.fullAddress ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                {alias.status === "active" && (
                  <button
                    onClick={() => updateStatus(alias.id, "paused")}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-yellow-400 transition-colors"
                    title="Pause"
                  >
                    <Pause className="h-4 w-4" />
                  </button>
                )}
                {alias.status === "paused" && (
                  <button
                    onClick={() => updateStatus(alias.id, "active")}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-green-400 transition-colors"
                    title="Reactivate"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                )}
                {alias.status !== "deleted" && (
                  <button
                    onClick={() => {
                      if (confirm("This permanently retires the alias. It will never be available again. Continue?")) {
                        updateStatus(alias.id, "deleted");
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
