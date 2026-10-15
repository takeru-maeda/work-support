/**
 * 工数表示用に数値をフォーマットします。
 *
 * @param value 対象の数値
 * @param fallback 表示できない場合の文字列
 * @returns 整形済みの文字列
 */
export const formatWorkHours = (
  value: number | null,
  fallback: string = "-",
): string => {
  if (value === null || Number.isNaN(value)) return fallback;

  const sign: string = value < 0 ? "-" : "";
  const absValue: number = Math.abs(value);

  if (Number.isInteger(absValue)) {
    return `${sign}${Math.trunc(absValue)}`;
  }

  if (getDecimalLength(absValue) <= 1) {
    const rounded: number = Math.round(absValue * 10) / 10;
    return `${sign}${trimTrailingZeros(rounded.toFixed(1))}`;
  }

  const roundedTwo: number = Math.round(absValue * 100) / 100;
  return `${sign}${roundedTwo.toFixed(2)}`;
};

/**
 * 小数点以下の桁数を取得します。
 *
 * @param value 対象の数値
 * @returns 小数桁数
 */
function getDecimalLength(value: number): number {
  const valueString = value.toString();
  if (!valueString.includes(".")) return 0;
  return valueString.split(".")[1]?.length ?? 0;
}

/**
 * 小数点以下の末尾0を除去します。
 *
 * @param text 対象文字列
 * @returns トリム後の文字列
 */
function trimTrailingZeros(text: string): string {
  return text.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}
