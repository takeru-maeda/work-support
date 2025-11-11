import { SupabaseClient } from "@supabase/supabase-js";
import { ParsedEffort } from "./types";
import { Database, Tables } from "../../../../shared/src/types/db";
import {
  createProject,
  createTask,
  deleteWorkEntryDraft,
  findOrCreateTask,
  findProject,
  getProjectById,
  getProjectByName,
  getTaskById,
  getTaskByName,
  getWorkEntryDraftByUser,
  insertWorkEntryDraft,
  insertWorkRecord,
  updateWorkEntryDraft,
} from "./repository";
import { Dayjs } from "dayjs";
import { AppError } from "../../lib/errors";
import type {
  EffortDraft,
  EffortDraftRecord,
  EffortDraftUpsertResponse,
  EffortEntriesRequest,
  EffortEntriesResponse,
  EffortEntry,
} from "./types";
import type { AuthenticatedUser, HonoEnv } from "../../custom-types";
import { getUserSettingsByUserId } from "../user-settings/repository";
import { type Logger } from "../../lib/logger";
import { sendEffortCompletionEmail } from "../../lib/mailer";

interface StructuredEffortResult {
  record: Tables<"work_records">;
  project: Tables<"projects">;
  task: Tables<"tasks">;
  entry: EffortEntry;
}

interface StructuredEffortSaveResult {
  savedRecords: StructuredEffortResult[];
  response: EffortEntriesResponse;
  date: Date;
}

const INDENT = "　";

/**
 * 工数テキストを解析して記録します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param workDate 作業日
 * @param effortText 工数入力テキスト
 */
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

/**
 * 構造化工数を保存します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param payload 工数入力データ
 * @returns 保存結果
 */
export const saveStructuredEffortEntries = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: EffortEntriesRequest,
): Promise<StructuredEffortSaveResult> => {
  const { entries } = payload;
  if (!entries.length) {
    throw new AppError(400, "工数の値が不正です。登録件数が0件でした。");
  }

  const workDate = new Date(payload.date);
  if (Number.isNaN(workDate.getTime())) {
    throw new AppError(400, "日付の形式が不正です。");
  }

  const projectCacheById = new Map<number, Tables<"projects">>();
  const projectCacheByName = new Map<string, Tables<"projects">>();
  const taskCacheById = new Map<number, Tables<"tasks">>();
  const taskCacheByName = new Map<string, Tables<"tasks">>();

  const savedRecords: StructuredEffortResult[] = [];

  for (const entry of entries) {
    if (entry.estimated_hours != null && entry.estimated_hours < 0) {
      throw new AppError(400, "見積工数は0以上を指定してください。");
    }

    const project: Tables<"projects"> = await resolveProject(
      supabase,
      userId,
      entry,
      projectCacheById,
      projectCacheByName,
    );

    const task: Tables<"tasks"> = await resolveTask(
      supabase,
      project,
      entry,
      taskCacheById,
      taskCacheByName,
    );

    const parsed: ParsedEffort = {
      project_name: project.name,
      taskName: task.name,
      estimated_hours: entry.estimated_hours,
      hours: entry.hours,
    };

    const record: Tables<"work_records"> = await insertWorkRecord(
      supabase,
      userId,
      task.id,
      workDate,
      parsed,
    );

    savedRecords.push({ record, project, task, entry });
  }

  const response: EffortEntriesResponse = {
    saved: savedRecords.map(({ record, project, task }) => ({
      entry_id: record.id,
      project_id: project.id,
      task_id: task.id,
      hours: record.hours,
      estimated_hours: record.estimated_hours,
    })),
  };

  return { savedRecords, response, date: workDate };
};

/**
 * 工数テキストを解析します。
 *
 * @param effortText 工数入力テキスト
 * @returns 解析結果
 */
export function parseEffortText(effortText: string): ParsedEffort[] {
  const lines: string[] = effortText.split("\n");
  const regExp: RegExp = new RegExp(/^\u30fb(.+?)：\[(.*?)\]<(.*?)>$/);

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

/**
 * 工数ドラフトを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns 工数ドラフト
 */
export const getEffortDraftService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EffortDraftRecord | null> => {
  return await getWorkEntryDraftByUser(supabase, userId);
};

/**
 * 工数ドラフトを保存します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param draft 工数ドラフト
 * @returns 保存結果
 */
export const upsertEffortDraftService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  draft: EffortDraft,
): Promise<EffortDraftUpsertResponse> => {
  const existing: EffortDraftRecord | null = await getWorkEntryDraftByUser(
    supabase,
    userId,
  );
  const incoming: number = new Date(draft.clientUpdatedAt).getTime();

  if (existing) {
    const serverTime = new Date(existing.client_updated_at).getTime();
    if (serverTime >= incoming) {
      return {
        applied: false,
        reason: "Stale clientUpdatedAt",
      };
    }
    const updated: EffortDraftRecord = await updateWorkEntryDraft(
      supabase,
      userId,
      draft,
    );
    return {
      applied: true,
      draft: {
        user_id: updated.user_id,
        date: updated.date,
        updated_at: updated.updated_at,
      },
    };
  }

  const inserted: EffortDraftRecord = await insertWorkEntryDraft(
    supabase,
    userId,
    draft,
  );
  return {
    applied: true,
    draft: {
      user_id: inserted.user_id,
      date: inserted.date,
      updated_at: inserted.updated_at,
    },
  };
};

