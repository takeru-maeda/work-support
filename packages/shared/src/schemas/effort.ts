import { z } from "zod";

export const EffortEntrySchema = z.object({
  project_id: z.number().nullable(),
  project_name: z.string().nullable(),
  task_id: z.number().nullable(),
  task_name: z.string().nullable(),
  estimated_hours: z.number().nullable(),
  hours: z.number(),
});

export const EffortEntriesRequestSchema = z.object({
  date: z.iso.date(),
  entries: z.array(EffortEntrySchema),
});

export const EffortEntriesResponseSchema = z.object({
  saved: z.array(
    z.object({
      entry_id: z.number(),
      project_id: z.number(),
      task_id: z.number(),
      hours: z.number(),
      estimated_hours: z.number().nullable(),
    }),
  ),
});

export const EffortDraftSchema = EffortEntriesRequestSchema.extend({
  memo: z.string().nullable().optional(),
  clientUpdatedAt: z.iso.date(),
});

export const EffortDraftRecordSchema = z.object({
  entries: z.array(EffortEntrySchema),
  memo: z.string().nullable(),
  date: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
  client_updated_at: z.iso.datetime({ offset: true }),
  user_id: z.uuid(),
});

export const EffortDraftResponseSchema = z.object({
  draft: z.object({
    entries: z.array(EffortEntrySchema),
    memo: z.string().nullable(),
    date: z.string().nullable(),
    updated_at: z.iso.datetime({ offset: true }),
    client_updated_at: z.iso.datetime({ offset: true }),
  }),
});

export const EffortDraftUpsertResponseSchema = z.object({
  applied: z.boolean(),
  reason: z.string().optional(),
  draft: z
    .object({
      user_id: z.uuid(),
      date: z.string().nullable(),
      updated_at: z.iso.datetime({ offset: true }),
    })
    .optional(),
});

export type EffortEntry = z.infer<typeof EffortEntrySchema>;
export type EffortEntriesRequest = z.infer<typeof EffortEntriesRequestSchema>;
export type EffortEntriesResponse = z.infer<typeof EffortEntriesResponseSchema>;
export type EffortDraft = z.infer<typeof EffortDraftSchema>;
export type EffortDraftRecord = z.infer<typeof EffortDraftRecordSchema>;
export type EffortDraftUpsertResponse = z.infer<
  typeof EffortDraftUpsertResponseSchema
>;
export type EffortDraftResponse = z.infer<typeof EffortDraftResponseSchema>;
