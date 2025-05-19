
"use client";

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthClient } from '@/hooks/use-auth-client';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import type { Trip, TripFormData } from '@/lib/types';
import React, { useEffect, useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Loader2, Pencil } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import EditTripForm from '@/components/trips/edit-trip-form';
import { updateTrip } from '@/lib/trip.actions';
import { useToast } from '@/hooks/use-toast';

export default function EmployeeDashboardPage() {
  const { user } = useAuthClient();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTripToEdit, setCurrentTripToEdit] = useState<Trip | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (user) {
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
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

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

  const handleEditTrip = (trip: Trip) => {
    setCurrentTripToEdit(trip);
    setIsEditModalOpen(true);
  };

  const handleSaveTrip = async (tripId: string, data: TripFormData) => {
    if (!tripId) {
      toast({ title: "Error", description: "Trip ID is missing.", variant: "destructive" });
      return;
    }
    if (currentTripToEdit?.userId !== user?.uid) {
        toast({ title: "Unauthorized", description: "You can only edit your own trips.", variant: "destructive" });
        return;
    }
    setIsSavingTrip(true);
    try {
      const result = await updateTrip(tripId, data);
      if (result.success) {
        toast({ title: "Trip Updated", description: "Trip details have been successfully updated." });
        setIsEditModalOpen(false);
        setCurrentTripToEdit(null);
        await fetchTrips();
      } else {
        throw new Error(result.error || "Failed to update trip.");
      }
    } catch (err) {
      console.error("Error saving trip:", err);
      toast({ title: "Update Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingTrip(false);
    }
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
            <CardDescription>A log of all trips you have submitted. You can complete pending trips by clicking the edit icon.</CardDescription>
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
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trips.map((trip) => {
                      const status = getTripStatus(trip);
                      const isPending = status.text === "Pending Completion";
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
                          <TableCell>
                            <Badge variant={status.variant as any}>{status.text}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending && (
                              <Button variant="ghost" size="icon" onClick={() => handleEditTrip(trip)} className="p-1 h-8 w-8" title="Complete Trip Details">
                                <Pencil className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            )}
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

      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen && !isSavingTrip) {
          setCurrentTripToEdit(null);
        }
        setIsEditModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Complete Trip Details</DialogTitle>
            <DialogDescription>
              Fill in the end time and end mileage for this trip. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          {currentTripToEdit && (
            <EditTripForm
              trip={currentTripToEdit}
              onSave={handleSaveTrip}
              onCancel={() => {
                setIsEditModalOpen(false);
                setCurrentTripToEdit(null);
              }}
              isSaving={isSavingTrip}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
