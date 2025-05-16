
"use client";

import { useState, useEffect, useContext, createContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/config/firebase';
import type { UserRole, AppUser } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  isManuallyCheckingRole: boolean;
}

// Define a default value for the context that matches AuthContextType
const defaultAuthContextValue: AuthContextType = {
  user: null,
  role: null,
  loading: true,
  isManuallyCheckingRole: false, // Set to an appropriate initial state
};

// Initialize context with the default value
const AuthContext = createContext<AuthContextType>(defaultAuthContextValue);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isManuallyCheckingRole, setIsManuallyCheckingRole] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsManuallyCheckingRole(true);
        try {
          const tokenResult = await firebaseUser.getIdTokenResult(true); // Force refresh
          const userRole = (tokenResult.claims.role as UserRole) || 'employee';
          setUser({ 
            uid: firebaseUser.uid, 
            displayName: firebaseUser.displayName, 
            email: firebaseUser.email, 
            photoURL: firebaseUser.photoURL,
            ...firebaseUser, 
            role: userRole 
          });
          setRole(userRole);
        } catch (error) {
          console.error("Error fetching user token or role:", error);
          setUser({ 
            uid: firebaseUser.uid, 
            displayName: firebaseUser.displayName, 
            email: firebaseUser.email, 
            photoURL: firebaseUser.photoURL,
             ...firebaseUser,
            role: 'employee' 
          });
          setRole('employee'); 
        } finally {
          setIsManuallyCheckingRole(false);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const authContextValue: AuthContextType = {
    user,
    role,
    loading,
    isManuallyCheckingRole
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthClient = () => {
  const context = useContext(AuthContext);
  // If context is used outside of AuthProvider, it will be defaultAuthContextValue.
  // The check for `undefined` was when createContext could be called with `undefined`.
  // Now, it will always be an object. The "loading" state in defaultAuthContextValue handles the initial state.
  if (context === undefined) { 
    // This condition should ideally not be met if createContext has a default value,
    // but kept as a safeguard or if useContext behaves unexpectedly.
    throw new Error('useAuthClient must be used within an AuthProvider or AuthContext is undefined');
  }
  return context;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole | UserRole[];
  fallbackPath?: string;
}

export const ProtectedRoute = ({ children, requiredRole, fallbackPath = '/login' }: ProtectedRouteProps) => {
  const { user, role, loading, isManuallyCheckingRole } = useAuthClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || isManuallyCheckingRole) return;

    if (!user) {
      if (pathname !== fallbackPath) {
         router.push(`${fallbackPath}?redirect=${pathname}`);
      }
      return;
    }

    if (requiredRole) {
      const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!role || !rolesArray.includes(role)) {
        const homePath = role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';
        if (pathname !== homePath) {
          router.push(homePath);
        }
      }
    }
  }, [user, role, loading, isManuallyCheckingRole, requiredRole, router, pathname, fallbackPath]);

  if (loading || isManuallyCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; 
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!role || !rolesArray.includes(role)) {
      return null;
    }
  }

  return <>{children}</>;
};
