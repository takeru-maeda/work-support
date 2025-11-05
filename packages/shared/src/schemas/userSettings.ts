import { z } from "zod";

export const UserSettingsSchema = z.object({
  id: z.number(),
  notify_effort_email: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }),
});

export const UserSettingsResponseSchema = z.object({
  user_settings: UserSettingsSchema,
});

export const UpdateUserSettingsRequestSchema = z.object({
  notifyEffortEmail: z.boolean(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type UserSettingsResponse = z.infer<typeof UserSettingsResponseSchema>;
export type UpdateUserSettingsRequest = z.infer<
  typeof UpdateUserSettingsRequestSchema
>;
