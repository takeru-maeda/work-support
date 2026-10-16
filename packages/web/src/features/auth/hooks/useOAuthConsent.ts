import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { reportUiError } from "@/api/logs";
import { ROUTES } from "@/config/routes";
import { openExternalUrl } from "@/lib/browser";
import { supabase } from "@/lib/supabase";
import { showErrorToast } from "@/lib/toast";

import { parseAuthorizationDetails } from "../utils/oauthConsent";

/** 連携を求めているアプリ */
export interface OAuthConsentClient {
  name: string;
  /** 許可・拒否のあとに戻る、アプリの戻り先（分からなければ空） */
  redirectUri: string;
}

export type OAuthConsentState =
  | { status: "loading" }
  | { status: "ready"; client: OAuthConsentClient }
  | { status: "notFound" }
  | { status: "redirecting" };

interface UseOAuthConsentResult {
  state: OAuthConsentState;
  /** 許可・拒否を送っている間 */
  isDeciding: boolean;
  approve: () => Promise<void>;
  deny: () => Promise<void>;
}

const DECISION_FAILED_MESSAGE =
  "連携の処理に失敗しました。時間を空けて再度お試しください。";

/**
 * MCP のアプリとの連携の同意を扱います（docs/specs/mcp/spec.md の AC-mcp-14）。
 *
 * - ログインしていなければ、元のパスとクエリを `redirect` に付けてログインへ移す（AuthGuard の外の画面のため）
 * - Supabase の OAuth 2.1 サーバーから認可の内容を読み、許可・拒否を伝えて、アプリの戻り先へ移る
 * - すでに同意したアプリなら、Supabase が返す戻り先へすぐ移る
 *
 * @returns 画面の状態と、許可・拒否の操作
 */
export const useOAuthConsent = (): UseOAuthConsentResult => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authorizationId: string | null = searchParams.get("authorization_id");
  const [state, setState] = useState<OAuthConsentState>({ status: "loading" });
  const [isDeciding, setIsDeciding] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 手元のセッションではなく Supabase に確かめる（失効したセッションでは認可の内容を読めず、抜け出せなくなるため）
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !userData.user) {
        const back = `${location.pathname}${location.search}`;
        navigate(`${ROUTES.login}?redirect=${encodeURIComponent(back)}`, {
          replace: true,
        });
        return;
      }
      if (!authorizationId) {
        setState({ status: "notFound" });
        return;
      }

      const { data, error } =
        await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (cancelled) return;
      const details = error ? null : parseAuthorizationDetails(data);
      if (!details) {
        setState({ status: "notFound" });
        // 期限切れ・無効（404）は利用者のやり直しで済む。それ以外（通信や Supabase の障害、応答の形の変化）は追えるように残す
        if (!error || error.status !== 404) {
          await reportUiError(
            error ?? new Error("Unexpected authorization details"),
            {
              message: "Failed to load OAuth authorization details",
            },
          );
        }
        return;
      }
      if (details.kind === "consented") {
        setState({ status: "redirecting" });
        openExternalUrl(details.redirectUrl);
        return;
      }
      setState({
        status: "ready",
        client: { name: details.clientName, redirectUri: details.redirectUri },
      });
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [authorizationId, location.pathname, location.search, navigate]);

  const decide = useCallback(
    async (action: "approve" | "deny") => {
      if (!authorizationId) return;
      setIsDeciding(true);
      const send =
        action === "approve"
          ? supabase.auth.oauth.approveAuthorization
          : supabase.auth.oauth.denyAuthorization;
      // 戻り先へは自分で移す（supabase-js に任せると、テストで差し替えられない）
      const { data, error } = await send
        .call(supabase.auth.oauth, authorizationId, {
          skipBrowserRedirect: true,
        })
        .catch((thrown: unknown) => ({ data: null, error: thrown }));
      if (error || !data?.redirect_url) {
        showErrorToast(DECISION_FAILED_MESSAGE);
        setIsDeciding(false);
        await reportUiError(error ?? new Error("No redirect_url"), {
          message: `Failed to ${action} OAuth authorization`,
        });
        return;
      }
      setState({ status: "redirecting" });
      openExternalUrl(data.redirect_url);
    },
    [authorizationId],
  );

  return {
    state,
    isDeciding,
    approve: useCallback(() => decide("approve"), [decide]),
    deny: useCallback(() => decide("deny"), [decide]),
  };
};
