import { z } from 'zod';

/**
 * ミッションのスキーマです。
 */
export const MissionSchema = z.object({
  id: z.number(),
  user_id: z.uuid(),
  content: z.string().nullable(),
  updated_at: z.iso.datetime({ offset: true }),
});

/**
 * ミッション取得レスポンスのスキーマです。
 *
 * GET /api/missions
 */
export const GetMissionResponseSchema = z.object({
  mission: MissionSchema.nullable(),
});

/**
 * ミッション更新リクエストのスキーマです。
 *
 * PUT /api/missions
 */
export const UpdateMissionRequestSchema = z.object({
  content: z.string().min(1),
});

/**
 * ミッション更新レスポンスのスキーマです。
 *
 * PUT /api/missions
 */
export const UpdateMissionResponseSchema = z.object({
  mission: MissionSchema,
});

export type MissionGetResponse = z.infer<typeof GetMissionResponseSchema>;

export type MissionUpdateRequest = z.infer<typeof UpdateMissionRequestSchema>;

export type MissionUpdateResponse = z.infer<typeof UpdateMissionResponseSchema>;
