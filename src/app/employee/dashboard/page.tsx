
"use client";

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthClient } from '@/hooks/use-auth-client';
import { db } from '@/config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import type { Trip, TripFormData } from '@/lib/types';
import React, { useEffect, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Loader2, Pencil, MapPin, Clock, Gauge } from 'lucide-react';
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

    if (endDateTime <= startDateTime) return "N/A"; 

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
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">My Trips</h1>
          <p className="text-muted-foreground">A log of all trips you have submitted. You can complete pending trips using the button on each card.</p>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading your trips...</p>
          </div>
        ) : trips.length === 0 && !error ? (
          <div className="text-center py-10">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">No Trips Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">You haven&apos;t submitted any trips.</p>
            <Button asChild className="mt-4">
              <a href="/employee/submit-trip">Submit Your First Trip</a>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => {
              const status = getTripStatus(trip);
              const isPending = status.text === "Pending Completion";
              const distance = trip.endMileage != null && trip.startMileage != null ? (trip.endMileage - trip.startMileage) : null;

              return (
                <Card key={trip.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-xl">
                          {format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : trip.tripDate, 'MMM dd, yyyy')}
                        </CardTitle>
                        <CardDescription>Driver: {trip.driverName}</CardDescription>
                      </div>
                      <Badge variant={status.variant as any} className="whitespace-nowrap">{status.text}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex-grow">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold">Route</h4>
                        <p className="text-sm text-muted-foreground">
                          {trip.fromLocation} <span className="font-semibold text-primary mx-1">&rarr;</span> {trip.toLocation || 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm border-t border-b py-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Start Time</h4>
                          <p className="text-muted-foreground">{trip.startTime}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">End Time</h4>
                          <p className="text-muted-foreground">{trip.endTime || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">Start Mileage</h4>
                          <p className="text-muted-foreground">{trip.startMileage}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">End Mileage</h4>
                          <p className="text-muted-foreground">{trip.endMileage != null ? trip.endMileage : 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 text-sm">
                         <div>
                            <h4 className="font-medium">Duration</h4>
                            <p className="text-muted-foreground">{calculateDuration(trip.startTime, trip.endTime, trip.tripDate)}</p>
                        </div>
                        <div>
                            <h4 className="font-medium">Distance</h4>
                            <p className="text-muted-foreground">{distance != null ? `${distance} miles` : 'N/A'}</p>
                        </div>
                    </div>

                    {trip.tripDetails && (
                      <div className="pt-2">
                        <h4 className="text-sm font-semibold">Details</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md max-h-24 overflow-y-auto">
                          {trip.tripDetails}
                        </p>
                      </div>
                    )}
                  </CardContent>
                  {isPending && (
                    <CardFooter className="border-t pt-4">
                      <Button variant="default" size="sm" onClick={() => handleEditTrip(trip)} className="w-full">
                        <Pencil className="mr-2 h-4 w-4" /> Complete Trip Details
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen && !isSavingTrip) {
          setCurrentTripToEdit(null);
        }
        setIsEditModalOpen(isOpen);
      }}>
        <DialogContent className="w-[95vw] sm:max-w-lg">
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
