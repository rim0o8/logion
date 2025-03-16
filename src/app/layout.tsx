import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProviders } from './auth/providers';
import "./globals.css";

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
    <html lang="ja" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-background")}>
        <AuthProviders>
          {children}
        </AuthProviders>
      </body>
    </html>
  );
}
