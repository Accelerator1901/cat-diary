/** 品类固定选项 */
export const CAT_OPTIONS = ['猫粮', '猫砂', '猫用品', '猫玩具', '医疗', '小咪'] as const

/** 平台固定选项 */
export const PLAT_OPTIONS = ['抖音', '京东', '拼多多', '淘宝', '线下', '唯品会'] as const

/** 旧数据中的平台代码 -> 中文名称 */
export const PLAT_MAP: Record<string, string> = {
  DY: '抖音',
  JD: '京东',
  PDD: '拼多多',
  TB: '淘宝',
}

/** 平台实心标签颜色 */
export const PLAT_COLORS: Record<string, string> = {
  抖音: '#4d4a5c',
  京东: '#e05656',
  拼多多: '#ee7a3b',
  淘宝: '#f0a742',
  线下: '#67b58c',
  唯品会: '#d857a6',
}

/** 平台代码/旧值归一化为中文名称 */
export function normPlat(p: string): string {
  const t = p.trim()
  return PLAT_MAP[t.toUpperCase()] ?? t
}
