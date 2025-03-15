"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import React from 'react';

import { tw } from '@/lib/tailwindcss';

// 型定義を修正
interface Props {
  children: ReactNode;
  onClick?: () => void;
  href: string;
}

export const NavigationLink: React.FC<Props> = ({ href, children, onClick, ...props }) => {
    const pathname = usePathname();
    const isActive = href === pathname || pathname.startsWith(`${href}/`); // テンプレートリテラルを使用

    return (
        <Link
            className={tw(
                'flex items-center gap-2 rounded-md py-2 px-3 text-sm transition-colors',
                isActive 
                    ? 'bg-secondary font-medium text-secondary-foreground' 
                    : 'text-foreground/70 hover:bg-secondary/50 hover:text-foreground',
            )}
            href={href as any} // 一時的に型キャストを使用
            onClick={onClick}
            {...props}
        >
            {children}
        </Link>
    );
};