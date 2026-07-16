import type { Metadata } from "next";

import { DemoDashboard } from "@/components/demo/dashboard-client";

export const metadata: Metadata = {
  title: "Demo Dashboard — RAG Master AI Tools",
  description: "Index your own text and ask questions against it with real hybrid retrieval.",
};

export default function DemoPage() {
  return <DemoDashboard />;
}
