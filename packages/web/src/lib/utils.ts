import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useUserStore } from "@/store/user";

/**
 * クラス名をマージします。
 *
 * @param inputs 結合したいクラス名の配列
 * @returns マージ後のクラス名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 名前からイニシャルを取得します。
 *
 * @param name 対象の名前
 * @returns 生成したイニシャル
 */
export function getInitials(name: string): string {
  if (!name) return "";

  const normalized: string = name.trim();
  if (normalized.length === 0) return "";

  const parts: string[] = normalized.split(/\s+/);

  if (parts.length >= 2) {
    const first: string = parts[0]?.[0] ?? "";
    const last: string = parts.at(-1)?.[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }

  return normalized.slice(0, 2).toUpperCase();
}

/**
 * ユーザーIDを付与したローカルストレージキーを生成します。
 *
 * @param baseKey ベースとなるキー名
 * @returns ユーザーID付きのキー
 */
export function buildUserScopedKey(baseKey: string): string {
  const userId: string | null = useUserStore.getState().user?.id ?? null;
  if (!userId) throw new Error("User not authenticated");
  return `${baseKey}_${userId}`;
}
