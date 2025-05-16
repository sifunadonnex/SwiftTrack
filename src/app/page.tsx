"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthClient } from '@/hooks/use-auth-client';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();

  useEffect(() => {
    if (loading || isManuallyCheckingRole) {
      // Still waiting for auth state or role to be determined
      return;
    }

    if (user) {
      // User is logged in, redirect based on role
      if (role === 'manager') {
        router.replace('/manager/dashboard');
      } else {
        // Default to employee dashboard if role is 'employee' or not yet defined but user exists
        router.replace('/employee/dashboard');
      }
    } else {
      // User is not logged in, redirect to login page
      router.replace('/login');
    }
  }, [user, role, loading, isManuallyCheckingRole, router]);

  // Show a loading spinner while redirecting
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Loading SwiftTrack...</p>
    </div>
  );
}