/**
 * 工数ドラフトを削除します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 */
export const deleteEffortDraftService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> => {
  await deleteWorkEntryDraft(supabase, userId);
};

/**
 * 工数登録完了メールの本文を生成します。
 *
 * @param date 登録日
 * @param entries 保存した工数
 * @param memo メモ
 * @returns メール内容
 */
export const buildEffortCompletionEmail = (
  date: Date,
  entries: StructuredEffortResult[],
  memo: string | null,
): { subject: string; body: string } => {
  const formattedDate: string = formatMailDate(date);
  const subject = `${formattedDate} 工数を登録しました`;

  const grouped = new Map<
    number,
    { project: Tables<"projects">; items: StructuredEffortResult[] }
  >();
  for (const entry of entries) {
    const existing = grouped.get(entry.project.id);
    if (existing) {
      existing.items.push(entry);
    } else {
      grouped.set(entry.project.id, { project: entry.project, items: [entry] });
    }
  }

  const lines: string[] = [];
  lines.push("--- 日付 ---", formattedDate, "", "--- エントリ ---");

  let totalEstimated = 0;
  let totalActual = 0;
  let totalActualWithEstimate = 0;

  for (const { project, items } of grouped.values()) {
    lines.push(`■${project.name}`);

    let projectEstimated = 0;
    let projectActual = 0;
    let projectActualWithEstimate = 0;

    for (const item of items) {
      const estimated: number | null = item.entry.estimated_hours ?? null;
      const actual: number = item.entry.hours;
      projectEstimated += estimated ?? 0;
      projectActual += actual;
      if (estimated !== null) {
        projectActualWithEstimate += actual;
      }

      const diffText =
        estimated === null ? "" : formatDiff(actual - estimated);
      lines.push(
        `・${item.task.name}`,
        `${INDENT}見積：${formatHoursOrDash(estimated)}   実績：${formatHoursValue(actual)}${diffText}`,
      );
    }

    totalEstimated += projectEstimated;
    totalActual += projectActual;
    totalActualWithEstimate += projectActualWithEstimate;
    lines.push("");
  }

  lines.push("", "--- 集計 ---", "■案件別");

  for (const { project, items } of grouped.values()) {
    const projectHasEstimate = items.some(
      (item) => item.entry.estimated_hours !== null,
    );
    const projectEstimated: number = items.reduce(
      (sum, item) => sum + (item.entry.estimated_hours ?? 0),
      0,
    );
    const projectActual: number = items.reduce(
      (sum, item) => sum + item.entry.hours,
      0,
    );
    const projectActualWithEstimate: number = items.reduce(
      (sum, item) =>
        item.entry.estimated_hours === null ? sum : sum + item.entry.hours,
      0,
    );
    const diff = projectActualWithEstimate - projectEstimated;
    lines.push(
      `・${project.name}`,
      `${INDENT}見積：${projectHasEstimate ? formatHoursValue(projectEstimated) : "-"}   実績：${formatHoursValue(projectActual)}${projectHasEstimate ? formatDiff(diff) : ""}`,
    );
  }

  const hasAnyEstimate = entries.some(
    (record) => record.entry.estimated_hours !== null,
  );
  const totalDiff = totalActualWithEstimate - totalEstimated;
  lines.push(
    "",
    "■全体",
    `見積：${hasAnyEstimate ? formatHoursValue(totalEstimated) : "-"}   実績：${formatHoursValue(totalActual)}${hasAnyEstimate ? formatDiff(totalDiff) : ""}`,
  );

  if (memo && memo.trim().length > 0) {
    lines.push("", "--- メモ ---", memo.trim());
  }

  return {
    subject,
    body: lines.join("\n"),
  };
};

/**
 * 必要に応じて工数登録完了メールを送信します。
 *
 * @param supabase Supabaseクライアント
 * @param bindings 環境変数
 * @param user ユーザー情報
 * @param result 保存結果
 * @param logger ロガー
 * @param accessLogId アクセスログID
 */
export const sendEffortCompletionEmailIfNeeded = async (
  supabase: SupabaseClient<Database>,
  bindings: HonoEnv["Bindings"],
  user: AuthenticatedUser,
  result: StructuredEffortSaveResult,
  logger: Logger | undefined,
  accessLogId: number,
  memo: string | null,
): Promise<void> => {
  if (!user.email) return;
  if (!result.savedRecords.length) return;

  const settings: Tables<"user_settings"> | null =
    await getUserSettingsByUserId(supabase, user.id);
  if (settings && settings.notify_effort_email === false) return;

  const { subject, body } = buildEffortCompletionEmail(
    result.date,
    result.savedRecords,
    memo,
  );

  await sendEffortCompletionEmail(bindings, {
    to: user.email,
    subject,
    body,
    accessLogId,
  });
};

