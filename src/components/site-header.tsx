import Link from "next/link";

const NAV = [{ href: "/#how-it-works", label: "How it works" }];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-6 place-items-center rounded-md bg-foreground font-mono text-[11px] font-bold text-background">
            R
          </span>
          <span>RAG Master</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/demo"
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Start Demo
          </Link>
        </div>
      </div>
    </header>
  );
}
