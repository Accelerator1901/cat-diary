export interface ConsumeRow {
  id: number
  /** 品类，如：猫粮 / 猫砂 / 医疗 / 猫用品 / 猫玩具 */
  cat: string
  /** 细分品类，如：妮可露 / 逗猫棒 */
  sub: string
  /** 金额（元），可能为空 */
  amount: number | null
  /** 消费日期，YYYY-MM-DD，可能为空 */
  date: string
  /** 购买平台，如：JD / TB / PDD / DY */
  platform: string
  /** 备注 / 状态 */
  note: string
}

export type ConsumeRowInput = Omit<ConsumeRow, 'id'>

export interface Filters {
  cats: string[]
  plats: string[]
  keyword: string
}
