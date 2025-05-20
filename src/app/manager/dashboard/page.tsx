
"use client";

import AppLayout from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { summarizeTripDetails, type SummarizeTripDetailsInput } from '@/ai/flows/summarize-trip-details';
import { getMaintenanceSuggestion, type MaintenanceReminderInput } from '@/ai/flows/maintenance-reminder-flow.ts';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import type { Trip, TripFormData } from '@/lib/types';
import { db } from '@/config/firebase';
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore';
import { format, parseISO, startOfDay, endOfDay, isWithinInterval, differenceInMilliseconds } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Loader2, SearchIcon, Brain, Pencil, AlertCircle, Printer, MapPin, Clock, Gauge, Route, FileDown, CalendarDays } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import EditTripForm from '@/components/trips/edit-trip-form';
import { updateTrip } from '@/lib/trip.actions';


interface Filters {
  driverName: string;
  dateRange: DateRange | undefined;
}

export default function ManagerDashboardPage() {
  const { toast } = useToast();
  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ driverName: 'all', dateRange: undefined });

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
          returnDate: data.returnDate ? (data.returnDate instanceof Timestamp ? data.returnDate.toDate() : new Date(data.returnDate)) : null,
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
    if (filters.dateRange?.from) {
      const rangeStart = startOfDay(filters.dateRange.from);
      const rangeEnd = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from);

      tempTrips = tempTrips.filter(trip => {
        const tripDateObj = trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : new Date(trip.tripDate);
        // Consider returnDate for filtering if it exists
        const effectiveEndDate = trip.returnDate ? (trip.returnDate instanceof Timestamp ? trip.returnDate.toDate() : new Date(trip.returnDate)) : tripDateObj;
        
        // Check if either tripDate or effectiveEndDate falls within the range
        const tripStartsInRange = isWithinInterval(tripDateObj, { start: rangeStart, end: rangeEnd });
        const tripEndsInRange = isWithinInterval(effectiveEndDate, { start: rangeStart, end: rangeEnd });
        // Or if the range is within the trip's duration
        const rangeWithinTrip = isWithinInterval(rangeStart, {start: tripDateObj, end: effectiveEndDate}) && isWithinInterval(rangeEnd, {start: tripDateObj, end: effectiveEndDate});


        return tripStartsInRange || tripEndsInRange || rangeWithinTrip;
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


  const handleFilterChange = (key: keyof Filters, value: string | DateRange | undefined) => {
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

  const calculateDuration = (
    startTime?: string | null,
    endTime?: string | null,
    tripDate?: Date | Timestamp | null,
    returnDate?: Date | Timestamp | null
  ): string => {
    if (!startTime || !endTime || !tripDate) return "N/A";

    const tDate = tripDate instanceof Timestamp ? tripDate.toDate() : new Date(tripDate);
    const rDate = returnDate ? (returnDate instanceof Timestamp ? returnDate.toDate() : new Date(returnDate)) : tDate;

    const startDateTime = new Date(tDate);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(rDate);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    if (endDateTime <= startDateTime) return "N/A";

    let diffMs = differenceInMilliseconds(endDateTime, startDateTime);
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

  const handlePrint = () => {
    window.print();
  };

  const convertTripToCSVRow = (trip: Trip): string[] => {
    const tripDate = format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : trip.tripDate, 'yyyy-MM-dd');
    const returnD = trip.returnDate ? (trip.returnDate instanceof Timestamp ? trip.returnDate.toDate() : new Date(trip.returnDate)) : (trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : new Date(trip.tripDate));
    const returnDateStr = format(returnD, 'yyyy-MM-dd');
    const distance = trip.endMileage != null && trip.startMileage != null ? (trip.endMileage - trip.startMileage).toString() : 'N/A';
    const duration = calculateDuration(trip.startTime, trip.endTime, trip.tripDate, trip.returnDate);
    const status = getTripStatusBadge(trip).text;

    return [
      tripDate,
      returnDateStr,
      trip.driverName,
      trip.fromLocation || 'N/A',
      trip.toLocation || 'N/A',
      trip.startTime || 'N/A',
      trip.endTime || 'N/A',
      trip.startMileage.toString(),
      trip.endMileage != null ? trip.endMileage.toString() : 'N/A',
      duration,
      distance,
      status,
      (trip.tripDetails || '').replace(/"/g, '""') // Escape double quotes for CSV
    ];
  };

  const handleExportCSV = () => {
    if (filteredTrips.length === 0) {
      toast({ title: "No Data", description: "There are no trips to export with the current filters.", variant: "default" });
      return;
    }

    const headers = [
      "Trip Date", "Return Date", "Driver Name", "From Location", "To Location",
      "Start Time", "End Time", "Start Mileage", "End Mileage",
      "Duration (H:M)", "Distance (Miles)", "Status", "Trip Details"
    ];
    const csvRows = [headers.join(',')];

    filteredTrips.forEach(trip => {
      csvRows.push(convertTripToCSVRow(trip).map(field => `"${field}"`).join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      const reportDate = format(new Date(), 'yyyy-MM-dd');
      link.setAttribute("href", url);
      link.setAttribute("download", `SwiftTrack_Report_${reportDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Export Successful", description: "Trip data exported to CSV." });
    } else {
      toast({ title: "Export Failed", description: "CSV export is not supported by your browser.", variant: "destructive" });
    }
  };


  const aggregateSummary = useMemo(() => {
    if (filteredTrips.length === 0) return { totalTrips: 0, totalDistance: 0, averageDistance: 0 };
    const completedTrips = filteredTrips.filter(trip => trip.endMileage != null && trip.startMileage != null);
    const totalTrips = filteredTrips.length;
    const totalDistance = completedTrips.reduce((sum, trip) => sum + (trip.endMileage! - trip.startMileage!), 0);
    const averageDistance = completedTrips.length > 0 ? parseFloat((totalDistance / completedTrips.length).toFixed(1)) : 0;
    return { totalTrips, totalDistance, averageDistance };
  }, [filteredTrips]);


  return (
    <AppLayout requiredRole="manager">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>

        {error && (
          <Alert variant="destructive" className="no-print">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {(isFetchingSuggestion || maintenanceSuggestion) && (
          <Card className="mb-6 shadow-md no-print">
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

        <div className="print-only">
          <h2>Trip Report Filters</h2>
          <p>
            Driver: {filters.driverName === 'all' ? 'All Drivers' : filters.driverName}
          </p>
          <p>
            Date Range: {
              filters.dateRange?.from
                ? (filters.dateRange.to
                    ? `${format(filters.dateRange.from, "MMM dd, yyyy")} - ${format(filters.dateRange.to, "MMM dd, yyyy")}`
                    : format(filters.dateRange.from, "MMM dd, yyyy")
                  )
                : "All Dates"
            }
          </p>
        </div>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="card-title-print">Trip Log Overview</CardTitle>
            <CardDescription className="card-description-print">View, filter, and analyze all submitted trips. Trips pending completion can be edited.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30 aggregate-summary-print">
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

            <div className="flex flex-col md:flex-row gap-4 items-center pt-4 no-print">
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
                      "w-full md:w-auto min-w-[240px] justify-start text-left font-normal",
                      !filters.dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.dateRange?.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, "LLL dd, y")} - {" "}
                          {format(filters.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(filters.dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Filter by date range...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={filters.dateRange?.from}
                    selected={filters.dateRange}
                    onSelect={(range) => handleFilterChange('dateRange', range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" onClick={() => setFilters({ driverName: 'all', dateRange: undefined })}>Clear Filters</Button>
              <div className="ml-auto flex gap-2">
                <Button onClick={handleExportCSV} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading trips...</p>
              </div>
            ) : filteredTrips.length === 0 && !error ? (
              <div className="text-center py-10">
                <Route className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-lg font-medium">No Trips Found</h3>
                <p className="mt-1 text-sm text-muted-foreground">No trips match the current filters, or no trips submitted yet.</p>
              </div>
            ) : (
              <>
                {/* Screen View: Cards */}
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 no-print">
                  {filteredTrips.map((trip) => {
                    const status = getTripStatusBadge(trip);
                    const distance = trip.endMileage != null && trip.startMileage != null ? (trip.endMileage - trip.startMileage) : null;
                    const duration = calculateDuration(trip.startTime, trip.endTime, trip.tripDate, trip.returnDate);
                    const effectiveReturnDate = trip.returnDate || trip.tripDate;

                    return (
                      <Card key={trip.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow duration-200">
                        <CardHeader>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <CardTitle className="text-xl flex items-center">
                                <CalendarDays className="mr-2 h-5 w-5 text-primary" />
                                {format(trip.tripDate instanceof Timestamp ? trip.tripDate.toDate() : trip.tripDate, 'MMM dd, yyyy')}
                                {effectiveReturnDate && format(effectiveReturnDate, 'yyyy-MM-dd') !== format(trip.tripDate, 'yyyy-MM-dd') && (
                                  <span className="text-sm text-muted-foreground ml-2">(Return: {format(effectiveReturnDate, 'MMM dd')})</span>
                                )}
                              </CardTitle>
                              <CardDescription>Driver: {trip.driverName}</CardDescription>
                            </div>
                            <Badge variant={status.variant as any} className="whitespace-nowrap">{status.text}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-grow">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold">Route</h4>
                              <p className="text-sm text-muted-foreground">
                                {trip.fromLocation || 'N/A'} <span className="font-semibold text-primary mx-1">&rarr;</span> {trip.toLocation || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm border-t pt-3">
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

                          <div className="grid grid-cols-2 gap-x-4 text-sm border-t pt-3">
                              <div>
                                  <h4 className="font-medium">Duration</h4>
                                  <p className="text-muted-foreground">{duration}</p>
                              </div>
                              <div>
                                  <h4 className="font-medium">Distance</h4>
                                  <p className="text-muted-foreground">{distance != null ? `${distance} miles` : 'N/A'}</p>
                              </div>
                          </div>

                          {trip.tripDetails && (
                            <div className="pt-2 border-t">
                              <h4 className="text-sm font-semibold">Details</h4>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-2 rounded-md max-h-24 overflow-y-auto">
                                {trip.tripDetails}
                              </p>
                            </div>
                          )}
                        </CardContent>
                        <CardFooter className="border-t pt-4 space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleSummarize(trip)} disabled={isSummarizing && currentTripForSummary?.id === trip.id} className="flex-1">
                            {isSummarizing && currentTripForSummary?.id === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                            Summarize
                          </Button>
                          <Button variant="default" size="sm" onClick={() => handleEditTrip(trip)} className="flex-1">
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Trip
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>

                {/* Print View: Table */}
                <div className="print-only-table">
                  <Table className="table-print">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Trip Date</TableHead>
                        <TableHead>Return Date</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Start Mileage</TableHead>
                        <TableHead>End Mileage</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Distance (mi)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrips.map((trip) => {
                        const csvRow = convertTripToCSVRow(trip);
                        // Order of CSV row: TripDate, ReturnDate, Driver, From, To, StartTime, EndTime, StartMileage, EndMileage, Duration, Distance, Status, Details
                        return (
                          <TableRow key={trip.id + "-print"}>
                            <TableCell>{csvRow[0]}</TableCell>
                            <TableCell>{csvRow[1]}</TableCell>
                            <TableCell>{csvRow[2]}</TableCell>
                            <TableCell>{csvRow[3]}</TableCell>
                            <TableCell>{csvRow[4]}</TableCell>
                            <TableCell>{csvRow[5]}</TableCell>
                            <TableCell>{csvRow[6]}</TableCell>
                            <TableCell>{csvRow[7]}</TableCell>
                            <TableCell>{csvRow[8]}</TableCell>
                            <TableCell>{csvRow[9]}</TableCell>
                            <TableCell>{csvRow[10]}</TableCell>
                            <TableCell><Badge variant={getTripStatusBadge(trip).variant as any} className="badge-print">{csvRow[11]}</Badge></TableCell>
                            <TableCell><p className="max-w-xs whitespace-pre-wrap break-words">{csvRow[12]}</p></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isSummaryModalOpen} onOpenChange={setIsSummaryModalOpen}>
        <DialogContent className="sm:max-w-[525px] no-print">
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
        <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto no-print">
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
