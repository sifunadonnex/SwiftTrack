
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
  isManuallyCheckingRole: boolean;
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
      setLoading(true);
      setIsManuallyCheckingRole(true);

      if (firebaseUser) {
        try {
          const idTokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh token
          const userRole = (idTokenResult.claims.role as UserRole) || 'employee';
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            // Add any other FirebaseUser properties you need
          } as AppUser); // Cast to AppUser
          setRole(userRole);

        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
          } as AppUser);
          setRole('employee'); // Fallback role
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setIsManuallyCheckingRole(false);
      setLoading(false);
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
    // This check should ideally happen only once when the context is created
    // or provide a default value that indicates an uninitialized state.
    // Throwing an error here might be too aggressive if context can be legitimately undefined during setup.
    // However, given the typical usage, this is a common pattern.
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

  useEffect(() => {
    if (loading || isManuallyCheckingRole) {
      return; // Still determining auth state, do nothing yet
    }

    if (!user) {
      // User not logged in, redirect to login
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole) {
      const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!role || !rolesArray.includes(role)) {
        // User does not have the required role, redirect
        console.warn(`User with role '${role}' tried to access '${pathname}' which requires '${requiredRole}'. Redirecting.`);
        if (role === 'manager') {
          router.replace('/manager/dashboard');
        } else {
          router.replace('/employee/dashboard');
        }
      }
    }
  }, [user, role, loading, isManuallyCheckingRole, router, pathname, requiredRole]);

  if (loading || isManuallyCheckingRole) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Authenticating...</p>
      </div>
    );
  }
  
  // Additional check after useEffect logic might have run, but before rendering children.
  // This handles cases where redirect logic inside useEffect has not yet unmounted the component.
  if (!user) {
      return null; // Render nothing if user is null (already being redirected)
  }
  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !rolesArray.includes(role)) {
        return null; // Render nothing if role mismatch (already being redirected)
    }
  }


  return <>{children}</>;
};
