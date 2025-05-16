import type React from 'react';
import { Car } from 'lucide-react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  description: string;
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Car className="h-12 w-12 text-primary mb-3" />
          <h1 className="text-3xl font-bold text-primary">SwiftTrack</h1>
          <p className="text-muted-foreground mt-1">Mileage & Trip Logging Made Easy</p>
        </div>
        
        <div className="rounded-xl border bg-card p-6 shadow-lg md:p-8">
            <h2 className="text-2xl font-semibold tracking-tight text-center mb-2 text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{description}</p>
            {children}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SwiftTrack. All rights reserved.
        </p>
      </div>
    </div>
  );
}
