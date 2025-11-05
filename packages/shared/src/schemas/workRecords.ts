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
  project: z.string().optional(),
  task: z.string().optional(),
  sort: WorkRecordSortSchema.optional().default("-date"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const WorkRecordItemSchema = z.object({
  id: z.number(),
  date: z.iso.date(),
  project: z.string(),
  task: z.string(),
  estimated_hours: z.number().nullable(),
  hours: z.number(),
  diff: z.number(),
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
