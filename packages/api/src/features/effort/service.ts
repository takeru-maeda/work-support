import {
  isSavableWorkHours,
  MAX_WORK_HOURS_EXCLUSIVE,
} from "../../../../shared/src/utils/workHours";
import { AppError } from "../../lib/errors";
import { type Logger } from "../../lib/logger";
import { sendEffortCompletionEmail } from "../../lib/mailer";
import { fetchUserSettings } from "../user-settings/service";

import {
  deleteWorkEntryDraft,
  getWorkEntryDraftByUser,
  insertWorkEntryDraft,
  refreshProjectsWithTasksView,
  saveWorkRecords,
  updateWorkEntryDraft,
  WorkRecordTargetNotFoundError,
} from "./repository";

import type { EffortTextError, ParsedEffort, ParsedEffortText } from "./types";
import type {
  EffortDraft,
  EffortDraftRecord,
  EffortDraftUpsertResponse,
  EffortEntriesRequest,
  EffortEntriesResponse,
  EffortEntry,
  SavedWorkRecord,
  WorkRecordInput,
} from "./types";
import type { Database, Tables } from "../../../../shared/src/types/db";
import type { AuthenticatedUser, HonoEnv } from "../../customTypes";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Dayjs } from "dayjs";

/** 保存した 1 行。応答とメールに使う（名前は DB の関数が返す、決まった案件・タスクの名前） */
export interface StructuredEffortResult {
  record: Pick<SavedWorkRecord, "hours" | "estimated_hours"> & { id: number };
  project: { id: number; name: string };
  task: { id: number; name: string };
  entry: EffortEntry;
}

export interface StructuredEffortSaveResult {
  savedRecords: StructuredEffortResult[];
  response: EffortEntriesResponse;
  date: Date;
  /** この送信で新しく作った案件の名前（送信の順。MCP の log_effort が返す） */
  createdProjects: string[];
  /** この送信で新しく作ったタスク（送信の順） */
  createdTasks: { projectName: string; taskName: string }[];
}

const INDENT = "　";

/** 画面から指定した案件・タスクが見つからないときの文 */
const NOT_FOUND_MESSAGES: Record<
  WorkRecordTargetNotFoundError["target"],
  string
> = {
  project: "指定した案件が見つかりませんでした。",
  task: "指定したタスクが見つかりませんでした。",
};

/**
 * 工数テキストを解析して記録します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param workDate 作業日
 * @param effortText 工数入力テキスト
 * @param logger 候補の一覧の作り直しの失敗を残すロガー
 */
export async function saveEffortRecords(
  supabase: SupabaseClient<Database>,
  userId: string,
  workDate: Date | Dayjs,
  effortText: string,
  logger: Logger,
): Promise<void> {
  // 書き間違いがあれば、DB に触れる前にまとめて返す（読みながら保存すると、前半の行だけが残る）
  const { efforts: parsedEfforts, errors } = parseEffortText(effortText);
  if (errors.length > 0) {
    throw new AppError(400, formatEffortTextErrors(errors));
  }
  if (!parsedEfforts.length) {
    throw new AppError(400, "工数の値が不正です。登録件数が0件でした。");
  }

  // 名前で探し、大文字小文字を区別する（DB の関数の検索と同じ）
  const saved: SavedWorkRecord[] = await saveWorkRecords(
    supabase,
    userId,
    toWorkDate(workDate),
    parsedEfforts.map((effort) => ({
      project_id: null,
      project_name: effort.project_name,
      task_id: null,
      task_name: effort.taskName,
      estimated_hours: effort.estimated_hours,
      hours: effort.hours,
    })),
  );

  await refreshProjectsViewIfCreated(supabase, saved, logger);
}

/**
 * 構造化工数を保存します。DB に触れない検証をすべて先に済ませ、1 つでも誤りがあれば何も保存しません。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param payload 工数入力データ
 * @param logger 候補の一覧の作り直しの失敗を残すロガー
 * @returns 保存結果
 */
