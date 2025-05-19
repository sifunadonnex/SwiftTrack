
"use client";

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import type { AppUser, UserRole } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null; // Can be null initially or if no role found/error
  loading: boolean;
  isManuallyCheckingRole: boolean;
}

const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null, // Default to null, actual role type is 'employee' | 'manager'
  loading: true,
  isManuallyCheckingRole: true,
};

const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null); // Initialize as null
  const [loading, setLoading] = useState(true);
  const [isManuallyCheckingRole, setIsManuallyCheckingRole] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      setIsManuallyCheckingRole(true);
      setUser(null); // Reset user and role on auth change
      setRole(null);

      if (firebaseUser) {
        const appUser: AppUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          // FirebaseUser properties below are for type compatibility, not all are used directly
          isAnonymous: firebaseUser.isAnonymous,
          metadata: firebaseUser.metadata,
          providerData: firebaseUser.providerData,
          providerId: firebaseUser.providerId,
          tenantId: firebaseUser.tenantId,
          delete: () => firebaseUser.delete(),
          getIdToken: (forceRefresh) => firebaseUser.getIdToken(forceRefresh),
          getIdTokenResult: (forceRefresh) => firebaseUser.getIdTokenResult(forceRefresh),
          reload: () => firebaseUser.reload(),
          toJSON: () => firebaseUser.toJSON(),
        };
        setUser(appUser);

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const firestoreRole = docSnap.data()?.role as UserRole;
            // Ensure fetched role is one of the valid UserRole types
            if (firestoreRole === 'employee' || firestoreRole === 'manager') {
              setRole(firestoreRole);
            } else {
              console.warn(`Invalid role '${firestoreRole}' found in Firestore for UID: ${firebaseUser.uid}. Defaulting to 'employee'.`);
              setRole('employee');
            }
          } else {
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Defaulting to 'employee' role.`);
            setRole('employee');
          }
        } catch (error) {
          console.error("Error fetching user role from Firestore:", error);
          setRole('employee'); // Fallback role on error
        } finally {
          setIsManuallyCheckingRole(false);
          setLoading(false);
        }
      } else {
        // No Firebase user
        setIsManuallyCheckingRole(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
  if (context === undefined) { // Check for undefined, not defaultAuthContextValue
    throw new Error('useAuthClient must be used within an AuthProvider');
  }
  return context;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[]; // Role type is 'employee' | 'manager'
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || isManuallyCheckingRole) {
      return;
    }

    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (requiredRole && role) { // Ensure role is not null before checking
      const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!rolesArray.includes(role)) {
        console.warn(`User with role '${role}' tried to access '${pathname}' which requires '${requiredRole}'. Redirecting.`);
        if (role === 'manager') {
          router.replace('/manager/dashboard');
        } else {
          router.replace('/employee/dashboard');
        }
      }
    } else if (requiredRole && !role) {
      // Role is required but not yet determined (or null), might redirect to login or a safe page
      // This case should be less frequent if isManuallyCheckingRole is effective
      console.warn(`Role not determined for user accessing protected route '${pathname}'. Redirecting to login.`);
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
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
  
  if (!user) return null; 
  
  if (requiredRole && role) { // Check role again before rendering children
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!rolesArray.includes(role)) {
        return null; 
    }
  } else if (requiredRole && !role) {
    // If role is required but not available (and not loading), something is wrong or user has no role
    return null; // Or redirect, though useEffect should handle this
  }

  return <>{children}</>;
};