/**
 * タスク行を解析します。
 */
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
    estimated_hours_str === "" ? null : Number.parseFloat(estimated_hours_str);
  const hours: number | null =
    hours_str === "" ? null : Number.parseFloat(hours_str);

  return {
    project_name: pjName,
    taskName,
    estimated_hours,
    hours,
  };
}

/**
 * 案件を解決します。
 */
const resolveProject = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  entry: EffortEntry,
  cacheById: Map<number, Tables<"projects">>,
  cacheByName: Map<string, Tables<"projects">>,
): Promise<Tables<"projects">> => {
  if (entry.project_id !== null) {
    const cached: Tables<"projects"> | undefined = cacheById.get(
      entry.project_id,
    );
    if (cached) return cached;

    const project: Tables<"projects"> | null = await getProjectById(
      supabase,
      userId,
      entry.project_id,
    );
    if (!project) {
      throw new AppError(400, "指定した案件が見つかりませんでした。");
    }
    cacheById.set(project.id, project);
    cacheByName.set(project.name.toLowerCase(), project);
    return project;
  }

  const name = entry.project_name?.trim();
  if (!name) {
    throw new AppError(400, "新規案件を作成する場合は案件名が必要です。");
  }

  const key = name.toLowerCase();
  const cached: Tables<"projects"> | undefined = cacheByName.get(key);
  if (cached) return cached;

  const existing: Tables<"projects"> | null = await getProjectByName(
    supabase,
    userId,
    name,
  );
  if (existing) {
    cacheById.set(existing.id, existing);
    cacheByName.set(key, existing);
    return existing;
  }

  const created: Tables<"projects"> = await createProject(
    supabase,
    userId,
    name,
  );
  cacheById.set(created.id, created);
  cacheByName.set(key, created);
  return created;
};

/**
 * タスクを解決します。
 */
const resolveTask = async (
  supabase: SupabaseClient<Database>,
  project: Tables<"projects">,
  entry: EffortEntry,
  cacheById: Map<number, Tables<"tasks">>,
  cacheByName: Map<string, Tables<"tasks">>,
): Promise<Tables<"tasks">> => {
  if (typeof entry.hours !== "number" || Number.isNaN(entry.hours)) {
    throw new AppError(400, "工数の時間が不正です。");
  }
  if (entry.hours < 0) {
    throw new AppError(400, "工数の時間は0以上を指定してください。");
  }

  if (entry.task_id !== null) {
    const cached: Tables<"tasks"> | undefined = cacheById.get(entry.task_id);
    if (cached) return cached;

    const task: Tables<"tasks"> | null = await getTaskById(
      supabase,
      project.id,
      entry.task_id,
    );
    if (!task) {
      throw new AppError(400, "指定したタスクが見つかりませんでした。");
    }
    if (task.project_id !== project.id) {
      throw new AppError(400, "タスクが指定した案件に属していません。");
    }
    cacheById.set(task.id, task);
    cacheByName.set(taskKey(project.id, task.name), task);
    return task;
  }

  const name = entry.task_name?.trim();
  if (!name) {
    throw new AppError(400, "新規タスクを作成する場合はタスク名が必要です。");
  }

  const key = taskKey(project.id, name);
  const cached: Tables<"tasks"> | undefined = cacheByName.get(key);
  if (cached) return cached;

  const existing: Tables<"tasks"> | null = await getTaskByName(
    supabase,
    project.id,
    name,
  );
  if (existing) {
    cacheById.set(existing.id, existing);
    cacheByName.set(key, existing);
    return existing;
  }

  const created = await createTask(supabase, project.id, name);
  cacheById.set(created.id, created);
  cacheByName.set(key, created);
  return created;
};

/**
 * タスクキャッシュ用キーを生成します。
 */
const taskKey = (projectId: number, name: string): string => {
  return `${projectId}::${name.toLowerCase()}`;
};

/**
 * メール日付をyyyy/MM/dd形式に整形します。
 */
const formatMailDate = (date: Date): string => {
  const normalized = new Date(date);
  const year: number = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, "0");
  const day = String(normalized.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
};

/**
 * 時間を h 単位で整形します。
 */
const formatHoursValue = (value: number): string => {
  const rounded: number = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.0+$/, "").replace(/0+$/, "");
  return `${text}h`;
};

const formatHoursOrDash = (value: number | null): string => {
  if (value === null) return "-";
  return formatHoursValue(value);
};

/**
 * 差分を整形します。
 */
const formatDiff = (diff: number): string => {
  if (Math.abs(diff) < 1e-9) {
    return "（±0h）";
  }
  const sign = diff > 0 ? "+" : "-";
  const value = formatHoursValue(Math.abs(diff));
  return `（${sign}${value}）`;
};
