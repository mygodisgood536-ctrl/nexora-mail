"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Search,
  RefreshCw,
  Trash2,
  Mail,
  Clock,
  AtSign,
  Loader2,
} from "lucide-react";
import { formatRelativeTime, formatExpiry, cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  fromName: string | null;
  fromAddress: string | null;
  subject: string | null;
  preview: string | null;
  receivedAt: string;
  expiresAt: string;
  isRead: boolean;
  aliasAddress: string;
  hasAttachments: boolean;
};

type MessageDetail = {
  text: string | null;
  html: string | null;
  attachments: Array<{ filename: string | null; mimeType: string; size: number }>;
  remoteImagesBlocked: boolean;
};

export default function MailboxPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [detail, setDetail] = useState<MessageDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const router = useRouter();

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/messages");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(() => loadMessages());
  }, [loadMessages]);

  async function openMessage(id: string) {
    setSelected(id);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/messages/${id}`);
      if (res.ok) setDetail((await res.json()) as MessageDetail);
    } catch {
      // The list preview remains available if detail loading fails.
    } finally {
      setLoadingDetail(false);
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRead: true }),
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isRead: true } : m))
    );
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/messages/${id}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selected === id) setSelected(null);
    toast.success("Message deleted");
  }

  const filtered = messages.filter((m) => {
    if (filter === "unread" && m.isRead) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        m.subject?.toLowerCase().includes(q) ||
        m.fromName?.toLowerCase().includes(q) ||
        m.fromAddress?.toLowerCase().includes(q) ||
        m.aliasAddress?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedMsg = messages.find((m) => m.id === selected);

  return (
    <div className="h-[calc(100vh-0px)] md:h-screen flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Inbox className="h-5 w-5 text-violet-400" />
            Mailbox
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {messages.filter((m) => !m.isRead).length} unread · Messages auto-delete after 10 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMessages}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Message list */}
        <div className={cn("w-full md:w-96 border-r border-white/5 flex flex-col", selected && "hidden md:flex")}>
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                    filter === f
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-muted-foreground hover:bg-white/5"
                  )}
                >
                  {f === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-violet-400" />
                </div>
                <p className="font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create an alias and start receiving OTPs & notifications
                </p>
                <Link
                  href="/aliases"
                  className="mt-4 px-4 py-2 rounded-lg bg-violet-600/20 text-violet-300 text-sm hover:bg-violet-600/30 transition-colors"
                >
                  Create alias
                </Link>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((msg) => (
                  <motion.button
                    key={msg.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      void openMessage(msg.id);
                      if (!msg.isRead) markRead(msg.id);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3.5 border-b border-white/5 hover:bg-white/[0.03] transition-colors",
                      selected === msg.id && "bg-violet-500/10",
                      !msg.isRead && "bg-violet-500/[0.04]"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1.5">
                        {!msg.isRead ? (
                          <div className="h-2 w-2 rounded-full bg-violet-400" />
                        ) : (
                          <div className="h-2 w-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-sm truncate",
                              !msg.isRead ? "font-semibold text-white" : "text-muted-foreground"
                            )}
                          >
                            {msg.fromName || msg.fromAddress || "Unknown"}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatRelativeTime(msg.receivedAt)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-sm truncate mt-0.5",
                            !msg.isRead ? "text-foreground/90" : "text-muted-foreground"
                          )}
                        >
                          {msg.subject || "(no subject)"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-violet-400/80 truncate flex items-center gap-1">
                            <AtSign className="h-3 w-3" />
                            {msg.aliasAddress}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatExpiry(msg.expiresAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Message detail */}
        <div className={cn("flex-1 flex flex-col", !selected && "hidden md:flex")}>
          {selectedMsg ? (
            <>
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setSelected(null)}
                  className="md:hidden text-sm text-muted-foreground"
                >
                  ← Back
                </button>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => deleteMessage(selectedMsg.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto">
                  <h2 className="text-xl font-semibold mb-4">
                    {selectedMsg.subject || "(no subject)"}
                  </h2>
                  <div className="flex items-center gap-3 mb-6 text-sm">
                    <div className="h-10 w-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300 font-medium">
                      {(selectedMsg.fromName || selectedMsg.fromAddress || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {selectedMsg.fromName || selectedMsg.fromAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        to {selectedMsg.aliasAddress} · {formatRelativeTime(selectedMsg.receivedAt)} · expires {formatExpiry(selectedMsg.expiresAt)}
                      </p>
                    </div>
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    {loadingDetail ? (
                      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    ) : (
                      <>
                        <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {detail?.text ||
                            selectedMsg.preview ||
                            "No plain-text content available."}
                        </p>
                        {detail?.html && (
                          <iframe
                            title="Safe message content"
                            sandbox=""
                            referrerPolicy="no-referrer"
                            className="mt-5 w-full min-h-40 rounded-lg border border-white/10 bg-[#0a0a12]"
                            srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:12px;background:#0a0a12;color:#e5e7eb;font-family:system-ui,sans-serif;font-size:14px;overflow-wrap:anywhere}a{color:#a78bfa}img{display:none}</style></head><body>${detail.html}</body></html>`}
                          />
                        )}
                        {detail?.remoteImagesBlocked && (
                          <p className="text-[11px] text-muted-foreground/60 mt-3">
                            Remote images are blocked for privacy.
                          </p>
                        )}
                        {detail && detail.attachments.length > 0 && (
                          <p className="text-[11px] text-muted-foreground/60 mt-1">
                            Attachments (not downloaded): {detail.attachments.map((a) => a.filename || a.mimeType).join(", ")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
