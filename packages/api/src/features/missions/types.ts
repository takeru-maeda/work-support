import { z } from 'zod';

export const MissionSchema = z.object({
  id: z.number(),
  user_id: z.uuid(),
  content: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
});

export const GetMissionResponseSchema = z.object({
  mission: MissionSchema.nullable(),
});

export const UpdateMissionRequestSchema = z.object({
  content: z.string().min(1),
});

export const UpdateMissionResponseSchema = z.object({
  mission: MissionSchema,
});

export type MissionGetResponse = z.infer<typeof GetMissionResponseSchema>;

export type MissionUpdateRequest = z.infer<typeof UpdateMissionRequestSchema>;

export type MissionUpdateResponse = z.infer<typeof UpdateMissionResponseSchema>;
