"use client";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "./ModeToggle";
import { Navigation } from "./Navigation/index";

export const Sidebar: React.FC = () => {
    const [open, setOpen] = useState(false);
    
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="fixed top-4 left-4 z-50 rounded-full w-10 h-10 bg-background/80 backdrop-blur-sm shadow-md hover:bg-secondary/80 transition-all"
                    aria-label="メニューを開く"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent 
                side="left" 
                className="flex flex-col border-r p-0 w-[280px] sm:w-[320px]"
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold">O</span>
                        </div>
                        <SheetTitle className="text-xl">Omoroi AI</SheetTitle>
                    </Link>
                </div>
                
                <div className="flex-1 overflow-y-auto py-2">
                    <Navigation closeMenu={() => setOpen(false)} />
                </div>
                
                <div className="border-t p-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Firebug
                    </div>
                    <ModeToggle />
                </div>
            </SheetContent>
        </Sheet>
    )
}