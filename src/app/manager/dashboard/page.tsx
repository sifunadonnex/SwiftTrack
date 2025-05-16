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
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState, useMemo } from 'react';
import type { Trip } from '@/lib/types';
import { db } from '@/config/firebase';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Loader2, SearchIcon, Brain } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";

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


  useEffect(() => {
    const fetchAllTrips = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tripsRef = collection(db, 'trips');
        const q = query(tripsRef, orderBy('tripDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const tripsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        setAllTrips(tripsData);
        setFilteredTrips(tripsData); // Initially show all trips

        // Extract unique driver names for filter dropdown
        const uniqueDrivers = Array.from(new Set(tripsData.map(trip => trip.driverName)));
        setDrivers(uniqueDrivers);

      } catch (err) {
        console.error("Error fetching all trips:", err);
        setError("Failed to load trips. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllTrips();
  }, []);
  
  useEffect(() => {
    let tempTrips = [...allTrips];
    if (filters.driverName && filters.driverName !== 'all') {
      tempTrips = tempTrips.filter(trip => trip.driverName === filters.driverName);
    }
    if (filters.tripDate) {
      const selectedDate = format(filters.tripDate, 'yyyy-MM-dd');
      tempTrips = tempTrips.filter(trip => {
        const tripDate = trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : parseISO(trip.tripDate as unknown as string);
        return format(tripDate, 'yyyy-MM-dd') === selectedDate;
      });
    }
    setFilteredTrips(tempTrips);
  }, [filters, allTrips]);

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
    setTripSummary(null); // Clear previous summary
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

  const aggregateSummary = useMemo(() => {
    if (filteredTrips.length === 0) return { totalTrips: 0, totalDistance: 0, averageDistance: 0 };
    const totalTrips = filteredTrips.length;
    const totalDistance = filteredTrips.reduce((sum, trip) => sum + (trip.endMileage - trip.startMileage), 0);
    const averageDistance = totalTrips > 0 ? parseFloat((totalDistance / totalTrips).toFixed(1)) : 0;
    return { totalTrips, totalDistance, averageDistance };
  }, [filteredTrips]);

  const calculateDuration = (startTime: string, endTime: string, tripDate: Date | Timestamp): string => {
    const date = tripDate instanceof Timestamp ? tripDate.toDate() : tripDate;
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

        <Card>
          <CardHeader>
            <CardTitle>Trip Log Overview</CardTitle>
            <CardDescription>View, filter, and analyze all submitted trips.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-2xl font-semibold">{aggregateSummary.totalTrips}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Distance</p>
                <p className="text-2xl font-semibold">{aggregateSummary.totalDistance} miles</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Distance/Trip</p>
                <p className="text-2xl font-semibold">{aggregateSummary.averageDistance} miles</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Time (Start/End)</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrips.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell>{format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : trip.tripDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{trip.driverName}</TableCell>
                      <TableCell>{trip.startTime} / {trip.endTime}</TableCell>
                      <TableCell>{calculateDuration(trip.startTime, trip.endTime, trip.tripDate)}</TableCell>
                      <TableCell>{trip.endMileage - trip.startMileage} miles</TableCell>
                      <TableCell className="max-w-xs truncate" title={trip.tripDetails}>{trip.tripDetails || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleSummarize(trip)} disabled={isSummarizing && currentTripForSummary?.id === trip.id}>
                          {isSummarizing && currentTripForSummary?.id === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                           <span className="ml-1">Summarize</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Trip Summary for {currentTripForSummary?.driverName} on {currentTripForSummary && format(currentTripForSummary.tripDate instanceof Timestamp ? currentTripForSummary.tripDate.toDate() : currentTripForSummary.tripDate, 'MMM dd, yyyy')}</DialogTitle>
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

    </AppLayout>
  );
}
