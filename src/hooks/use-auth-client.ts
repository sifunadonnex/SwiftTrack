
"use client";

import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Using simplified types with any for diagnostics
interface SimplifiedAuthContextType {
  user: any;
  role: any;
  loading: boolean;
  isManuallyCheckingRole: boolean;
}

const defaultAuthContextValue: SimplifiedAuthContextType = {
  user: null,
  role: null,
  loading: true, 
  isManuallyCheckingRole: false,
};

// The AuthContext is initialized here.
const AuthContext = createContext<SimplifiedAuthContextType>(defaultAuthContextValue);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Drastically simplified for diagnostics:
  // No useState, useEffect, or Firebase logic.
  // Providing a hardcoded, simple value.
  const diagnosticContextValue: SimplifiedAuthContextType = {
    user: null, 
    role: null, 
    loading: false, 
    isManuallyCheckingRole: false,
  };

  const Provider = AuthContext.Provider; // Alias the Provider

  // The problematic line according to the error messages
  return (
    <Provider  value={diagnosticContextValue}>
      {children}
    </Provider>
  );
};

export const useAuthClient = (): SimplifiedAuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthClient must be used within an AuthProvider or AuthContext is misconfigured');
  }
  return context;
};

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: any | any[]; 
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
