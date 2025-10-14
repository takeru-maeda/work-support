import { SupabaseClient } from "@supabase/supabase-js";
import { ParsedEffort } from "./types";
import { Database } from "../../../../shared/src/schemas/db";
import { findOrCreateTask, findProject, insertWorkRecord } from "./repository";
import { Dayjs } from "dayjs";
import { AppError } from "../../lib/errors";

export async function saveEffortRecords(
  supabase: SupabaseClient<Database>,
  userId: string,
  workDate: Date | Dayjs,
  effortText: string,
): Promise<void> {
  const projectCache: Record<string, number> = {};
  const taskCache: Record<string, number> = {};

  const parsedEfforts: ParsedEffort[] = parseEffortText(effortText);
  if (!parsedEfforts.length) {
    throw new AppError(400, "工数の値が不正です。登録件数が0件でした。");
  }

  for (const effort of parsedEfforts) {
    const projectId: number = (projectCache[effort.project_name] ??=
      await findProject(supabase, userId, effort));

    const taskId: number = (taskCache[effort.taskName] ??=
      await findOrCreateTask(supabase, projectId, effort.taskName));

    await insertWorkRecord(supabase, userId, taskId, workDate, effort);
  }
}

export function parseEffortText(effortText: string): ParsedEffort[] {
  const lines: string[] = effortText.split("\n");
  const regExp: RegExp = RegExp(/^\u30fb(.+?)：\[(.*?)\]<(.*?)>$/);

  const parsedEfforts: ParsedEffort[] = [];
  let currentProjectName: string | null = null;

  for (const line of lines) {
    const trimmedLine: string = line.trim();

    if (trimmedLine.startsWith("■")) {
      currentProjectName = trimmedLine.substring(1).trim();
    } else if (trimmedLine.startsWith("・") && currentProjectName) {
      const parsedEffort: ParsedEffort | null = parseTaskText(
        trimmedLine,
        currentProjectName,
        regExp,
      );
      if (!parsedEffort) continue;
      parsedEfforts.push(parsedEffort);
    }
  }

  return parsedEfforts;
}

function parseTaskText(
  line: string,
  pjName: string,
  regExp: RegExp,
): ParsedEffort | null {
  const match: RegExpMatchArray | null = regExp.exec(line);
  if (!match) return null;

  const taskName: string = match[1].trim();
  const estimated_hours_str: string = match[2] ? match[2].trim() : "";
  const hours_str: string = match[3] ? match[3].trim() : "";

  const estimated_hours: number | null =
    estimated_hours_str === "" ? null : parseFloat(estimated_hours_str);
  const hours: number | null = hours_str === "" ? null : parseFloat(hours_str);

  return {
    project_name: pjName,
    taskName,
    estimated_hours,
    hours,
  };
}
