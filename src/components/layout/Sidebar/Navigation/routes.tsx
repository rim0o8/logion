import type { LucideIcon } from 'lucide-react';
import { Bot } from 'lucide-react';

// 単純化した型定義
interface RouteItem {
    label: string;
    icon: LucideIcon;
    href: string;
}

interface RouteSection {
    title: string;
    items: RouteItem[];
}

// 相対パスを使用するように変更
export const routes: RouteSection[] = [
    {
        title: 'メインメニュー',
        items: [
            {
                label: 'ホーム',
                icon: Bot,
                href: '/',
            },
            {
                label: 'チャット',
                icon: Bot,
                href: '/chat',
            },
            {
                label: '詳細情報',
                icon: Bot,
                href: '/about',
            }
        ]
    },
    {
        title: 'ヘルプ',
        items: [
            {
                label: '使い方ガイド',
                icon: Bot,
                href: '/help/guide',
            },
            {
                label: 'よくある質問',
                icon: Bot,
                href: '/help/faq',
            },
            {
                label: 'お問い合わせ',
                icon: Bot,
                href: '/help/contact',
            }
        ]
    }
] as const;