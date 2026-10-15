/** 同意を待っている認可（初めて連携するアプリ） */
export interface PendingAuthorization {
  kind: "pending";
  clientName: string;
  /** アプリが登録した戻り先 */
  redirectUri: string;
}

/** すでに同意したアプリの認可（Supabase が認可コード付きの戻り先を返す） */
export interface ConsentedAuthorization {
  kind: "consented";
  redirectUrl: string;
}

/** 名前を登録していないアプリの表示名 */
export const UNNAMED_CLIENT = "名前の無いアプリ";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Supabase の OAuth 2.1 サーバーが返す認可の内容を読みます。
 *
 * supabase-js 2.80 の型（`client.client_name`、`redirect_uri` があれば同意済み）は、実際の応答と違う。
 * ローカルの Supabase で確かめた実際の形（docs/specs/mcp/spec.md の既知の落とし穴）:
 * - 初めて: `{ authorization_id, redirect_uri（アプリの戻り先）, client: { id, name }, scope }`
 * - 同意済み: `{ redirect_url（認可コード付きの戻り先） }` だけ
 *
 * @param data `getAuthorizationDetails` の data
 * @returns 読めた認可。どちらの形でもなければ null
 */
export const parseAuthorizationDetails = (
  data: unknown,
): PendingAuthorization | ConsentedAuthorization | null => {
  if (!isRecord(data)) return null;
  if (typeof data.redirect_url === "string") {
    return { kind: "consented", redirectUrl: data.redirect_url };
  }
  if (!isRecord(data.client)) return null;
  // 自動登録では名前は任意（RFC 7591）。名前が無くても同意できるようにする
  const name = data.client.name ?? data.client.client_name;
  return {
    kind: "pending",
    clientName: typeof name === "string" && name !== "" ? name : UNNAMED_CLIENT,
    redirectUri: typeof data.redirect_uri === "string" ? data.redirect_uri : "",
  };
};
