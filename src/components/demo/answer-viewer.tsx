import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonViewer } from "@/components/demo/json-viewer";

interface Source {
  chunkId: string;
  docId: string;
  text: string;
  score: number;
}

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
          <CardTitle className="text-sm">Sources used</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sources.map((s, i) => (
              <li key={s.chunkId} className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="mb-1 flex items-center justify-between text-muted-foreground">
                  <span className="font-mono">
                    [{i + 1}] {s.docId} · {s.chunkId}
                  </span>
                  <span className="font-mono">score {s.score.toFixed(4)}</span>
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
