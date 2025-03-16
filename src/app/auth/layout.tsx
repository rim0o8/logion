'use client';

import { SessionProvider } from 'next-auth/react';
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="max-w-md w-full">
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
