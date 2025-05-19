
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
import React, { useState, useEffect } from 'react';
import type { Trip, TripFormData } from "@/lib/types";
import { Timestamp } from "firebase/firestore"; // Added import

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format

const editTripFormSchema = z.object({
  tripDate: z.date({ required_error: "Trip date is required." }),
  driverName: z.string().min(2, { message: "Driver name must be at least 2 characters." }),
  startTime: z.string().regex(timeRegex, { message: "Invalid start time format (HH:MM)." }),
  endTime: z.string().regex(timeRegex, { message: "Invalid end time format (HH:MM)." }),
  startMileage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Start mileage must be a non-negative number." }),
  endMileage: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "End mileage must be a non-negative number." }),
  tripDetails: z.string().optional(),
}).refine(data => {
  const start = parseFloat(data.startMileage);
  const end = parseFloat(data.endMileage);
  return end >= start;
}, {
  message: "End mileage must be greater than or equal to start mileage.",
  path: ["endMileage"],
}).refine(data => {
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    const startDate = new Date(2000, 0, 1, startHour, startMinute); // Use a fixed date for time comparison
    const endDate = new Date(2000, 0, 1, endHour, endMinute);
    return endDate > startDate;
}, {
    message: "End time must be after start time.",
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
    if (typeof tripDate === 'string') return parseISO(tripDate); // Handles ISO string
    if (tripDate instanceof Date) return tripDate; // Already a Date
    return new Date(); // Fallback, should ideally not happen
  };

  const form = useForm<EditTripFormValues>({
    resolver: zodResolver(editTripFormSchema),
    defaultValues: {
      tripDate: getInitialDate(trip.tripDate),
      driverName: trip.driverName || "",
      startTime: trip.startTime || "",
      endTime: trip.endTime || "",
      startMileage: trip.startMileage?.toString() || "0",
      endMileage: trip.endMileage?.toString() || "0",
      tripDetails: trip.tripDetails || "",
    },
  });

  useEffect(() => {
    form.reset({
        tripDate: getInitialDate(trip.tripDate),
        driverName: trip.driverName || "",
        startTime: trip.startTime || "",
        endTime: trip.endTime || "",
        startMileage: trip.startMileage?.toString() || "0",
        endMileage: trip.endMileage?.toString() || "0",
        tripDetails: trip.tripDetails || "",
    });
  }, [trip, form]);

  async function onSubmit(values: EditTripFormValues) {
    if (!trip.id) return;
    // TripFormData expects mileage as strings, which they already are from the form
    const dataToSave: TripFormData = {
      ...values,
      startMileage: values.startMileage,
      endMileage: values.endMileage,
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
                <FormLabel>End Time</FormLabel>
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
