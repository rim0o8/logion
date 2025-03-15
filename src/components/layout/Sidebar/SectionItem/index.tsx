"use client";

import React from "react";

import { NavigationLink } from "../NavigationLink";

import type { LucideIcon } from "lucide-react";

interface ItemType {
    label: string;
    href: string; // 文字列型に変更
    icon: React.FC<{ className: string }> | LucideIcon;
}

interface Props {
    title: string;
    items: ItemType[];
    closeMenu?: () => void;
}

export const SectionItem: React.FC<Props> = ({ title, items, closeMenu }) => {
    return (
        <>
            <h5 className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</h5>
            <ul className="grid gap-1">
                {items.map((item) => (
                    <li className="overflow-hidden" key={item.label}>
                        <NavigationLink href={item.href} onClick={closeMenu}>
                            {item.icon && <item.icon className="size-5 mr-2 text-muted-foreground" />}
                            <p className="truncate">{item.label}</p>
                        </NavigationLink>
                    </li>
                ))}
            </ul>
        </>
    )
}