"use client";

import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetTrigger
} from "@/components/ui/sheet";

import { Menu } from "lucide-react";
import { useState } from "react";
import { ConversationList } from "./ConversationList";
import { ModeToggle } from "./ModeToggle";

export const Sidebar: React.FC = () => {
    const [open, setOpen] = useState(false);
    
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full w-10 h-10 bg-background/80 backdrop-blur-sm shadow-md hover:bg-secondary/80 transition-all"
                    aria-label="メニューを開く"
                >
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent 
                side="left" 
                className="flex flex-col border-r p-0 w-[280px] sm:w-[320px] z-[100]"
                onEscapeKeyDown={() => setOpen(false)}
                onCloseAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-primary-foreground font-bold">L</span>
                        </div>
                        <SheetTitle className="text-xl">LLMアプリ</SheetTitle>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full h-8 w-8"
                        onClick={() => setOpen(false)}
                    >
                        <span className="sr-only">閉じる</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto py-2">
                    <ConversationList closeMenu={() => setOpen(false)} />
                </div>
                
                <div className="border-t p-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        v1.0.0
                    </div>
                    <ModeToggle />
                </div>
            </SheetContent>
        </Sheet>
    )
}