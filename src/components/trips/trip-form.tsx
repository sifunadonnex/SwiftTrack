
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import type { TripFormData } from "@/lib/types";
import { useAuthClient } from "@/hooks/use-auth-client";
import { addTrip } from "@/lib/trip.actions";


const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const tripFormSchema = z.object({
  tripDate: z.date({ required_error: "Trip date is required." }),
  returnDate: z.date().optional().nullable(),
  driverName: z.string().min(2, { message: "Driver name must be at least 2 characters." }),
  fromLocation: z.string().min(2, { message: "From location must be at least 2 characters." }),
  toLocation: z.string().optional().or(z.literal('')),
  startTime: z.string().regex(timeRegex, { message: "Invalid start time format (HH:MM)." }),
  endTime: z.string().regex(timeRegex, { message: "Invalid end time format (HH:MM)." }).optional().or(z.literal('')),
  startMileage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Start mileage must be a non-negative number." }),
  endMileage: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "End mileage must be a non-negative number if provided." }).optional().or(z.literal('')),
  tripDetails: z.string().min(1, { message: "Trip details are required." }), // Changed from optional
}).refine(data => {
  if (data.endMileage && data.endMileage.trim() !== "" && data.startMileage && data.startMileage.trim() !== "") {
    const start = parseFloat(data.startMileage);
    const end = parseFloat(data.endMileage);
    if (isNaN(start) || isNaN(end)) return true; // Let individual field validation handle NaN
    return end >= start;
  }
  return true;
}, {
  message: "End mileage must be greater than or equal to start mileage, if provided.",
  path: ["endMileage"],
}).refine(data => {
    if (data.endTime && data.endTime.trim() !== "" && data.startTime && data.startTime.trim() !== "") {
        // Only validate time if tripDate and returnDate (or tripDate if returnDate is null) are the same
        const effectiveReturnDate = data.returnDate || data.tripDate;
        if (format(data.tripDate, 'yyyy-MM-dd') === format(effectiveReturnDate, 'yyyy-MM-dd')) {
            const [startHour, startMinute] = data.startTime.split(':').map(Number);
            const [endHour, endMinute] = data.endTime.split(':').map(Number);
            const startDate = new Date(2000, 0, 1, startHour, startMinute);
            const endDate = new Date(2000, 0, 1, endHour, endMinute);
            return endDate > startDate;
        }
    }
    return true;
}, {
    message: "End time must be after start time if on the same day.",
    path: ["endTime"],
}).refine(data => {
  if (data.returnDate) {
    return data.returnDate >= data.tripDate;
  }
  return true;
}, {
  message: "Return date cannot be before trip date.",
  path: ["returnDate"],
});


export default function TripForm() {
  const { user } = useAuthClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof tripFormSchema>>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      tripDate: new Date(),
      returnDate: null,
      driverName: user?.displayName || "",
      fromLocation: "",
      toLocation: "",
      startTime: "",
      endTime: "",
      startMileage: "",
      endMileage: "",
      tripDetails: "",
    },
  });

  React.useEffect(() => {
    if (user?.displayName && !form.getValues("driverName")) {
      form.setValue("driverName", user.displayName);
    }
  }, [user, form]);

  async function onSubmit(values: z.infer<typeof tripFormSchema>) {
    if (!user || !user.uid) {
      toast({ title: "Error", description: "You must be logged in to submit a trip.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);

    const tripData: TripFormData = {
      ...values,
      returnDate: values.returnDate || null,
      toLocation: values.toLocation || null,
      endTime: values.endTime || null,
      startMileage: values.startMileage,
      endMileage: values.endMileage || null,
      // tripDetails is already in values and now required
    };

    try {
      const result = await addTrip(user.uid, tripData);
      if (result.success && result.tripId) {
        toast({
          title: "Trip Submitted!",
          description: "Your trip details have been successfully recorded.",
        });
        form.reset({
            tripDate: new Date(),
            returnDate: null,
            driverName: user?.displayName || "",
            fromLocation: "",
            toLocation: "",
            startTime: "",
            endTime: "",
            startMileage: "",
            endMileage: "",
            tripDetails: "",
        });
      } else {
        throw new Error(result.error || "Failed to submit trip.");
      }
    } catch (error: any) {
      console.error("Trip submission error:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="tripDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Trip Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="returnDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Return Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a return date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const tripDate = form.getValues("tripDate");
                        return date > new Date() || (tripDate && date < tripDate);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>Leave blank if same as trip date.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
            control={form.control}
            name="driverName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Driver Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="fromLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Client Site A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>Format: HH:MM (e.g., 09:00)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>Format: HH:MM (e.g., 17:30)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="startMileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Mileage</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 15000" {...field} min="0" step="0.1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endMileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Mileage</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 15100" {...field} min="0" step="0.1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tripDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trip Details</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the purpose or route of the trip..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide any relevant information about the trip. This can be summarized by AI for managers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Trip
        </Button>
      </form>
    </Form>
  );
}

