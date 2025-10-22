import type {
  Session,
  User as SupabaseUser,
  UserMetadata,
} from "@supabase/supabase-js";

import { ROUTES } from "@/config/routes";
import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface AuthResult {
  success: boolean;
  user: AuthUser | null;
  session: Session | null;
  error?: string;
}

export interface UserUpdateResult {
  success: boolean;
  user: AuthUser | null;
  error?: string;
}

export interface LogoutResult {
  success: boolean;
  error?: string;
}

export interface BasicResult {
  success: boolean;
  error?: string;
}

export interface UpdateProfileParams {
  name?: string;
  avatarUrl?: string;
}

/**
 * ユーザーを新規登録します。
 *
 * @param name 登録するユーザー名
 * @param email 登録するメールアドレス
 * @param password 設定するパスワード
 * @returns 認証結果
 */
export async function signup(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    return {
      success: false,
      user: null,
      session: null,
      error: error.message,
    };
  }

  return { success: true, user: toAuthUser(data.user), session: data.session };
}

/**
 * メールアドレスでログインします。
 *
 * @param email ログインするメールアドレス
 * @param password ログインに使用するパスワード
 * @returns 認証結果
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      user: null,
      session: null,
      error: error.message,
    };
  }

  return { success: true, user: toAuthUser(data.user), session: data.session };
}

/**
 * 現在のセッションを終了します。
 *
 * @returns ログアウト結果
 */
export async function logout(): Promise<LogoutResult> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return { success: true };
}

/**
 * 現在のユーザー情報を取得します。
 *
 * @returns 認証済みユーザー
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;

  return toAuthUser(data.user);
}

/**
 * 認証状態を確認します。
 *
 * @returns 認証済みであれば true
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

/**
 * プロフィール情報を更新します。
 *
 * @param updates 更新する項目
 * @returns 更新結果
 */
export async function updateProfile(
  updates: UpdateProfileParams,
): Promise<UserUpdateResult> {
  const payload: Record<string, string> = {};

  if (typeof updates.name === "string") {
    payload.name = updates.name;
  }

  if (typeof updates.avatarUrl === "string") {
    payload.avatarUrl = updates.avatarUrl;
  }

  if (Object.keys(payload).length === 0) {
    const current = await getCurrentUser();
    return { success: true, user: current };
  }

  const { data, error } = await supabase.auth.updateUser({
    data: payload,
  });

  if (error) {
    return {
      success: false,
      user: null,
      error: error.message,
    };
  }

  return { success: true, user: toAuthUser(data.user) };
}

/**
 * パスワードリセットメールを送信します。
 *
 * @param email 送信先メールアドレス
 * @returns 実行結果
 */
export async function requestPasswordReset(
  email: string,
): Promise<BasicResult> {
  const origin: string =
    typeof window !== "undefined" ? window.location.origin : "";
  const redirectTo: string | undefined = origin
    ? `${origin}${ROUTES.resetPassword}`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined,
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * パスワードを更新します。
 *
 * @param password 新しいパスワード
 * @returns 更新結果
 */
export async function updatePassword(
  password: string,
): Promise<UserUpdateResult> {
  const { data, error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      success: false,
      user: null,
      error: error.message,
    };
  }

  return {
    success: true,
    user: toAuthUser(data.user),
  };
}

export async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to retrieve session", error);
    return null;
  }

  return data.session?.access_token ?? null;
}

/**
 * Supabase のユーザーデータをアプリ用の形に変換します。
 *
 * @param user Supabase のユーザー情報
 * @returns 変換後のユーザー情報
 */
function toAuthUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null;

  const metadata: UserMetadata = user.user_metadata;

  const rawName: string =
    typeof metadata.name === "string" && metadata.name.trim()
      ? metadata.name
      : (user.email ?? "");

  const rawAvatar: string | undefined =
    typeof metadata?.avatarUrl === "string" && metadata.avatarUrl.trim()
      ? metadata.avatarUrl
      : undefined;

  return {
    id: user.id,
    name: rawName,
    email: user.email ?? "",
    avatarUrl: rawAvatar,
  };
}
