
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/config/firebase';
import type { AppUser, UserRole } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  isManuallyCheckingRole: boolean; // True when explicitly fetching/waiting for role after auth change
}

const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
  isManuallyCheckingRole: false,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManuallyCheckingRole, setIsManuallyCheckingRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true); // Start loading on any auth state change
      setIsManuallyCheckingRole(true); // Indicate we're about to check/fetch role

      if (firebaseUser) {
        try {
          // Force refresh token to get latest custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult(true);
          const userRole = (idTokenResult.claims.role as UserRole) || 'employee'; // Default to 'employee' if no role claim

          setUser({ ...firebaseUser, role: userRole });
          setRole(userRole);
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          // Fallback if claims fetching fails
          setUser({ ...firebaseUser, role: 'employee' }); // Assign a default role
          setRole('employee');
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsManuallyCheckingRole(false); // Done with role checking
      setLoading(false); // Finish loading
    });

    return () => unsubscribe();
  }, []);

  const authContextValue: AuthContextType = {
    user,
    role,
    loading,
    isManuallyCheckingRole,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthClient = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthClient must be used within an AuthProvider');
  }
  return context;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();
  const pathname = usePathname();

  if (loading || isManuallyCheckingRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    // User not logged in, redirect to login
    // Pass the current path as a redirect query param
    router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    return null; // Render nothing while redirecting
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !rolesArray.includes(role)) {
      // User does not have the required role, redirect to their default dashboard or an unauthorized page
      // For simplicity, redirecting to their likely default dashboard or home
      console.warn(`User with role '${role}' tried to access a route requiring '${requiredRole}'. Redirecting.`);
      if (role === 'manager') {
        router.replace('/manager/dashboard');
      } else {
        router.replace('/employee/dashboard');
      }
      return null; // Render nothing while redirecting
    }
  }

  return <>{children}</>;
};
