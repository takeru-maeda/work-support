import { z } from "zod";

export const EmailRequestSchema = z.object({
  to: z.email(),
  subject: z.string(),
  body: z.string(),
  apikey: z.string(),
});

export const EmailResponseSchema = z.object({
  success: z.boolean(),
  status: z.number(),
  message: z.string(),
});

export type EmailRequest = z.infer<typeof EmailRequestSchema>;
export type EmailResponse = z.infer<typeof EmailResponseSchema>;
