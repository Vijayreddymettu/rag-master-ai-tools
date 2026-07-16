"use client";

import { Loader2, Lock } from "lucide-react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function AccessForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Something went wrong.");
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
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
