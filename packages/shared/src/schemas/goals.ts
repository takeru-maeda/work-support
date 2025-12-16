import { z } from "zod";

/**
 * 目標のスキーマです。
 */
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

/**
 * 目標取得レスポンスのスキーマです。
 *
 * GET /api/goals/current
 */
export const GetGoalResponseSchema = z.object({
  goals: GoalSchema.array(),
});

/**
 * 目標作成リクエストのスキーマです。
 *
 * POST /api/goals
 */
export const CreateGoalRequestSchema = z.object({
  title: z.string().min(1),
  start_date: z.iso.date(),
  end_date: z.iso.date(),
  weight: z.number().min(0).max(100),
  content: z.string(),
});

/**
 * 目標作成レスポンスのスキーマです。
 *
 * POST /api/goals
 */
export const CreateGoalResponseSchema = z.object({
  created: GoalSchema,
});

/**
 * 目標更新リクエストのスキーマです。
 *
 * PUT /api/goals/:id
 */
export const UpdateGoalRequestSchema = z.object({
  title: z.string().min(1).optional(),
  start_date: z.iso.date().optional(),
  end_date: z.iso.date().optional(),
  weight: z.number().min(0).max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  content: z.string().optional(),
});

/**
 * 目標更新レスポンスのスキーマです。
 *
 * PUT /api/goals/:id
 */
export const UpdateGoalResponseSchema = z.object({
  updated: GoalSchema,
});

/**
 * 進捗率のオプショナルスキーマです。
 */
const optionalProgressSchema = z
  .preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number().min(0).max(100),
  )
  .optional();

/**
 * 目標履歴のソートオプションです。
 */
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

/**
 * 目標履歴検索クエリのスキーマです。
 *
 * GET /api/goals/history
 */
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

/**
 * 目標履歴アイテムのスキーマです。
 */
export const GoalHistoryItemSchema = GoalSchema;

/**
 * 目標履歴レスポンスのスキーマです。
 *
 * GET /api/goals/history
 */
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

/**
 * 目標進捗ソースの値です。
 */
export const GOAL_PROGRESS_SOURCE_VALUES = ["history", "goal"] as const;

/**
 * 前週進捗クエリのスキーマです。
 *
 * GET /api/goals/progress/previous-week
 */
export const GoalPreviousWeekQuerySchema = z.object({
  referenceDate: z.iso.date(),
});

/**
 * 前週進捗レスポンスのスキーマです。
 *
 * GET /api/goals/progress/previous-week
 */
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
