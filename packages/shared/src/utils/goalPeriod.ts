/** 目標の期間の作成を断るときの文（画面の確認と API の確認で同じ文を出す） */
export const GOAL_PERIOD_MESSAGES = {
  endBeforeStart: "終了日は開始日より未来の日付を選択してください。",
  titleRequired: "目標名を入力してください。",
  weightTotal: "重みの合計を100%にしてください。",
} as const;

/**
 * 開始日が現在の期間と重なるときの文を作ります。
 *
 * @param latestEndDate 現在の期間の終了日（YYYY-MM-DD）
 * @returns 日付を yyyy/MM/dd にした文
 */
export const goalPeriodOverlapMessage = (latestEndDate: string): string =>
  `開始日は既存目標の終了日（${latestEndDate.replaceAll("-", "/")}）より未来の日付を選択してください。`;

/**
 * 0 以上の数値を、DB の numeric(…,2) と同じく小数第 2 位で四捨五入し、100 倍した整数にします。
 *
 * JSON で送る文字列（`String(value)`。DB はこの 10 進の値をそのまま丸める）の桁で丸めるので、
 * 33.33499999999999 は DB と同じく 3333 になる（浮動小数点の掛け算で丸めると 3334 になり、食い違う）。
 *
 * @param value 0 以上の数値
 * @returns 小数第 2 位に丸めた値の 100 倍
 */
export const toCents = (value: number): number => {
  const text = String(value);
  // 1e-7 のような指数の表記は 0.000001 未満で、丸めると 0
  if (text.includes("e")) return 0;
  const [integer, fraction = ""] = text.split(".");
  const digits = fraction.padEnd(3, "0");
  const cents = Number(integer) * 100 + Number(digits.slice(0, 2));
  return digits[2] >= "5" ? cents + 1 : cents;
};
