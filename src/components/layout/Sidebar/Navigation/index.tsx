"use client";

import { SectionItem } from "@/components/layout/Sidebar/SectionItem";
import { routes } from './routes';

interface NavigationProps {
    closeMenu?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ closeMenu }) => {
    return (
        <nav className="no-scrollbar overflow-y-auto px-2">
            <ul className="grid gap-1">
                {routes.map((route) => (
                    <li key={route.title} className="mb-4">
                        <SectionItem 
                            items={route.items} 
                            title={route.title} 
                            closeMenu={closeMenu}
                        />
                    </li>
                ))}
            </ul>
        </nav>
    );
};