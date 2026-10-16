"use client";

import { countSmsSegments, parsePhoneList, type SmsKind } from "@sms-kit/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProviderName, PublicMessage } from "./types";

const EXAMPLE_PHONE = "0911234567";

function statusTone(status: PublicMessage["status"]): string {
  if (status === "delivered") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "sent") {
    return "bg-sky-100 text-sky-800";
  }
  if (status === "queued") {
    return "bg-amber-100 text-amber-900";
  }
  return "bg-red-100 text-red-800";
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function SmsWorkbench() {
  const [provider, setProvider] = useState<ProviderName>("mock");
  const [phonesInput, setPhonesInput] = useState("");
  const [kind, setKind] = useState<SmsKind>("message");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [tab, setTab] = useState<"outbox" | "inbox">("outbox");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyPhone, setReplyPhone] = useState("");
  const [replyBody, setReplyBody] = useState("Got it, thank you.");

  const parsed = useMemo(() => parsePhoneList(phonesInput), [phonesInput]);
  const segments = useMemo(() => countSmsSegments(body), [body]);

  const load = useCallback(async () => {
    const response = await fetch("/api/sms/messages");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as {
      provider: ProviderName;
      messages: PublicMessage[];
    };
    setProvider(data.provider);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 2500);
    return () => window.clearInterval(timer);
  }, [load]);

  const outbound = messages.filter((message) => message.direction === "outbound");
  const inbound = messages.filter((message) => message.direction === "inbound");

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phones: parsed.valid,
          body,
          kind,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        invalid?: string[];
        messages?: PublicMessage[];
      };
      if (!response.ok) {
        setError(data.error ?? "Send failed");
        return;
      }
      if (data.invalid && data.invalid.length > 0) {
        setError(`Skipped invalid numbers: ${data.invalid.join(", ")}`);
      }
      await load();
      setTab("outbox");
    } catch {
      setError("Could not reach the SMS API.");
    } finally {
      setSending(false);
    }
  }

  async function simulateStatus(message: PublicMessage, status: "delivered" | "failed") {
    if (!message.providerMessageId) {
      return;
    }
    await fetch("/api/dev/sms/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "status",
        providerMessageId: message.providerMessageId,
        phone: message.phone,
        status,
      }),
    });
    await load();
  }

  async function simulateReply() {
    const phone = replyPhone || parsed.valid[0] || EXAMPLE_PHONE;
    await fetch("/api/dev/sms/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "inbound",
        phone,
        body: replyBody,
      }),
    });
    setTab("inbox");
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-[var(--muted)] uppercase">
            Direct to number
          </p>
          <h1
            className="mt-2 text-4xl leading-none text-[var(--ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Send SMS
          </h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
            Paste Ethiopian mobiles, write a message or announcement, and watch
            each number leave the app.
          </p>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-sm">
          Sending via{" "}
          <span className="font-semibold text-[var(--accent)]">
            {provider === "afromessage"
              ? "AfroMessage"
              : provider === "geezsms"
                ? "GeezSMS"
                : "Mock"}
          </span>
        </div>
      </header>

      {provider === "mock" ? (
        <p className="mb-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
          Mock mode — add <code className="text-[var(--ink)]">AFROMESSAGE_TOKEN</code> in
          <code className="text-[var(--ink)]"> apps/web/.env</code> to deliver to a real
          phone.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_20px_50px_-32px_rgba(28,25,20,0.45)] md:p-7">
          <div className="mb-5 flex gap-2">
            {(["message", "announcement"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={`rounded-full px-4 py-2 text-sm capitalize transition ${
                  kind === value
                    ? "bg-[var(--ink)] text-white"
                    : "bg-[var(--bg)] text-[var(--muted)]"
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium">Phone numbers</label>
          <textarea
            value={phonesInput}
            onChange={(event) => setPhonesInput(event.target.value)}
            placeholder={"0911 234 567\n+251911234567"}
            className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPhonesInput((current) =>
                  current.includes(EXAMPLE_PHONE)
                    ? current
                    : [current.trim(), EXAMPLE_PHONE].filter(Boolean).join("\n"),
                )
              }
              className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]"
            >
              Add example {EXAMPLE_PHONE}
            </button>
            {parsed.valid.map((phone) => (
              <span
                key={phone}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
              >
                {phone}
              </span>
            ))}
            {parsed.invalid.map((phone) => (
              <span key={phone} className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-800">
                Invalid: {phone}
              </span>
            ))}
          </div>

          <label className="mt-5 block text-sm font-medium">
            {kind === "announcement" ? "Announcement" : "Message"}
          </label>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={
              kind === "announcement"
                ? "School will close at 12:00 tomorrow."
                : "Dear parent, please call the office."
            }
            className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <p className="mt-2 text-xs text-[var(--muted)]">
            {segments.characters} chars · {segments.segments || 0} SMS ·{" "}
            {segments.encoding === "unicode" ? "Unicode / Amharic" : "Latin"} ·{" "}
            {segments.remainingInSegment} left in this part
          </p>

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || parsed.valid.length === 0 || body.trim().length === 0}
            className="mt-5 w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending
              ? "Sending…"
              : `Send ${kind} to ${parsed.valid.length || 0} number${parsed.valid.length === 1 ? "" : "s"}`}
          </button>
        </section>

        <section className="rounded-[28px] border border-[var(--line)] bg-[var(--card)] p-5 md:p-7">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setTab("outbox")}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === "outbox" ? "bg-[var(--ink)] text-white" : "bg-[var(--bg)] text-[var(--muted)]"
              }`}
            >
              Outbox ({outbound.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("inbox")}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === "inbox" ? "bg-[var(--ink)] text-white" : "bg-[var(--bg)] text-[var(--muted)]"
              }`}
            >
              Inbox ({inbound.length})
            </button>
          </div>

          <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
            {(tab === "outbox" ? outbound : inbound).length === 0 ? (
              <p className="rounded-2xl bg-[var(--bg)] px-4 py-8 text-center text-sm text-[var(--muted)]">
                {tab === "outbox"
                  ? "Nothing sent yet. Numbers you send will show here with live status."
                  : "No replies yet."}
              </p>
            ) : (
              (tab === "outbox" ? outbound : inbound).map((message) => (
                <article
                  key={message.id}
                  className="rounded-2xl border border-[var(--line)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{message.phone}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${statusTone(message.status)}`}
                    >
                      {message.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink)]">{message.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {message.kind} · {formatTime(message.createdAt)}
                    {message.error ? ` · ${message.error}` : ""}
                  </p>
                  {provider === "mock" &&
                  tab === "outbox" &&
                  message.providerMessageId &&
                  message.status !== "delivered" &&
                  message.status !== "failed" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void simulateStatus(message, "delivered")}
                        className="rounded-full bg-emerald-700 px-3 py-1 text-xs text-white"
                      >
                        Mark delivered
                      </button>
                      <button
                        type="button"
                        onClick={() => void simulateStatus(message, "failed")}
                        className="rounded-full bg-red-700 px-3 py-1 text-xs text-white"
                      >
                        Mark failed
                      </button>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {provider === "mock" ? (
        <section className="mt-6 rounded-[28px] border border-dashed border-[var(--line)] bg-[var(--card)] p-5 md:p-7">
          <h2
            className="text-2xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simulate a reply
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Use this while you are in mock mode. A real parent reply needs a short
            code from your SMS provider.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr_auto]">
            <input
              value={replyPhone}
              onChange={(event) => setReplyPhone(event.target.value)}
              placeholder="Parent phone"
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
            />
            <input
              value={replyBody}
              onChange={(event) => setReplyBody(event.target.value)}
              placeholder="Reply text"
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none ring-[var(--accent)] focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void simulateReply()}
              className="rounded-full bg-[var(--accent-2)] px-5 py-3 text-sm font-semibold text-white"
            >
              Drop into inbox
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
