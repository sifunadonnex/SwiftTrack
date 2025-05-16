"use client";

import AppLayout from '@/components/layout/app-layout';
import TripForm from '@/components/trips/trip-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SubmitTripPage() {
  return (
    <AppLayout requiredRole={['employee', 'manager']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Submit New Trip</h1>
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>Fill in the form below to log a new trip.</CardDescription>
          </CardHeader>
          <CardContent>
            <TripForm />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
