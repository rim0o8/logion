import { Sidebar } from "@/components/layout/Sidebar";
import { Suspense } from "react";

import type { Metadata } from "next";

import { Inter } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLMアプリケーション",
  description: "LLM-powered application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={cn(inter.className, "min-h-screen bg-background")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative min-h-screen">
            <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                <h1 className="font-bold">LLMアプリケーション</h1>
              </div>
            </header>
            
            <div className="fixed top-4 left-4 z-50">
              <Sidebar />
            </div>
            
            <main className="container mx-auto pt-4 pb-10">
              <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="animate-pulse">Loading...</div></div>}>
                {children}
              </Suspense>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
