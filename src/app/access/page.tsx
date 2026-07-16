"use client";

import { Loader2, Lock } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function AccessForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const autoKey = searchParams.get("key");

  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(value: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  // One-click links (e.g. for a resume) carry ?key=... and skip straight past
  // the form — this only needs to fire once, on whatever key was in the URL
  // at load time, so it deliberately ignores later changes.
  //
  // Doesn't call the shared attempt() here on purpose: attempt() sets loading
  // synchronously before its first await, which the linter's set-state-in-effect
  // check flags (and — unlike the exhaustive-deps warning — doesn't appear to
  // honor a disable comment for, so silencing it isn't an option here). Instead
  // the render below already shows a loading state whenever autoKey is present
  // and no error has happened yet, so this effect only needs to set state in
  // its genuinely-async error callback, not synchronously up front.
  useEffect(() => {
    if (!autoKey) return;
    let cancelled = false;

    fetch("/api/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ passphrase: autoKey }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok && data.ok, error: data.error })))
      .then(({ ok, error: message }) => {
        if (cancelled) return;
        if (ok) {
          window.location.href = next;
        } else {
          setError(message ?? "Something went wrong.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Network error — couldn't reach the site.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    attempt(passphrase);
  }

  // Auto-submitting via a one-click link: show a clean "signing you in" state
  // instead of flashing the passphrase form first.
  if (autoKey && !error) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24">
        <Card className="w-full shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Signing you in…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-24">
      <Card className="w-full shadow-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid size-10 place-items-center rounded-lg border bg-muted/60">
            <Lock className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">This site is private</CardTitle>
          <CardDescription>Enter the passphrase you were given to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Passphrase"
              aria-label="Passphrase"
              autoFocus
            />
            <Button type="submit" disabled={!passphrase.trim() || loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              {loading ? "Checking…" : "Enter"}
            </Button>
            {error && <p className="text-center text-xs text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccessPage() {
  return (
    <Suspense>
      <AccessForm />
    </Suspense>
  );
}
