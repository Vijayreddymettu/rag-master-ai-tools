import { Search, Sparkles, Type } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/components/demo/json-viewer";

interface Source {
  chunkId: string;
  docId: string;
  text: string;
  score: number;
  foundVia: string[];
}

const METHOD_LABEL: Record<string, string> = {
  semantic: "semantic match",
  keyword: "keyword match",
};

export function AnswerViewer({ answer, sources, raw }: { answer: string; sources: Source[]; raw: unknown }) {
  return (
    <div className="space-y-3">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Answer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{answer}</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">Data lineage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <LineageStep icon={Type} label="your pasted/uploaded text" />
            <span aria-hidden>→</span>
            <LineageStep icon={Search} label="hybrid retrieval (semantic + keyword)" />
            <span aria-hidden>→</span>
            <LineageStep icon={Sparkles} label="answer generated only from the sources below" />
          </div>

          <p className="text-xs text-muted-foreground">
            Every source here traces back to text <strong className="text-foreground">you</strong>{" "}
            provided in this session — there&rsquo;s no external knowledge base or pre-loaded dataset
            behind this demo. If it&rsquo;s not in what you pasted, it&rsquo;s not in the answer.
          </p>

          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li key={s.chunkId} className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                  <span className="font-mono">
                    [{i + 1}] {s.docId} · {s.chunkId}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {s.foundVia.map((method) => (
                      <Badge key={method} variant="outline" className="font-mono text-[10px]">
                        {METHOD_LABEL[method] ?? method}
                      </Badge>
                    ))}
                    <span className="font-mono">score {s.score.toFixed(4)}</span>
                  </span>
                </div>
                <p className="text-foreground/80">{s.text}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <details className="group rounded-xl border bg-card shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium select-none">
          Raw response JSON
        </summary>
        <div className="border-t p-4 pt-0">
          <JsonViewer title="" data={raw} />
        </div>
      </details>
    </div>
  );
}

function LineageStep({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-1">
      <Icon className="size-3" />
      {label}
    </span>
  );
}
