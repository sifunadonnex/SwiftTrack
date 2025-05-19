
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
import { format, parseISO } from "date-fns";
import React, { useEffect } from 'react';
import type { Trip, TripFormData } from "@/lib/types";
import { Timestamp } from "firebase/firestore"; 

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const editTripFormSchema = z.object({
  tripDate: z.date({ required_error: "Trip date is required." }),
  driverName: z.string().min(2, { message: "Driver name must be at least 2 characters." }),
  fromLocation: z.string().min(2, { message: "From location must be at least 2 characters." }),
  toLocation: z.string().optional().or(z.literal('')),
  startTime: z.string().regex(timeRegex, { message: "Invalid start time format (HH:MM)." }),
  endTime: z.string().regex(timeRegex, { message: "Invalid end time format (HH:MM)." }).optional().or(z.literal('')),
  startMileage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Start mileage must be a non-negative number." }),
  endMileage: z.string().refine(val => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: "End mileage must be a non-negative number if provided." }).optional().or(z.literal('')),
  tripDetails: z.string().optional(),
}).refine(data => {
  if (data.endMileage && data.endMileage.trim() !== "" && data.startMileage && data.startMileage.trim() !== "") {
    const start = parseFloat(data.startMileage);
    const end = parseFloat(data.endMileage);
    if (isNaN(start) || isNaN(end)) return true; 
    return end >= start;
  }
  return true;
}, {
  message: "End mileage must be greater than or equal to start mileage, if provided.",
  path: ["endMileage"],
}).refine(data => {
    if (data.endTime && data.endTime.trim() !== "" && data.startTime && data.startTime.trim() !== "") {
        const [startHour, startMinute] = data.startTime.split(':').map(Number);
        const [endHour, endMinute] = data.endTime.split(':').map(Number);
        const startDate = new Date(2000, 0, 1, startHour, startMinute);
        const endDate = new Date(2000, 0, 1, endHour, endMinute);
        return endDate > startDate;
    }
    return true;
}, {
    message: "End time must be after start time, if provided.",
    path: ["endTime"],
});

type EditTripFormValues = z.infer<typeof editTripFormSchema>;

interface EditTripFormProps {
  trip: Trip;
  onSave: (tripId: string, data: TripFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export default function EditTripForm({ trip, onSave, onCancel, isSaving }: EditTripFormProps) {
  
  const getInitialDate = (tripDate: Date | Timestamp | string): Date => {
    if (tripDate instanceof Timestamp) return tripDate.toDate();
    if (typeof tripDate === 'string') return parseISO(tripDate); 
    if (tripDate instanceof Date) return tripDate; 
    return new Date(); 
  };

  const form = useForm<EditTripFormValues>({
    resolver: zodResolver(editTripFormSchema),
    defaultValues: {
      tripDate: getInitialDate(trip.tripDate),
      driverName: trip.driverName || "",
      fromLocation: trip.fromLocation || "",
      toLocation: trip.toLocation || "",
      startTime: trip.startTime || "",
      endTime: trip.endTime || "", 
      startMileage: trip.startMileage?.toString() || "0",
      endMileage: trip.endMileage?.toString() || "", 
      tripDetails: trip.tripDetails || "",
    },
  });

  useEffect(() => {
    form.reset({
        tripDate: getInitialDate(trip.tripDate),
        driverName: trip.driverName || "",
        fromLocation: trip.fromLocation || "",
        toLocation: trip.toLocation || "",
        startTime: trip.startTime || "",
        endTime: trip.endTime || "",
        startMileage: trip.startMileage?.toString() || "0",
        endMileage: trip.endMileage?.toString() || "",
        tripDetails: trip.tripDetails || "",
    });
  }, [trip, form]);

  async function onSubmit(values: EditTripFormValues) {
    if (!trip.id) return;
    const dataToSave: TripFormData = {
      ...values,
      toLocation: values.toLocation || null,
      startMileage: values.startMileage,
      endMileage: values.endMileage || null, 
      endTime: values.endTime || null, 
    };
    await onSave(trip.id, dataToSave);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormLabel>To Location (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Client Site A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>HH:MM</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormDescription>HH:MM</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormLabel>End Mileage (Optional)</FormLabel>
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
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