export const saveStructuredEffortEntries = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: EffortEntriesRequest,
  logger: Logger,
): Promise<StructuredEffortSaveResult> => {
  const { entries } = payload;
  if (!entries.length) {
    throw new AppError(400, "工数の値が不正です。登録件数が0件でした。");
  }

  const workDate = new Date(payload.date);
  if (Number.isNaN(workDate.getTime())) {
    throw new AppError(400, "日付の形式が不正です。");
  }

  const inputs: WorkRecordInput[] = entries.map(toWorkRecordInput);
  const saved: SavedWorkRecord[] = await saveWorkRecords(
    supabase,
    userId,
    payload.date,
    inputs,
  ).catch((error: unknown) => {
    if (error instanceof WorkRecordTargetNotFoundError) {
      throw new AppError(400, NOT_FOUND_MESSAGES[error.target], error);
    }
    throw error;
  });

  await refreshProjectsViewIfCreated(supabase, saved, logger);

  const savedRecords: StructuredEffortResult[] = saved.map((row, index) => ({
    record: {
      id: row.entry_id,
      hours: row.hours,
      estimated_hours: row.estimated_hours,
    },
    project: { id: row.project_id, name: row.project_name },
    task: { id: row.task_id, name: row.task_name },
    entry: entries[index],
  }));

  const response: EffortEntriesResponse = {
    saved: saved.map((row) => ({
      entry_id: row.entry_id,
      project_id: row.project_id,
      task_id: row.task_id,
      hours: row.hours,
      estimated_hours: row.estimated_hours,
    })),
  };

  return {
    savedRecords,
    response,
    date: workDate,
    createdProjects: saved
      .filter((row) => row.project_created)
      .map((row) => row.project_name),
    createdTasks: saved
      .filter((row) => row.task_created)
      .map((row) => ({
        projectName: row.project_name,
        taskName: row.task_name,
      })),
  };
};

/**
 * 画面からの 1 要素を検証し、`save_work_records` の入力に直します。
 * 検査の順番は、旧実装（要素ごとに見積 → 案件 → 実績 → タスク）と同じ。
 *
 * @param entry 画面からの 1 要素
 * @returns DB の関数の入力
 * @throws 名前が空、時間が負か 100 以上（小数第 2 位に丸めた値）のとき 400
 */
const toWorkRecordInput = (entry: EffortEntry): WorkRecordInput => {
  const estimated: number | null = entry.estimated_hours ?? null;
  if (estimated !== null && estimated < 0) {
    throw new AppError(400, "見積工数は0以上を指定してください。");
  }
  if (estimated !== null && !isSavableWorkHours(estimated)) {
    throw new AppError(400, "見積工数は100未満を指定してください。");
  }

  const projectName: string | null =
    entry.project_id === null ? (entry.project_name?.trim() ?? "") : null;
  if (projectName === "") {
    throw new AppError(400, "新規案件を作成する場合は案件名が必要です。");
  }

  if (typeof entry.hours !== "number" || Number.isNaN(entry.hours)) {
    throw new AppError(400, "工数の時間が不正です。");
  }
  if (entry.hours < 0) {
    throw new AppError(400, "工数の時間は0以上を指定してください。");
  }
  if (!isSavableWorkHours(entry.hours)) {
    throw new AppError(400, "工数の時間は100未満を指定してください。");
  }

  const taskName: string | null =
    entry.task_id === null ? (entry.task_name?.trim() ?? "") : null;
  if (taskName === "") {
    throw new AppError(400, "新規タスクを作成する場合はタスク名が必要です。");
  }

  return {
    project_id: entry.project_id,
    project_name: projectName,
    task_id: entry.task_id,
    task_name: taskName,
    estimated_hours: estimated,
    hours: entry.hours,
  };
};

/**
 * 案件かタスクを新しく作ったときだけ、候補の一覧を作り直します。保存はコミット済みなので、
 * 作り直しに失敗しても保存の成功として扱い、失敗は error_logs に残す（500 にすると、送り直しで 2 重になる）。
 *
 * @param supabase Supabaseクライアント
 * @param saved 保存した行
 * @param logger ロガー
 */
