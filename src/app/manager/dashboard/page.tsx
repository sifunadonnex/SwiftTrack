
"use client";

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { summarizeTripDetails, type SummarizeTripDetailsInput } from '@/ai/flows/summarize-trip-details';
import { getMaintenanceSuggestion, type MaintenanceReminderInput } from '@/ai/flows/maintenance-reminder-flow.ts';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Trip, TripFormData } from '@/lib/types';
import { db } from '@/config/firebase';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2, SearchIcon, Brain, Pencil, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import { cn } from "@/lib/utils"; 
import EditTripForm from '@/components/trips/edit-trip-form';
import { updateTrip } from '@/lib/trip.actions';


interface Filters {
  driverName: string;
  tripDate: Date | null;
}

export default function ManagerDashboardPage() {
  const { toast } = useToast();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ driverName: 'all', tripDate: null });
  
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [currentTripForSummary, setCurrentTripForSummary] = useState<Trip | null>(null);
  const [tripSummary, setTripSummary] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTripToEdit, setCurrentTripToEdit] = useState<Trip | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);

  const [maintenanceSuggestion, setMaintenanceSuggestion] = useState<string | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);

  const fetchAllTrips = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tripsRef = collection(db, 'trips');
      const q = query(tripsRef, orderBy('tripDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const tripsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          tripDate: data.tripDate instanceof Timestamp ? data.tripDate.toDate() : new Date(data.tripDate),
          fromLocation: data.fromLocation || "N/A",
          toLocation: data.toLocation || "N/A",
        } as Trip;
      });
      setAllTrips(tripsData);
      const uniqueDrivers = Array.from(new Set(tripsData.map(trip => trip.driverName)));
      setDrivers(uniqueDrivers);
    } catch (err) {
      console.error("Error fetching all trips:", err);
      setError("Failed to load trips. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchAllTrips();
  }, [fetchAllTrips]);
  
  useEffect(() => {
    let tempTrips = [...allTrips];
    if (filters.driverName && filters.driverName !== 'all') {
      tempTrips = tempTrips.filter(trip => trip.driverName === filters.driverName);
    }
    if (filters.tripDate) {
      const selectedDateStr = format(filters.tripDate, 'yyyy-MM-dd');
      tempTrips = tempTrips.filter(trip => {
        const tripDateObj = trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : new Date(trip.tripDate);
        return format(tripDateObj, 'yyyy-MM-dd') === selectedDateStr;
      });
    }
    setFilteredTrips(tempTrips);
  }, [filters, allTrips]);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (filteredTrips.length > 0) {
        setIsFetchingSuggestion(true);
        setMaintenanceSuggestion(null); 
        try {
          const relevantTripDetails = filteredTrips
            .slice(0, 30) 
            .map(trip => trip.tripDetails)
            .filter((details): details is string => typeof details === 'string' && details.trim() !== '');

          if (relevantTripDetails.length > 0) {
            const input: MaintenanceReminderInput = { tripDetailsList: relevantTripDetails };
            const result = await getMaintenanceSuggestion(input);
            if (result.suggestion) { 
               setMaintenanceSuggestion(result.suggestion);
            } else {
              setMaintenanceSuggestion(null);
            }
          } else {
            setMaintenanceSuggestion(null); 
          }
        } catch (err) {
          console.error("Error fetching maintenance suggestion:", err);
          setMaintenanceSuggestion(null);
        } finally {
          setIsFetchingSuggestion(false);
        }
      } else {
        setMaintenanceSuggestion(null); 
      }
    };
    fetchSuggestion();
  }, [filteredTrips]);


  const handleFilterChange = (key: keyof Filters, value: string | Date | null) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSummarize = async (trip: Trip) => {
    if (!trip.tripDetails || trip.tripDetails.trim() === "") {
      toast({ title: "No Details", description: "This trip has no details to summarize.", variant: "default" });
      setTripSummary("No details provided for this trip.");
      setCurrentTripForSummary(trip);
      setIsSummaryModalOpen(true);
      return;
    }

    setIsSummarizing(true);
    setCurrentTripForSummary(trip);
    setTripSummary(null); 
    setIsSummaryModalOpen(true);

    try {
      const input: SummarizeTripDetailsInput = { tripDetails: trip.tripDetails };
      const result = await summarizeTripDetails(input);
      setTripSummary(result.summary);
      toast({ title: "Summary Generated", description: "AI has summarized the trip details." });
    } catch (err) {
      console.error("Error summarizing trip:", err);
      setTripSummary("Failed to generate summary.");
      toast({ title: "Summarization Failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSummarizing(false);
    }
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
    setIsSavingTrip(true);
    try {
      const result = await updateTrip(tripId, data);
      if (result.success) {
        toast({ title: "Trip Updated", description: "Trip details have been successfully updated." });
        setIsEditModalOpen(false);
        setCurrentTripToEdit(null);
        await fetchAllTrips(); 
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


  const aggregateSummary = useMemo(() => {
    if (filteredTrips.length === 0) return { totalTrips: 0, totalDistance: 0, averageDistance: 0 };
    const completedTrips = filteredTrips.filter(trip => trip.endMileage != null && trip.startMileage != null);
    const totalTrips = filteredTrips.length; // Show total trips regardless of completion for this stat
    const totalDistance = completedTrips.reduce((sum, trip) => sum + (trip.endMileage! - trip.startMileage!), 0);
    const averageDistance = completedTrips.length > 0 ? parseFloat((totalDistance / completedTrips.length).toFixed(1)) : 0;
    return { totalTrips, totalDistance, averageDistance };
  }, [filteredTrips]);

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

  const getTripStatusBadge = (trip: Trip): { text: string; variant: "default" | "secondary" | "outline" | "destructive" } => {
    if (trip.endTime && trip.endMileage != null) {
      return { text: "Completed", variant: "default" };
    }
    return { text: "Pending", variant: "secondary" };
  };


  return (
    <AppLayout requiredRole="manager">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(isFetchingSuggestion || maintenanceSuggestion) && (
          <Card className="mb-6 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <AlertCircle className="mr-2 h-5 w-5 text-primary" />
                Smart Suggestions
              </CardTitle>
              <CardDescription>AI-powered insights based on recent trip data.</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingSuggestion && !maintenanceSuggestion && (
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
                  <span>Analyzing trip data for suggestions...</span>
                </div>
              )}
              {!isFetchingSuggestion && maintenanceSuggestion && (
                <p className="text-sm">{maintenanceSuggestion}</p>
              )}
              {!isFetchingSuggestion && !maintenanceSuggestion && filteredTrips.length > 0 && (
                 <p className="text-sm text-muted-foreground">No specific cleaning or fuel reminders from recent trips.</p>
              )}
              {!isFetchingSuggestion && !maintenanceSuggestion && filteredTrips.length === 0 && (
                 <p className="text-sm text-muted-foreground">Not enough trip data to generate suggestions at the moment.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Trip Log Overview</CardTitle>
            <CardDescription>View, filter, and analyze all submitted trips. Trips pending completion can be edited.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips (Filtered)</p>
                <p className="text-2xl font-semibold">{aggregateSummary.totalTrips}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Distance (Completed)</p>
                <p className="text-2xl font-semibold">{aggregateSummary.totalDistance} miles</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Distance (Completed)</p>
                <p className="text-2xl font-semibold">{aggregateSummary.averageDistance} miles</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center pt-4">
              <Select value={filters.driverName} onValueChange={(value) => handleFilterChange('driverName', value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by driver..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver} value={driver}>{driver}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full md:w-[240px] justify-start text-left font-normal",
                      !filters.tripDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.tripDate ? format(filters.tripDate, "PPP") : <span>Filter by date...</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.tripDate}
                    onSelect={(date) => handleFilterChange('tripDate', date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={() => setFilters({ driverName: 'all', tripDate: null })}>Clear Filters</Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading trips...</p>
              </div>
            ) : filteredTrips.length === 0 && !error ? (
              <p className="text-center text-muted-foreground py-10">No trips match the current filters, or no trips submitted yet.</p>
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
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrips.map((trip) => {
                      const status = getTripStatusBadge(trip);
                      const distance = trip.endMileage != null && trip.startMileage != null ? (trip.endMileage - trip.startMileage) : null;
                      return (
                        <TableRow key={trip.id}>
                          <TableCell>{format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : new Date(trip.tripDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{trip.driverName}</TableCell>
                          <TableCell>{trip.fromLocation}</TableCell>
                          <TableCell>{trip.toLocation || 'N/A'}</TableCell>
                          <TableCell>{trip.startTime} / {trip.endTime || 'N/A'}</TableCell>
                          <TableCell>{calculateDuration(trip.startTime, trip.endTime, trip.tripDate)}</TableCell>
                          <TableCell>{trip.startMileage} / {trip.endMileage != null ? trip.endMileage : 'N/A'}</TableCell>
                          <TableCell>{distance != null ? `${distance} miles` : 'N/A'}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={trip.tripDetails}>{trip.tripDetails || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant as any}>{status.text}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => handleSummarize(trip)} disabled={isSummarizing && currentTripForSummary?.id === trip.id} className="p-1 h-8 w-8" title="Summarize Trip Details">
                              {isSummarizing && currentTripForSummary?.id === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                              <span className="sr-only">Summarize</span>
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditTrip(trip)} className="p-1 h-8 w-8" title="Edit Trip">
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
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

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Trip Summary for {currentTripForSummary?.driverName} on {currentTripForSummary && format(currentTripForSummary.tripDate instanceof Timestamp ? currentTripForSummary.tripDate.toDate() : new Date(currentTripForSummary.tripDate), 'MMM dd, yyyy')}</DialogTitle>
            <DialogDescription>
              AI-generated summary of the trip details.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isSummarizing && !tripSummary ? (
                <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" /> 
                    <p className="ml-2">Generating summary...</p>
                </div>
            ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap">{tripSummary || "No summary available."}</p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSummaryModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen && !isSavingTrip) { 
          setCurrentTripToEdit(null); 
        }
        setIsEditModalOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[625px]"> 
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
            <DialogDescription>
              Update the details for this trip. Click save when you&apos;re done.
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
