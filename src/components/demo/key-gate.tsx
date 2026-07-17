"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function KeyGate({ onKey }: { onKey: (key: string, expiresAt: number) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/key", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get a demo key.");
      onKey(data.key, data.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-5 py-20">
      <Card className="w-full shadow-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 grid size-10 place-items-center rounded-lg border bg-muted/60">
            <KeyRound className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Get your demo key</CardTitle>
          <CardDescription>
            A temporary key scoped to this browser tab — no signup, nothing permanent. Runs
            on our shared API key while you evaluate, good for 3 questions; production
            access will use your own.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button onClick={generate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            {loading ? "Generating…" : "Generate demo key"}
          </Button>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
