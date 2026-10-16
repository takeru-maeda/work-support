import { render, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import type { AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";

import type { RenderHookResult, RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

/**
 * ログイン済みのユーザーをストアに入れます。
 *
 * SWR のキーはユーザー ID 付き（`buildUserScopedKey`）なので、テストごとに別の ID にすると、
 * 本番と同じ共有のキャッシュのままテスト同士でデータが混ざらない。
 *
 * @returns ストアに入れたユーザー
 */
export const signInTestUser = (): AuthUser => {
  const user: AuthUser = {
    id: crypto.randomUUID(),
    name: "テスト ユーザー",
    email: "test@example.com",
  };
  useUserStore.getState().setUser(user);
  return user;
};

const TestProviders = ({ children }: { children: ReactNode }) => (
  // 失敗の再試行と重複の抑制を止め、1 回の応答で表示が決まるようにする
  <SWRConfig value={{ shouldRetryOnError: false, dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

/**
 * アプリと同じ Provider（SWR の設定）で包んで描画します。
 *
 * @param ui 描画する要素
 * @returns Testing Library の描画結果
 */
export const renderWithProviders = (ui: ReactElement): RenderResult =>
  render(ui, { wrapper: TestProviders });

/**
 * アプリと同じ Provider（SWR の設定）で包んでフックを描画します。
 *
 * @param hook 描画するフック
 * @returns Testing Library の描画結果
 */
export const renderHookWithProviders = <Result,>(
  hook: () => Result,
): RenderHookResult<Result, unknown> =>
  renderHook(hook, { wrapper: TestProviders });
