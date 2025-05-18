"use client";

import type { ReactNode } from 'react';

// Minimal AuthProvider to avoid parsing issues
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  );
};

// Stub for useAuthClient
export const useAuthClient = () => {
  console.warn(
    "useAuthClient is currently returning a stub due to persistent parsing issues in its defining file."
  );
  return { user: null, role: null, loading: true, isManuallyCheckingRole: false };
};

// Stub for ProtectedRoute
export const ProtectedRoute = ({
  children,
  // requiredRole, // Temporarily remove to simplify
}: {
  children: ReactNode;
  // requiredRole?: string | string[]; // Temporarily remove to simplify
}) => {
  console.warn(
    "ProtectedRoute is currently a stub due to persistent parsing issues in its defining file."
  );
  return <>{children}</>;
};
