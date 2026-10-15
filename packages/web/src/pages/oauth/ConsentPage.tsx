import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/config/routes";
import { AuthBrand } from "@/features/auth/components/AuthBrand";
import { AuthPageContainer } from "@/features/auth/components/AuthPageContainer";
import { useOAuthConsent } from "@/features/auth/hooks/useOAuthConsent";

/**
 * MCP のアプリ（Claude、Cursor など）との連携の同意の画面です（AC-mcp-14）。
 * AuthGuard の外に置き、ログインの確かめはフックが行う。
 */
export default function ConsentPage() {
  const { state, isDeciding, approve, deny } = useOAuthConsent();

  if (state.status === "notFound") {
    return (
      <AuthPageContainer>
        <AuthBrand
          title="連携できません"
          subtitle="連携の情報が見つからないか、期限が切れています。連携するアプリからもう一度やり直してください。"
        />
        <div className="text-center text-sm">
          <Link to={ROUTES.home} className="text-primary hover:underline">
            ホームへ
          </Link>
        </div>
      </AuthPageContainer>
    );
  }

  return (
    <AuthPageContainer>
      <AuthBrand
        title="アプリの連携を許可しますか？"
        subtitle="許可すると、アプリからこのアカウントのデータを使えるようになります"
      />

      {state.status === "ready" ? (
        <Card>
          <CardContent className="space-y-6">
            <div className="space-y-1 text-center">
              <p className="text-xl font-semibold break-words">
                {state.client.name}
              </p>
              {state.client.redirectUri && (
                <p className="text-sm text-muted-foreground break-all">
                  戻り先: {state.client.redirectUri}
                </p>
              )}
            </div>
            <p className="text-sm">
              このアプリが、あなたの工数・目標・週報・ミッションを読み書きできるようになります
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => void deny()}
                disabled={isDeciding}
              >
                拒否
              </Button>
              <Button onClick={() => void approve()} disabled={isDeciding}>
                許可
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card aria-busy="true">
          <CardContent className="space-y-4">
            <Skeleton className="mx-auto h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="ml-auto h-9 w-40" />
          </CardContent>
        </Card>
      )}
    </AuthPageContainer>
  );
}
