// Summarize the trip details from the 'Trip Details' text field using GenAI.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTripDetailsInputSchema = z.object({
  tripDetails: z.string().describe('The trip details text to summarize.'),
});
export type SummarizeTripDetailsInput = z.infer<typeof SummarizeTripDetailsInputSchema>;

const SummarizeTripDetailsOutputSchema = z.object({
  summary: z.string().describe('A short summary of the trip details.'),
});
export type SummarizeTripDetailsOutput = z.infer<typeof SummarizeTripDetailsOutputSchema>;

export async function summarizeTripDetails(input: SummarizeTripDetailsInput): Promise<SummarizeTripDetailsOutput> {
  return summarizeTripDetailsFlow(input);
}

const summarizeTripDetailsPrompt = ai.definePrompt({
  name: 'summarizeTripDetailsPrompt',
  input: {schema: SummarizeTripDetailsInputSchema},
  output: {schema: SummarizeTripDetailsOutputSchema},
  prompt: `Summarize the following trip details in a concise manner:\n\nTrip Details: {{{tripDetails}}}`,
});

const summarizeTripDetailsFlow = ai.defineFlow(
  {
    name: 'summarizeTripDetailsFlow',
    inputSchema: SummarizeTripDetailsInputSchema,
    outputSchema: SummarizeTripDetailsOutputSchema,
  },
  async input => {
    const {output} = await summarizeTripDetailsPrompt(input);
    return output!;
  }
);
