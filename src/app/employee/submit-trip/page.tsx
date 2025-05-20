
"use client";

import AppLayout from '@/components/layout/app-layout';
import TripForm from '@/components/trips/trip-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthClient } from '@/hooks/use-auth-client';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from 'lucide-react';

export default function SubmitTripPage() {
  const { role } = useAuthClient();

  return (
    <AppLayout requiredRole={['employee', 'manager']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Submit New Trip</h1>
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>Fill in the form below to log a new trip.</CardDescription>
            {role === 'manager' && (
              <Alert className="mt-4 text-sm">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  As a manager, you can submit this trip for another employee by changing the <strong>Driver Name</strong> field in the form.
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            <TripForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
