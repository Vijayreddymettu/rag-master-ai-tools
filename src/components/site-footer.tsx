import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <Link href="/" className="font-semibold tracking-tight">
            RAG Master
          </Link>
          <Link href="/demo" className="text-muted-foreground hover:text-foreground">
            API Demo
          </Link>
        </div>

        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          RAG Master AI Tools — hybrid retrieval (semantic + keyword search, re-ranked)
          grounded generation over your own documents. The public demo runs on a shared,
          rate-limited key; production access issues each customer their own.
        </p>
      </div>
    </footer>
  );
}
