import { z } from "zod";

export const GoalSchema = z.object({
  id: z.number(),
  user_id: z.uuid(),
  title: z.string(),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  progress: z.number(),
  weight: z.number(),
  content: z.string(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export const GetGoalResponseSchema = z.object({
  goals: GoalSchema.array(),
});

export const CreateGoalRequestSchema = z.object({
  title: z.string().min(1),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  weight: z.number().min(0).max(100),
  content: z.string(),
});

export const CreateGoalResponseSchema = z.object({
  created: GoalSchema,
});

export const UpdateGoalRequestSchema = z.object({
  title: z.string().min(1).optional(),
  start_date: z.iso.date().optional(),
  end_date: z.iso.date().optional(),
  weight: z.number().min(0).max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  content: z.string().optional(),
});

export const UpdateGoalResponseSchema = z.object({
  updated: GoalSchema,
});

export type GoalGetResponse = z.infer<typeof GetGoalResponseSchema>;

export type GoalCreateRequest = z.infer<typeof CreateGoalRequestSchema>;

export type GoalCreateResponse = z.infer<typeof CreateGoalResponseSchema>;

export type GoalUpdateRequest = z.infer<typeof UpdateGoalRequestSchema>;

export type GoalUpdateResponse = z.infer<typeof UpdateGoalResponseSchema>;
