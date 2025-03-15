import { Sidebar } from "@/components/layout/Sidebar";
import { Suspense } from "react";

import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Omoroi AI",
  description: "LLM-powered workflow automation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={cn(inter.className, "min-h-screen bg-background")}>
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <h1 className="font-bold">LLMアプリケーション</h1>
          </div>
        </header>
        <main className="flex-1 flex mt-14">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="absolute top-0 left-0 m-4">
              <Sidebar />
            </div>
            <Suspense fallback={<div>Loading...</div>}>
              {children}
            </Suspense>
          </ThemeProvider>
        </main>
      </body>
    </html>
  );
}
