
"use client";

import type { ReactNode } from 'react';
// import { createContext, useContext, useEffect, useState } from 'react';
// import { useRouter, usePathname } from 'next/navigation';
// import { onAuthStateChanged, type User as FirebaseUser, getIdTokenResult } from 'firebase/auth';
// import { auth, db } from '@/config/firebase';
// import { doc, getDoc } from 'firebase/firestore';
// import { Loader2 } from 'lucide-react';
// import type { AppUser, UserRole } from '@/lib/types';

// interface AuthContextType {
//   user: AppUser | null;
//   role: UserRole | null;
//   loading: boolean;
//   isManuallyCheckingRole: boolean; // Added to track manual role check
// }

// const defaultAuthContextValue: AuthContextType = {
//   user: null,
//   role: null,
//   loading: true,
//   isManuallyCheckingRole: false,
// };

// const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // This is the diagnostic version of AuthProvider, returning a simple div.
  return (
    <div>
      {children}
    </div>
  );
};

// export const useAuthClient = (): AuthContextType => {
//   const context = useContext(AuthContext);
//   if (context === defaultAuthContextValue) {
//     // This console.warn can be helpful for debugging issues where context might not be properly provided
//     // or when a component using this hook renders outside of an AuthProvider.
//     console.warn('useAuthClient used outside of a properly initialized AuthProvider or with default diagnostic value. Returning default diagnostic value.');
//   }
//   return context;
// };

// interface ProtectedRouteProps {
//   children: ReactNode;
//   requiredRole?: UserRole | UserRole[]; // Can be a single role or an array of roles
//   fallbackPath?: string;
// }

// export const ProtectedRoute = ({ children, requiredRole, fallbackPath = '/login' }: ProtectedRouteProps) => {
//   const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
//   const router = useRouter();
//   const pathname = usePathname();

//   useEffect(() => {
//     if (loading || isManuallyCheckingRole) return; // Wait until loading and manual role check are complete

//     if (!user) {
//       // If not logged in, redirect to fallbackPath (login page)
//       // Include current path as redirect query param
//       if (pathname !== fallbackPath) {
//          router.push(`${fallbackPath}?redirect=${pathname}`);
//       }
//       return;
//     }

//     // If user is logged in, check role if requiredRole is specified
//     if (requiredRole) {
//       const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
//       if (!role || !rolesArray.includes(role)) {
//         // If role doesn't match, redirect to a default page or show an unauthorized message
//         // For SwiftTrack, a sensible default might be the employee dashboard if role is simply 'employee'
//         // or if manager tries to access a super-admin page (if that existed).
//         // For now, let's redirect to a generic home/dashboard if role mismatch.
//         const homePath = role === 'manager' ? '/manager/dashboard' : '/employee/dashboard'; // or a dedicated unauthorized page
//         if (pathname !== homePath) {
//           router.push(homePath);
//         }
//       }
//     }
//     // If no requiredRole or if role matches, user can access the page.
//   }, [user, role, loading, isManuallyCheckingRole, requiredRole, router, pathname, fallbackPath]);

//   if (loading || isManuallyCheckingRole) {
//     // Show a loading spinner while checking auth state or role
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-background">
//         <Loader2 className="h-12 w-12 animate-spin text-primary" />
//       </div>
//     );
//   }

//   if (!user && pathname !== fallbackPath) {
//      // While redirecting, don't render children to avoid flashes of content
//      // This should ideally be handled by the redirect itself, but as a safeguard.
//      return null; // Or a minimal loading state
//   }

//   // Render children if user is authenticated and (if required) has the correct role
//   return <>{children}</>;
// };