const refreshProjectsViewIfCreated = async (
  supabase: SupabaseClient<Database>,
  saved: SavedWorkRecord[],
  logger: Logger,
): Promise<void> => {
  if (!saved.some((row) => row.project_created || row.task_created)) return;
  try {
    await refreshProjectsWithTasksView(supabase);
  } catch (error) {
    await logger.error((error as Error).message, {
      stackTrace: (error as Error).stack ?? null,
    });
  }
};

/**
 * 作業日を YYYY-MM-DD にします（旧実装が送っていた toISOString() を、DB の date 型が読む日付と同じ）。
 *
 * @param workDate 作業日
 * @returns YYYY-MM-DD
 */
const toWorkDate = (workDate: Date | Dayjs): string =>
  workDate.toISOString().slice(0, 10);

/**
 * タスクの行の形。タスク名は、後ろが [<見積>]<実績> として読める最初の「：」まで。
 * 括弧の中に閉じ括弧を許すと、「<1>メモ>」のような書式の誤りが数値の誤りとして報告されるので、括弧の中は閉じ括弧を含まない
 */
const TASK_LINE_PATTERN = /^\u30fb(.*?)：\[([^\]]*)\]<([^>]*)>$/;
/** 見積と実績の形。DB の列（numeric(4,2)）に合わせて小数第 2 位まで */
const HOURS_PATTERN = /^\d+(\.\d{1,2})?$/;
/** 全角の数字・ピリオドと半角の文字コードの差（「０」U+FF10 → 「0」U+0030） */
const FULLWIDTH_TO_ASCII_OFFSET = 0xfee0;

/**
 * 工数テキストを解析します。読めない行は errors に行番号と理由を入れ、空の行は読み飛ばします。
 *
 * @param effortText 工数入力テキスト
 * @returns 読めたタスクの行と、読めない行
 */
export function parseEffortText(effortText: string): ParsedEffortText {
  const efforts: ParsedEffort[] = [];
  const errors: EffortTextError[] = [];
  // null: まだ案件の行が無い、"": 名前の空の案件の行の後ろ（その誤りだけを報告する）
  let currentProjectName: string | null = null;

  effortText.split("\n").forEach((line, index) => {
    const lineNumber: number = index + 1;
    const trimmedLine: string = line.trim();
    if (trimmedLine === "") return;

    if (trimmedLine.startsWith("■")) {
      currentProjectName = trimmedLine.substring(1).trim();
      if (currentProjectName === "") {
        errors.push({ line: lineNumber, reason: "案件名がありません" });
      }
      return;
    }

    if (!trimmedLine.startsWith("・")) {
      errors.push({
        line: lineNumber,
        reason: "案件の行（■）でもタスクの行（・）でもありません",
      });
      return;
    }

    if (currentProjectName === null) {
      errors.push({
        line: lineNumber,
        reason: "最初の案件の行より前にタスクの行があります",
      });
      return;
    }

    const result: ParsedEffort | string = parseTaskText(
      trimmedLine,
      currentProjectName,
    );
    if (typeof result === "string") {
      errors.push({ line: lineNumber, reason: result });
      return;
    }
    if (currentProjectName !== "") efforts.push(result);
  });

  return { efforts, errors };
}

/**
 * 読めない行を、利用者に返すメッセージにまとめます。
 *
 * @param errors 読めない行
 * @returns 「工数のテキストに読めない行があります。 <行番号>行目: <理由> / …」
 */
