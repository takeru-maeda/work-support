/**
 * ほかのサイト（連携するアプリの戻り先など）へ、ページごと移ります。
 * React Router の移動はこのサイトの中だけなので、外へ出るときはこれを使う（テストでは差し替える）。
 *
 * @param url 移る先の URL
 */
export const openExternalUrl = (url: string): void => {
  window.location.assign(url);
};
