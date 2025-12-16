import { z } from "zod";

/**
 * プロジェクトのスキーマです。
 */
export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

/**
 * タスクのスキーマです。
 */
export const TaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.iso.datetime({ offset: true }),
});

/**
 * タスク付きプロジェクトのスキーマです。
 */
export const ProjectWithTasksSchema = ProjectSchema.extend({
  tasks: z.array(TaskSchema),
});

/**
 * プロジェクト一覧レスポンスのスキーマです。
 */
export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectWithTasksSchema),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type ProjectWithTasks = z.infer<typeof ProjectWithTasksSchema>;
export type ProjectsResponse = z.infer<typeof ProjectsResponseSchema>;
