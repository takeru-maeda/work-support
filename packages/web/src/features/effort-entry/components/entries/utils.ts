import type {
  EffortEntry,
  EffortEntryError,
} from "@/features/effort-entry/types";

export const getProjectGroupKey = (entry: EffortEntry): string => {
  if (entry.projectId !== null) {
    return `project:${entry.projectId}`;
  }
  if (entry.projectGroupId) {
    return `group:${entry.projectGroupId}`;
  }
  if (entry.projectName.trim().length > 0) {
    return `name:${entry.projectName.trim().toLowerCase()}`;
  }
  return `entry:${entry.id}`;
};

export const projectErrorMessage = (
  entries: EffortEntry[],
  entryErrors: Record<string, EffortEntryError | undefined>,
): string | undefined => {
  for (const entry of entries) {
    const message = entryErrors[entry.id]?.project;
    if (message) return message;
  }
  return undefined;
};
