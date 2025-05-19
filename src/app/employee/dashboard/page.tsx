
"use client";

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthClient } from '@/hooks/use-auth-client';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import type { Trip } from '@/lib/types';
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

export default function EmployeeDashboardPage() {
  const { user } = useAuthClient();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchTrips = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const tripsRef = collection(db, 'trips');
          const q = query(tripsRef, where('userId', '==', user.uid), orderBy('tripDate', 'desc'));
          const querySnapshot = await getDocs(q);
          const userTrips = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              tripDate: data.tripDate instanceof Timestamp ? data.tripDate.toDate() : new Date(data.tripDate),
              fromLocation: data.fromLocation || "N/A",
              toLocation: data.toLocation || "N/A",
            } as Trip;
          });
          setTrips(userTrips);
        } catch (err) {
          console.error("Error fetching trips:", err);
          setError("Failed to load your trips. Please try again later.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchTrips();
    }
  }, [user]);

  const calculateDuration = (startTime?: string | null, endTime?: string | null, tripDate?: Date | Timestamp | null): string => {
    if (!startTime || !endTime || !tripDate) return "N/A";
    
    const date = tripDate instanceof Timestamp ? tripDate.toDate() : new Date(tripDate);
    const startDateTime = new Date(date);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(date);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);
    
    if (endDateTime <= startDateTime) return "N/A"; // Should not happen with validation

    let diffMs = endDateTime.getTime() - startDateTime.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    diffMs -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diffMs / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const getTripStatus = (trip: Trip): { text: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
    if (trip.endTime && trip.endMileage != null) {
      return { text: "Completed", variant: "default" };
    }
    return { text: "Pending Completion", variant: "secondary" };
  };

  return (
    <AppLayout requiredRole={['employee', 'manager']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
        
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your Trip History</CardTitle>
            <CardDescription>A log of all trips you have submitted. You can complete pending trips by editing them via the Manager Dashboard if applicable, or by contacting your manager.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading your trips...</p>
              </div>
            ) : trips.length === 0 && !error ? (
              <p className="text-center text-muted-foreground py-10">You haven&apos;t submitted any trips yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Time (Start/End)</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Mileage (Start/End)</TableHead>
                      <TableHead>Distance</TableHead>
                      <TableHead className="text-right">Status</TableHead> 
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => {
                      const status = getTripStatus(trip);
                      return (
                        <TableRow key={trip.id}>
                          <TableCell>{format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : trip.tripDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{trip.driverName}</TableCell>
                          <TableCell>{trip.fromLocation}</TableCell>
                          <TableCell>{trip.toLocation || 'N/A'}</TableCell>
                          <TableCell>{trip.startTime} / {trip.endTime || 'N/A'}</TableCell>
                          <TableCell>{calculateDuration(trip.startTime, trip.endTime, trip.tripDate)}</TableCell>
                          <TableCell>{trip.startMileage} / {trip.endMileage != null ? trip.endMileage : 'N/A'}</TableCell>
                          <TableCell>{trip.endMileage != null && trip.startMileage != null ? (trip.endMileage - trip.startMileage) + ' miles' : 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={status.variant as any}>{status.text}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
