"use client";

import type { ReactNode } from 'react';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  );
};

export const useAuthClient = () => {
  return { user: null, role: null, loading: true, isManuallyCheckingRole: false };
};

export const ProtectedRoute = ({
  children,
}: {
  children: ReactNode;
  requiredRole?: string | string[];
}) => {
  return <>{children}</>;
};
