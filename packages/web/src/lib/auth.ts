import type { User as SupabaseUser, UserMetadata } from "@supabase/supabase-js";

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
      error: error.message,
    };
  }

  return { success: true, user: toAuthUser(data.user) };
}

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
      error: error.message,
    };
  }

  return { success: true, user: toAuthUser(data.user) };
}

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

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return toAuthUser(data.user);
}

export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function updateProfile(
  updates: UpdateProfileParams,
): Promise<AuthResult> {
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

export async function requestPasswordReset(email: string): Promise<BasicResult> {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const redirectTo = origin ? `${origin}${ROUTES.resetPassword}` : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo
      ? {
          redirectTo,
        }
      : undefined,
  );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePassword(password: string): Promise<AuthResult> {
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
