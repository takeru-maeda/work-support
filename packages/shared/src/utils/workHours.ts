/** 工数の見積・実績の上限（含まない）。DB の列が numeric(4,2) のため */
export const MAX_WORK_HOURS_EXCLUSIVE = 100;

/**
 * 工数の時間が保存できるか（0 以上で、小数第 2 位に丸めた値が 100 未満）を返します。
 * DB の列（numeric(4,2)）は丸めて保存し、99.995 は 100.00 になって桁あふれするので、丸めたあとの値で決める。
 * 浮動小数の誤差（99.995 * 100 = 9999.499…）で切り下がらないよう、桁を整えてから丸める。
 *
 * @param hours 時間
 * @returns 保存できるなら true
 */
export const isSavableWorkHours = (hours: number): boolean =>
  hours >= 0 &&
  Math.round(Number((hours * 100).toPrecision(12))) <
    MAX_WORK_HOURS_EXCLUSIVE * 100;
