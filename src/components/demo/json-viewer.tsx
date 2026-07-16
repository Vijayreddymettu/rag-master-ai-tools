import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function JsonViewer({ title, data }: { title?: string; data: unknown }) {
  return (
    <Card className="shadow-sm">
      {title && (
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
