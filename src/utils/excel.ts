import * as XLSX from 'xlsx'
import type { ConsumeRowInput } from '@/types'

/** 行对象 -> 输出表格用的普通对象 */
function toPlain(row: ConsumeRowInput) {
  return {
    品类: row.cat,
    细分品类: row.sub,
    金额: row.amount ?? 0,
    消费日期: row.date,
    平台: row.platform,
    备注: row.note,
  }
}

/** 导出为 xlsx 文件并触发浏览器下载 */
export function exportRows(rows: ConsumeRowInput[], filename?: string) {
  const ws = XLSX.utils.json_to_sheet(rows.map(toPlain))
  ws['!cols'] = [{ wch: 10 }, { wch: 32 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 22 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '咪咪消费')
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, filename ?? `咪咪消费表_${date}.xlsx`)
}

/** 在 keys 中找到第一个匹配的列名（支持常见别名） */
function pickCol(keys: string[], ...names: string[]): string | undefined {
  return names.find((n) => keys.some((k) => k.trim() === n))
}

/** 解析用户上传的 Excel 文件为行数据，格式不符时抛出 Error（message 可直接展示） */
export function parseExcelFile(file: File): Promise<ConsumeRowInput[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' })
        const sheetName = wb.SheetNames[0]
        if (!sheetName) {
          reject(new Error('表格里没有工作表喵…'))
          return
        }
        const ws = wb.Sheets[sheetName]
        if (!ws) {
          reject(new Error('工作表内容为空喵…'))
          return
        }
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        const first = json[0]
        if (!first) {
          reject(new Error('表格里没有数据喵…'))
          return
        }
        const keys = Object.keys(first)
        const kCat = pickCol(keys, '品类')
        const kSub = pickCol(keys, '细分品类', '品名', '名称')
        const kAmt = pickCol(keys, '金额', '价格', '花费')
        const kDate = pickCol(keys, '消费日期', '日期')
        const kPlat = pickCol(keys, '平台', '渠道')
        const kNote = pickCol(keys, '备注', '状态')
        if (!kCat || !kAmt) {
          reject(new Error('缺少「品类」或「金额」列，请检查表格格式喵～'))
          return
        }
        resolve(
          json.map((r) => ({
            cat: String(r[kCat] ?? '').trim(),
            sub: kSub ? String(r[kSub] ?? '').trim() : '',
            amount: Number(String(r[kAmt] ?? '').replace(/[^\d.\-]/g, '')) || 0,
            date: kDate ? String(r[kDate] ?? '').trim() : '',
            platform: kPlat ? String(r[kPlat] ?? '').trim() : '',
            note: kNote ? String(r[kNote] ?? '').trim() : '',
          })),
        )
      } catch {
        reject(new Error('文件解析失败，请确认是有效的 Excel 文件喵…'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败喵…'))
    reader.readAsArrayBuffer(file)
  })
}
