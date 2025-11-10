import { z } from "zod";

export const WorkRecordSortSchema = z.enum([
  "date",
  "-date",
  "project",
  "-project",
  "task",
  "-task",
  "estimated_hours",
  "-estimated_hours",
  "hours",
  "-hours",
  "diff",
  "-diff",
]);

export const WorkRecordListQuerySchema = z.object({
  date: z.iso.date().optional(),
  projectId: z.coerce.number().int().optional(),
  taskId: z.coerce.number().int().optional(),
  sort: WorkRecordSortSchema.optional().default("-date"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const WorkRecordItemSchema = z.object({
  id: z.number(),
  date: z.iso.date(),
  project: z.string(),
  project_id: z.number(),
  task: z.string(),
  task_id: z.number(),
  estimated_hours: z.number().nullable(),
  hours: z.number(),
  diff: z.number().nullable(),
});

export const WorkRecordListResponseSchema = z.object({
  items: z.array(WorkRecordItemSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type WorkRecordSort = z.infer<typeof WorkRecordSortSchema>;
export type WorkRecordListQuery = z.infer<typeof WorkRecordListQuerySchema>;
export type WorkRecordItem = z.infer<typeof WorkRecordItemSchema>;
export type WorkRecordListResponse = z.infer<
  typeof WorkRecordListResponseSchema
>;
