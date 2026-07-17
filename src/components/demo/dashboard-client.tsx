"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileUp,
  Play,
  RotateCcw,
  ScrollText,
  Timer,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { AnswerViewer } from "@/components/demo/answer-viewer";
import { KeyGate } from "@/components/demo/key-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearDemoSession,
  getDemoSessionServerSnapshot,
  getDemoSessionSnapshot,
  parseDemoSession,
  subscribeDemoSession,
  writeDemoSession,
} from "@/lib/demo-session-store";

const ASK_TRIES_LIMIT = 3; // keep in sync with CALLS_PER_WINDOW in src/app/api/demo/ask/route.ts

interface AskResponse {
  ok: boolean;
  status: number;
  latencyMs: number;
  data?: { answer: string; sources: { chunkId: string; docId: string; text: string; score: number; foundVia: string[] }[] };
  error?: string;
  triesRemaining?: number;
}

interface LogEntry {
  id: string;
  action: "index" | "ask";
  summary: string;
  status: number;
  latencyMs: number;
  at: number;
}

async function callDemoApi<T>(path: string, key: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function DemoDashboard() {
  const rawSession = useSyncExternalStore(
    subscribeDemoSession,
    getDemoSessionSnapshot,
    getDemoSessionServerSnapshot,
  );
  const session = parseDemoSession(rawSession);

  const [docText, setDocText] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [totalChunks, setTotalChunks] = useState(0);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [triesRemaining, setTriesRemaining] = useState<number | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleKey(key: string, expiresAt: number) {
    writeDemoSession({ key, expiresAt });
  }

  // Recover "how much is indexed" after a refresh — the rows persist server-side
  // across page loads, only Reset Session actually deletes them.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetch("/api/demo/status", { headers: { authorization: `Bearer ${session.key}` } })
      .then((res) => res.json())
      .then((data: { chunksIndexed?: number }) => {
        if (!cancelled && typeof data.chunksIndexed === "number") setTotalChunks(data.chunksIndexed);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // `session` is a fresh object every render (parsed from the sync-store
    // snapshot each time); depending on it directly would refetch on every
    // render. `session.key` is the stable primitive that actually identifies
    // "did the session change".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.key]);

  async function resetSession() {
    if (session) {
      try {
        await callDemoApi("/api/demo/reset", session.key, {});
      } catch {
        // best-effort — the key expires on its own either way
      }
    }
    clearDemoSession();
    setDocText("");
    setIndexStatus(null);
    setTotalChunks(0);
    setQuestion("");
    setAskResult(null);
    setTriesRemaining(null);
    setLogs([]);
    setShowLogs(false);
  }

  async function runIndex() {
    if (!session || !docText.trim() || indexing) return;
    setIndexing(true);
    setIndexStatus(null);
    try {
      const data = await callDemoApi<{ ok: boolean; status: number; latencyMs: number; data?: { chunksIndexed: number }; error?: string }>(
        "/api/demo/index",
        session.key,
        { text: docText },
      );
      if (data.ok && data.data) {
        setTotalChunks((n) => n + data.data!.chunksIndexed);
        setIndexStatus({ ok: true, message: `Indexed ${data.data.chunksIndexed} chunks in ${data.latencyMs}ms.` });
        setDocText("");
      } else {
        setIndexStatus({ ok: false, message: data.error ?? "Indexing failed." });
      }
      setLogs((prev) => [
        { id: crypto.randomUUID(), action: "index" as const, summary: data.ok ? `+${data.data?.chunksIndexed ?? 0} chunks` : (data.error ?? "error"), status: data.status, latencyMs: data.latencyMs, at: Date.now() },
        ...prev,
      ].slice(0, 30));
    } catch {
      setIndexStatus({ ok: false, message: "Network error — couldn't reach the demo API." });
    } finally {
      setIndexing(false);
    }
  }

  async function runAsk() {
    if (!session || !question.trim() || asking) return;
    setAsking(true);
    try {
      const data = await callDemoApi<AskResponse>("/api/demo/ask", session.key, { question });
      setAskResult(data);
      if (typeof data.triesRemaining === "number") setTriesRemaining(data.triesRemaining);
      setLogs((prev) => [
        { id: crypto.randomUUID(), action: "ask" as const, summary: question, status: data.status, latencyMs: data.latencyMs, at: Date.now() },
        ...prev,
      ].slice(0, 30));
      if (data.status === 401) resetSession();
    } catch {
      setAskResult({ ok: false, status: 0, latencyMs: 0, error: "Network error — couldn't reach the demo API." });
    } finally {
      setAsking(false);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDocText(String(reader.result ?? ""));
    reader.readAsText(file);
    e.target.value = "";
  }

  if (!session) return <KeyGate onKey={handleKey} />;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">RAG Master Demo Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste your own text, index it, then ask questions against it — real hybrid
            retrieval, real generation.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 font-mono">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          demo key active · expires {new Date(session.expiresAt).toLocaleTimeString()}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* ---- main panel ---- */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Your data</CardTitle>
              <CardDescription>
                This is the only source of information the demo has — no external knowledge base,
                no pre-loaded dataset. Answers below are traceable back to exactly what you paste here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <textarea
                value={docText}
                onChange={(e) => setDocText(e.target.value)}
                placeholder="Paste some text — docs, notes, a policy, anything you want to ask questions about…"
                aria-label="Document text"
                rows={6}
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={runIndex} disabled={!docText.trim() || indexing}>
                  <Upload className="size-3.5" />
                  {indexing ? "Indexing…" : "Index Data"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <FileUp className="size-3.5" /> Upload .txt/.md
                </Button>
                {totalChunks > 0 && (
                  <span className="text-xs text-muted-foreground">{totalChunks} chunks indexed this session</span>
                )}
              </div>
              {indexStatus && (
                <p className={"text-xs " + (indexStatus.ok ? "text-emerald-700 dark:text-emerald-500" : "text-destructive")}>
                  {indexStatus.message}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Ask a question</CardTitle>
              <CardDescription>
                <strong className="font-bold underline">
                  {`Each demo key gets ${ASK_TRIES_LIMIT} tries at this — it's what actually calls the API.`}
                  {triesRemaining !== null && ` ${triesRemaining} of ${ASK_TRIES_LIMIT} left.`}
                </strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAsk();
                }}
                className="flex gap-2"
              >
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask something about the data you indexed above…"
                  aria-label="Question"
                  className="h-10"
                />
                <Button type="submit" disabled={!question.trim() || asking || totalChunks === 0 || triesRemaining === 0}>
                  {asking ? "Running…" : "Run API"}
                </Button>
              </form>
              {totalChunks === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">Index some data above first.</p>
              )}
              {triesRemaining === 0 && (
                <p className="mt-2 text-xs text-destructive">
                  Out of tries for this demo key — Reset Session for a new key and {ASK_TRIES_LIMIT} more.
                </p>
              )}
            </CardContent>
          </Card>

          {askResult && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs shadow-sm">
              <MetricChip
                icon={askResult.ok ? CheckCircle2 : AlertTriangle}
                label="status"
                value={String(askResult.status)}
                tone={askResult.ok ? "ok" : "error"}
              />
              <MetricChip icon={Timer} label="latency" value={`${askResult.latencyMs}ms`} />
              <MetricChip
                icon={AlertTriangle}
                label="error"
                value={askResult.error ? askResult.error : "none"}
                tone={askResult.error ? "error" : undefined}
              />
            </div>
          )}

          {askResult?.ok && askResult.data ? (
            <AnswerViewer answer={askResult.data.answer} sources={askResult.data.sources} raw={askResult} />
          ) : (
            !askResult && (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Ask a question to see a live, grounded answer here.
              </div>
            )
          )}

          {showLogs && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm">Session logs</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No calls yet this session.</p>
                ) : (
                  <ul className="divide-y">
                    {logs.map((log) => (
                      <li key={log.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                        <span className="flex items-center gap-2 truncate">
                          <Badge variant="secondary" className="shrink-0">{log.action}</Badge>
                          <span className="truncate font-mono">{log.summary}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                          <span>{log.status}</span>
                          <span>{log.latencyMs}ms</span>
                          <span>{new Date(log.at).toLocaleTimeString()}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ---- sidebar: quick actions ---- */}
        <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={runAsk}
                disabled={!question.trim() || asking || totalChunks === 0 || triesRemaining === 0}
              >
                <Play className="size-3.5" /> Run API
                {triesRemaining !== null && (
                  <Badge variant="secondary" className="ml-auto">
                    {triesRemaining}/{ASK_TRIES_LIMIT}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setShowLogs((v) => !v)}>
                <ScrollText className="size-3.5" /> View Logs
                {logs.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {logs.length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" className="justify-start" onClick={resetSession}>
                <RotateCcw className="size-3.5" /> Reset Session
              </Button>
            </CardContent>
          </Card>

          <div className="rounded-xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
            Running on the shared demo key, capped at {ASK_TRIES_LIMIT} questions per key to
            keep it fair for everyone trying the demo. Production access will ask you for
            your own API key instead of this temporary, limited one.
          </div>
        </aside>
      </div>
    </div>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "ok" | "error";
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono " +
        (tone === "error"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : tone === "ok"
            ? "border-emerald-600/30 bg-emerald-600/5 text-emerald-700 dark:text-emerald-500"
            : "text-muted-foreground")
      }
    >
      <Icon className="size-3" />
      {label}: {value}
    </span>
  );
}
