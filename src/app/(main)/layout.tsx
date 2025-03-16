'use client';

import { AdInitializer } from "@/components/ads/AdInitializer";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { Suspense } from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="relative min-h-screen">
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Sidebar />
              <h1 className="font-bold">LLMアプリケーション</h1>
            </div>
            <div className="flex-1" />
          </div>
        </header>

        <main className="container mx-auto pt-4 pb-10">
          <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)]"><div className="animate-pulse text-foreground">Loading...</div></div>}>
            {children}
          </Suspense>
        </main>

        {/* 広告初期化 */}
        <AdInitializer />
      </div>
    </ThemeProvider>
  );
} 