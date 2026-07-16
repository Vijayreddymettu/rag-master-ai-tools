import { Layers, Search, Sparkles } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: Layers,
    title: "Index your data",
    body: "Paste or upload text — it's chunked and embedded automatically.",
  },
  {
    icon: Search,
    title: "Hybrid retrieval",
    body: "Semantic vector search and keyword (BM25) search, fused together.",
  },
  {
    icon: Sparkles,
    title: "Grounded answers",
    body: "Ask a question, get an answer generated only from your own sources.",
  },
];

export default function Home() {
  return (
    <section className="relative overflow-hidden border-b bg-muted/50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.15] [mask-image:radial-gradient(ellipse_65%_55%_at_50%_45%,black,transparent)]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 py-20 text-center">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 font-mono text-xs shadow-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Live API demo
        </p>

        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          RAG Master AI Tools
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted-foreground">
          A hybrid-retrieval RAG pipeline — semantic search combined with keyword search,
          grounded generation over your own documents. Try it on your own text right now,
          no signup required.
        </p>

        <div className="mt-8 flex justify-center">
          <Link
            href="/demo"
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Start Demo
          </Link>
        </div>

        <div id="how-it-works" className="mx-auto mt-14 grid max-w-3xl scroll-mt-20 gap-4 text-left sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-lg border bg-muted/60">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <span className="font-mono text-xs text-muted-foreground/60">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-lg text-xs leading-relaxed text-muted-foreground">
          The public demo runs on our shared API key and is rate-limited per session.
          Production access will issue you your own key.
        </p>
      </div>
    </section>
  );
}
