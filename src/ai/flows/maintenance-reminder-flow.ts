'use server';
/**
 * @fileOverview Analyzes trip details to provide maintenance reminders to the manager.
 *
 * - getMaintenanceSuggestion - A function that generates maintenance suggestions based on trip details.
 * - MaintenanceReminderInput - The input type for the getMaintenanceSuggestion function.
 * - MaintenanceReminderOutput - The return type for the getMaintenanceSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MaintenanceReminderInputSchema = z.object({
  tripDetailsList: z.array(z.string()).describe('A list of trip detail strings from recent trips.'),
});
export type MaintenanceReminderInput = z.infer<typeof MaintenanceReminderInputSchema>;

const MaintenanceReminderOutputSchema = z.object({
  suggestion: z.string().nullable().describe('A concise maintenance suggestion for the manager, or null if no specific suggestion is generated.'),
});
export type MaintenanceReminderOutput = z.infer<typeof MaintenanceReminderOutputSchema>;

export async function getMaintenanceSuggestion(input: MaintenanceReminderInput): Promise<MaintenanceReminderOutput> {
  const validTripDetails = input.tripDetailsList.filter(details => typeof details === 'string' && details.trim() !== "");
  
  if (validTripDetails.length === 0) {
    return { suggestion: null }; // No details to analyze
  }
  
  // Only run if there's a reasonable amount of data to analyze - e.g. at least one non-empty detail string
  if (validTripDetails.length < 1) {
     return { suggestion: null }; // Not enough data
  }

  return maintenanceReminderFlow({ tripDetailsList: validTripDetails });
}

const prompt = ai.definePrompt({
  name: 'maintenanceReminderPrompt',
  input: {schema: MaintenanceReminderInputSchema},
  output: {schema: MaintenanceReminderOutputSchema},
  prompt: `You are an assistant helping a fleet manager. Review the following trip details.
Focus on identifying mentions related to vehicle 'cleaning' or 'fuel' needs that might require the manager's attention or planning.
If you find any relevant patterns (e.g., multiple mentions of low fuel, requests for cleaning), provide a concise, actionable suggestion for the manager.
For example:
- "Several recent trips mentioned low fuel. Consider reminding drivers about refueling policies or checking fuel card usage."
- "Requests for vehicle cleaning have appeared in recent trip notes. It might be time to schedule cleanings for the fleet."
- "A trip mentioned 'urgent refuel needed'. Check if this was an isolated incident or a recurring issue."

If no significant or actionable 'cleaning' or 'fuel' related maintenance needs are apparent from these details, set the suggestion to null. Do not return messages like "No suggestions".

Trip Details:
{{#each tripDetailsList}}
- {{{this}}}
{{/each}}
`,
});

const maintenanceReminderFlow = ai.defineFlow(
  {
    name: 'maintenanceReminderFlow',
    inputSchema: MaintenanceReminderInputSchema,
    outputSchema: MaintenanceReminderOutputSchema,
  },
  async (input: MaintenanceReminderInput) => {
    const {output} = await prompt(input);
    // Ensure output is not undefined, and if the suggestion is an empty string from LLM, treat it as null.
    if (!output || output.suggestion?.trim() === "") {
      return { suggestion: null };
    }
    // Filter out generic negative responses that might slip through
    const lowerSuggestion = output.suggestion.toLowerCase();
    if (lowerSuggestion.includes("no specific") || lowerSuggestion.includes("no maintenance suggestion") || lowerSuggestion.includes("no reminders")) {
        return { suggestion: null };
    }
    return { suggestion: output.suggestion };
  }
);
