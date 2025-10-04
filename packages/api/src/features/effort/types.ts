import { z } from 'zod';

export const EffortRequestSchema = z.object({
  date: z.iso.date(),
  email: z.email(),
  effort: z.string(),
});

export const EffortResponseSchema = z.object({
  message: z.string(),
});

export type EffortRequest = z.infer<typeof EffortRequestSchema>;

export type EffortResponse = z.infer<typeof EffortResponseSchema>;

export interface ParsedEffort {
  project_name: string;
  taskName: string;
  estimated_hours: number | null;
  hours: number | null;
}