function formatEffortTextErrors(errors: EffortTextError[]): string {
  const details: string = errors
    .map(({ line, reason }) => `${line}行目: ${reason}`)
    .join(" / ");
  return `工数のテキストに読めない行があります。 ${details}`;
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
    {
      project: StructuredEffortResult["project"];
      items: StructuredEffortResult[];
    }
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
  lines.push("【日付】", formattedDate, "", "【工数】");

  let totalEstimated = 0;
  let totalActual = 0;
  let totalActualWithEstimate = 0;

  for (const { project, items } of grouped.values()) {
    lines.push(`■${project.name}`);

    let projectEstimated = 0;
    let projectActual = 0;
    let projectActualWithEstimate = 0;

    for (const item of items) {
      const estimated: number | null = item.record.estimated_hours ?? null;
      const actual: number = item.record.hours;
      projectEstimated += estimated ?? 0;
      projectActual += actual;
      if (estimated !== null) {
        projectActualWithEstimate += actual;
      }

      const diffText = estimated === null ? "" : formatDiff(actual - estimated);
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

  lines.push("", "【集計】", "■案件別");

  for (const { project, items } of grouped.values()) {
    const projectHasEstimate = items.some(
      (item) => item.record.estimated_hours !== null,
    );
    const projectEstimated: number = items.reduce(
      (sum, item) => sum + (item.record.estimated_hours ?? 0),
      0,
    );
    const projectActual: number = items.reduce(
      (sum, item) => sum + item.record.hours,
      0,
    );
    const projectActualWithEstimate: number = items.reduce(
      (sum, item) =>
        item.record.estimated_hours === null ? sum : sum + item.record.hours,
      0,
    );
    const diff = projectActualWithEstimate - projectEstimated;
    lines.push(
      `・${project.name}`,
      `${INDENT}見積：${projectHasEstimate ? formatHoursValue(projectEstimated) : "-"}   実績：${formatHoursValue(projectActual)}${projectHasEstimate ? formatDiff(diff) : ""}`,
    );
  }

  const hasAnyEstimate = entries.some(
    (record) => record.record.estimated_hours !== null,
  );
  const totalDiff = totalActualWithEstimate - totalEstimated;
  lines.push(
    "",
    "■全体",
    `見積：${hasAnyEstimate ? formatHoursValue(totalEstimated) : "-"}   実績：${formatHoursValue(totalActual)}${hasAnyEstimate ? formatDiff(totalDiff) : ""}`,
  );

  if (memo && memo.trim().length > 0) {
    lines.push("", "【メモ】", memo.trim());
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

  const settings: Tables<"user_settings"> | null = await fetchUserSettings(
    supabase,
    user.id,
  );
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
 * タスクの行を解析します。
 *
 * @param line 前後の空白を除いたタスクの行
 * @param pjName その行の案件名
 * @returns 読めたタスク。読めなければ理由の文
 */
function parseTaskText(line: string, pjName: string): ParsedEffort | string {
  const match: RegExpExecArray | null = TASK_LINE_PATTERN.exec(line);
  if (!match) return "タスクの行の書式が正しくありません";

  const taskName: string = match[1].trim();
  if (taskName === "") return "タスク名がありません";

  const estimated_hours: number | null | undefined = parseHours(match[2]);
  if (estimated_hours === undefined) return invalidHoursReason("見積");
  const hours: number | null | undefined = parseHours(match[3]);
  if (hours === undefined) return invalidHoursReason("実績");

  return {
    project_name: pjName,
    taskName,
    estimated_hours,
    // 実績が空なら 0（GAS の書式の決まり）
    hours: hours ?? 0,
  };
}

/**
 * 見積・実績の文字を読みます。全角の数字とピリオドは半角に直します（スマホの入力で全角になるため）。
 *
 * @param value 括弧の中の文字
 * @returns 空なら null、読めなければ undefined
 */
function parseHours(value: string): number | null | undefined {
  const normalized: string = value
    .trim()
    .replace(/[０-９．]/g, (char) =>
      String.fromCharCode(char.charCodeAt(0) - FULLWIDTH_TO_ASCII_OFFSET),
    );
  if (normalized === "") return null;
  if (!HOURS_PATTERN.test(normalized)) return undefined;

  const hours: number = Number(normalized);
  return hours < MAX_WORK_HOURS_EXCLUSIVE ? hours : undefined;
}

/**
 * 見積・実績が読めないときの理由の文を返します。
 *
 * @param label 「見積」か「実績」
 * @returns 理由の文
 */
function invalidHoursReason(label: "見積" | "実績"): string {
  return `${label}は 0 以上 ${MAX_WORK_HOURS_EXCLUSIVE} 未満の、小数第 2 位までの数値にしてください`;
}

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
