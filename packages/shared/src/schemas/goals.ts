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

const optionalProgressSchema = z
  .preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number().min(0).max(100),
  )
  .optional();

export const GOAL_HISTORY_SORT_OPTIONS = [
  "title",
  "-title",
  "weight",
  "-weight",
  "progress",
  "-progress",
  "start_date",
  "-start_date",
  "end_date",
  "-end_date",
] as const;

export const GoalHistoryQuerySchema = z
  .object({
    query: z.string().optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
    minProgress: optionalProgressSchema,
    maxProgress: optionalProgressSchema,
    sort: z.enum(GOAL_HISTORY_SORT_OPTIONS).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((value, ctx) => {
    if (
      value.minProgress !== undefined &&
      value.maxProgress !== undefined &&
      value.minProgress > value.maxProgress
    ) {
      ctx.addIssue({
        code: "custom",
        message: "minProgress must be less than or equal to maxProgress",
        path: ["minProgress"],
      });
    }
  });

export const GoalHistoryItemSchema = GoalSchema;

export const GoalHistoryResponseSchema = z.object({
  items: GoalHistoryItemSchema.array(),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  aggregations: z.object({
    totalCount: z.number(),
  }),
});

export const GOAL_PROGRESS_SOURCE_VALUES = ["history", "goal"] as const;

export const GoalPreviousWeekQuerySchema = z.object({
  referenceDate: z.iso.date(),
});

export const GoalPreviousWeekProgressSchema = z.object({
  referenceDate: z.iso.date(),
  previousWeekEnd: z.iso.date(),
  progress: z.array(
    z.object({
      goal_id: z.number(),
      progress: z.number(),
      recorded_at: z.iso.date(),
      source: z.enum(GOAL_PROGRESS_SOURCE_VALUES),
    }),
  ),
});

export type GoalGetResponse = z.infer<typeof GetGoalResponseSchema>;

export type GoalCreateRequest = z.infer<typeof CreateGoalRequestSchema>;

export type GoalCreateResponse = z.infer<typeof CreateGoalResponseSchema>;

export type GoalUpdateRequest = z.infer<typeof UpdateGoalRequestSchema>;

export type GoalUpdateResponse = z.infer<typeof UpdateGoalResponseSchema>;

export type GoalHistoryQuery = z.infer<typeof GoalHistoryQuerySchema>;

export type GoalHistoryResponse = z.infer<typeof GoalHistoryResponseSchema>;

export type GoalPreviousWeekQuery = z.infer<typeof GoalPreviousWeekQuerySchema>;

export type GoalPreviousWeekProgress = z.infer<
  typeof GoalPreviousWeekProgressSchema
>;

export type GoalHistorySortOption = (typeof GOAL_HISTORY_SORT_OPTIONS)[number];
