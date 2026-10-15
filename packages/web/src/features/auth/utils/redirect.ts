import { ROUTES } from "@/config/routes";

/** タブ、改行などの制御文字（URL の解釈で取り除かれ、`/\t/evil` が `//evil` になる） */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * ログインのあとの戻り先（`/login?redirect=`）を、このサイトの中のパスに限ります（AC-auth-13）。
 *
 * 文字列の先頭だけでは判断しない。ブラウザの URL の解釈は制御文字を取り除き、`\` を `/` と読むので、
 * 実際に解釈した origin がこのサイトと同じときだけ受け付ける（外へ飛ばされないように）。
 *
 * @param value `redirect` の値
 * @returns 受け付けたパス（パス、クエリ、ハッシュ）。受け付けなければホーム
 */
export const safeRedirectPath = (value: string | null): string => {
  if (!value?.startsWith("/") || CONTROL_CHARACTERS.test(value)) {
    return ROUTES.home;
  }
  const origin: string = window.location.origin;
  let url: URL;
  try {
    url = new URL(value, origin);
  } catch {
    return ROUTES.home;
  }
  if (url.origin !== origin) return ROUTES.home;
  return `${url.pathname}${url.search}${url.hash}`;
};
