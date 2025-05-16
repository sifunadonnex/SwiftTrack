"use client";

import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/config/firebase';
import type { UserRole, AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  isManuallyCheckingRole: boolean; // New state to track manual role check
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManuallyCheckingRole, setIsManuallyCheckingRole] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsManuallyCheckingRole(true); // Start manual check
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh token
          const userRole = (tokenResult.claims.role as UserRole) || 'employee'; // Default to employee if no role
          setUser({ ...firebaseUser, role: userRole } as AppUser);
          setRole(userRole);
        } catch (error) {
          console.error("Error fetching user token or role:", error);
          // Handle error, maybe sign out user or set a default role
          setUser(firebaseUser as AppUser); // Set user without role if token fails
          setRole('employee'); // Fallback role
        } finally {
          setIsManuallyCheckingRole(false); // End manual check
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, isManuallyCheckingRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthClient = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthClient must be used within an AuthProvider');
  }
  return context;
};


interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // Allow single role or array of roles
  fallbackPath?: string;
}

export const ProtectedRoute = ({ children, requiredRole, fallbackPath = '/login' }: ProtectedRouteProps) => {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || isManuallyCheckingRole) return; // Don't redirect while loading or manually checking role

    if (!user) {
      if (pathname !== fallbackPath) {
         router.push(`${fallbackPath}?redirect=${pathname}`);
      }
      return;
    }

    if (requiredRole) {
      const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!role || !rolesArray.includes(role)) {
        // If user is logged in but doesn't have the required role, redirect to a sensible page
        // For example, if an employee tries to access a manager page, redirect to employee dashboard
        // Or, a generic "access denied" page if you have one.
        // For now, redirecting to their respective dashboards or home if role is unknown.
        const homePath = role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';
        if (pathname !== homePath) {
          router.push(homePath);
        }
      }
    }
  }, [user, role, loading, isManuallyCheckingRole, requiredRole, router, pathname, fallbackPath]);

  if (loading || isManuallyCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // Final check to ensure user exists and has the required role before rendering children
  if (!user) {
     // This case should ideally be handled by the useEffect redirect, but as a fallback:
    return null; // Or a loading/redirecting indicator
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !rolesArray.includes(role)) {
      // This case also should be handled by useEffect, fallback:
      return null; // Or an access denied message / redirect indicator
    }
  }

  return <>{children}</>;
};

// Re-export AuthProvider to be used in layout.tsx
export { AuthProvider as ClientAuthProvider } from '@/hooks/use-auth-client';
