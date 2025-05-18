
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthClient } from '@/hooks/use-auth-client';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();

  useEffect(() => {
    // Wait until loading is false AND isManuallyCheckingRole is false
    // This ensures we have the latest auth state and role information.
    if (loading || isManuallyCheckingRole) {
      return; // Still determining auth state or role, do nothing yet
    }

    if (user && role) { // Ensure both user and role are determined
      if (role === 'manager') {
        router.replace('/manager/dashboard');
      } else { // 'employee' or any other role defaults to employee dashboard
        router.replace('/employee/dashboard');
      }
    } else if (!user && !loading && !isManuallyCheckingRole) {
      // Explicitly check if not loading AND no user, then redirect to login
      router.replace('/login');
    }
    // If user exists but role is somehow null (should not happen with current AuthProvider logic),
    // it will loop or stay on '/' (blank page). The AuthProvider defaults role to 'employee'.
  }, [user, role, loading, isManuallyCheckingRole, router]);

  // Show a loading spinner while auth state is being determined or redirecting
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Loading SwiftTrack...</p>
    </div>
  );
}
