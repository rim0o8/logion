import GoogleAnalytics from "@/lib/analytics";
import { cn } from "@/lib/utils";
import VercelAnalytics from "@/lib/vercel-analytics";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProviders } from './auth/providers';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Logion - あなたに最適なAIを、必要な分だけ",
  description: "複数のプロバイダから最新のAIモデルを選んで、従量課金で利用できます。GPT-4o、Claude、DeepSeekなど、用途に合わせて最適なモデルを選択可能です。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={cn(inter.className, "min-h-screen bg-background flex flex-col")}>
        <GoogleAnalytics />
        <VercelAnalytics />
        <AuthProviders>
          <div className="flex-grow">
            {children}
          </div>
        </AuthProviders>
      </body>
    </html>
  );
}
