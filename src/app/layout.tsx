import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";

/**
 * The variable MUST be named `--font-sans`: shadcn's theme maps its font tokens
 * to `var(--font-sans)`. With a mismatched name the variable resolves to
 * nothing and the whole site falls back to the browser's default serif.
 */
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG Master AI Tools",
  description:
    "Hybrid-retrieval RAG over your own documents — try the API live before you integrate it.",
};

/**
 * shadcn's tokens key dark mode off a `.dark` class, which nothing sets on its
 * own — so without this the site is permanently light regardless of the OS
 * setting. Runs before paint to avoid a flash of the wrong theme.
 */
const THEME_SCRIPT = `try{if(matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
