
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/config/firebase'; // Added db
import type { AppUser, UserRole } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore'; // Added Firestore imports

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  isManuallyCheckingRole: boolean; // Renamed for clarity, still indicates async role check
}

// Updated default value to be more explicit for consumers
const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
  isManuallyCheckingRole: true, // Start as true because role check is async
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManuallyCheckingRole, setIsManuallyCheckingRole] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      setIsManuallyCheckingRole(true);

      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          // role will be set from Firestore
        };
        setUser(appUser);

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            setRole((docSnap.data()?.role as UserRole) || 'employee');
          } else {
            // Document doesn't exist, perhaps a new user or data inconsistency
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Defaulting to 'employee' role.`);
            setRole('employee'); // Default role if document is missing
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setRole('employee'); // Fallback role on error
        } finally {
          setIsManuallyCheckingRole(false);
          setLoading(false); // Loading complete after auth check and role fetch attempt
        }
      } else {
        setUser(null);
        setRole(null);
        setIsManuallyCheckingRole(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const authContextValue = React.useMemo(() => ({
    user,
    role,
    loading,
    isManuallyCheckingRole,
  }), [user, role, loading, isManuallyCheckingRole]);

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

  useEffect(() => {
    if (loading || isManuallyCheckingRole) {
      return; // Still determining auth state or role, do nothing yet
    }

    if (!user) {
      // User not logged in, redirect to login
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return; // Important to return to prevent further execution in this effect
    }

    if (requiredRole) {
      const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!role || !rolesArray.includes(role)) {
        // User does not have the required role, redirect
        console.warn(`User with role '${role}' tried to access '${pathname}' which requires '${requiredRole}'. Redirecting.`);
        // Redirect to a sensible default based on their actual role, or a generic 'access-denied' page
        if (role === 'manager') {
          router.replace('/manager/dashboard');
        } else { // 'employee' or other
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
  
  // After loading and role check, if user is null (should be caught by useEffect redirect)
  if (!user) {
      return null; 
  }
  // If requiredRole is set, and current role doesn't match (should be caught by useEffect redirect)
  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !rolesArray.includes(role)) {
        return null; 
    }
  }

  return <>{children}</>;
};
