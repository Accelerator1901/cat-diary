<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import rawDataJson from '@/data/mimi.json'
import FilterBar from '@/components/FilterBar.vue'
import ConsumptionTable from '@/components/ConsumptionTable.vue'
import { exportRows, parseExcelFile } from '@/utils/excel'
import { normPlat } from '@/constants'
import type { ConsumeRow, ConsumeRowInput, Filters } from '@/types'

/* ---------- 本地存储 ---------- */
const STORAGE_KEY = 'mimi-diary-rows-v1'

function defaultRows(): ConsumeRowInput[] {
  return rawDataJson.map((r) => ({ date: '', ...r, platform: normPlat(r.platform) }))
}

function loadRows(): ConsumeRowInput[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw) as ConsumeRowInput[]
      if (Array.isArray(arr) && arr.length) {
        // 兼容旧存储：平台代码归一化为中文
        return arr.map((r) => ({ ...r, platform: normPlat(r.platform ?? '') }))
      }
    }
  } catch {
    // 存储损坏时回退到初始数据
  }
  return defaultRows()
}

const rows = ref<ConsumeRow[]>(loadRows().map((r, i) => ({ id: i, ...r })))

// 数据变化时自动保存到 localStorage
watch(
  rows,
  (v) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(v.map(({ id: _id, ...r }) => r)),
      )
    } catch {
      // 存储失败（如隐私模式）静默忽略
    }
  },
  { deep: true },
)

async function resetData() {
  await ElMessageBox.confirm('将清空本地修改，恢复为 Excel 初始数据，确定喵？', '🔄 恢复初始数据', {
    confirmButtonText: '确定恢复',
    cancelButtonText: '再想想',
    type: 'warning',
  })
  rows.value = defaultRows().map((r, i) => ({ id: i, ...r }))
  ElMessage.success('已恢复初始数据 🐾')
}

/* ---------- 筛选 ---------- */
const filters = reactive<Filters>({ cats: [], plats: [], keyword: '' })
const fileInput = ref<HTMLInputElement | null>(null)
const tableComp = ref<InstanceType<typeof ConsumptionTable> | null>(null)
const lastAddedId = ref<number | null>(null)

const filtered = computed(() =>
  rows.value.filter(
    (r) =>
      (!filters.cats.length || filters.cats.includes(r.cat)) &&
      (!filters.plats.length || filters.plats.includes(r.platform)) &&
      (!filters.keyword.trim() || r.sub.includes(filters.keyword.trim())),
  ),
)

/* ---------- 统计 ---------- */
const sum = (arr: ConsumeRow[]) => arr.reduce((s, r) => s + (r.amount ?? 0), 0)
const totalAll = computed(() => sum(rows.value).toFixed(2))
// 去除"小咪"本身的价格（700 元扣除项）
const totalNoMimi = computed(() => sum(rows.value.filter((r) => r.cat !== '小咪')).toFixed(2))
const totalFiltered = computed(() => sum(filtered.value).toFixed(2))

function resetFilter() {
  filters.cats = []
  filters.plats = []
  filters.keyword = ''
}

/* ---------- 新增行 ---------- */
function addRow() {
  const id = rows.value.reduce((m, r) => Math.max(m, r.id), -1) + 1
  rows.value.push({
    id,
    cat: '',
    sub: '',
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    platform: '',
    note: '',
  })
  lastAddedId.value = id
  tableComp.value?.scrollToBottom()
}

/* ---------- 导入导出 ---------- */
function handleExport() {
  if (!filtered.value.length) {
    ElMessage.warning('没有可导出的数据喵～')
    return
  }
  exportRows(filtered.value.map(({ id: _id, ...r }) => r as ConsumeRowInput))
  ElMessage.success('导出成功喵～ 📦')
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const parsed = await parseExcelFile(file)
    await ElMessageBox.confirm(
      `已识别 ${parsed.length} 条记录，导入后将<b>替换</b>当前全部数据，确定喵？`,
      '📥 导入确认',
      { confirmButtonText: '确定导入', cancelButtonText: '再想想', type: 'warning', dangerouslyUseHTMLString: true },
    )
    rows.value = parsed.map((r, i) => ({ id: i, ...r, platform: normPlat(r.platform) }))
    resetFilter()
    ElMessage.success(`导入成功！共 ${parsed.length} 条记录 🎉`)
  } catch (err) {
    if (err instanceof Error) ElMessage.error(err.message)
    // 用户取消确认时（非 Error）静默忽略
  }
}
</script>

<template>
  <span class="paw-bg paw1">🐾</span>
  <span class="paw-bg paw2">🐾</span>
  <span class="paw-bg paw3">🐾</span>

  <div class="page">
    <!-- 标题 + 统计 -->
    <div class="header">
      <div>
        <div class="title"><span class="cat">🐱</span>咪咪消费小账本</div>
        <div class="subtitle">记录每一笔为小猫花的钱 ～ (=^･ω･^=)</div>
      </div>
      <div class="stats">
        <span class="stat-chip">🐾 全部笔数<b>{{ rows.length }}</b></span>
        <span class="stat-chip">
          💰 全部合计<b>¥{{ totalAll }}</b><i class="dim">（除小咪 ¥{{ totalNoMimi }}）</i>
        </span>
        <span class="stat-chip">🔍 筛选结果<b>{{ filtered.length }} 笔 / ¥{{ totalFiltered }}</b></span>
      </div>
    </div>

    <!-- 筛选 + 新增 + 导入导出 -->
    <FilterBar
      :filters="filters"
      @reset="resetFilter"
      @add-row="addRow"
      @export-excel="handleExport"
      @import-excel="triggerImport"
    />

    <!-- 表格：表头固定 + 内容滚动 + 无分页 + 行内编辑 -->
    <ConsumptionTable ref="tableComp" :rows="filtered" :last-added-id="lastAddedId" />

    <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display: none" @change="handleImport" />
    <div class="footer">
      数据保存在本机浏览器中 🐾 数据来源：咪咪日记.xlsx ·
      <el-link type="danger" underline="never" class="reset-link" @click="resetData">恢复初始数据</el-link>
    </div>
  </div>

  <!-- 一键回到顶部 -->
  <button class="to-top" title="回到顶部" @click="tableComp?.scrollToTop()">🐾</button>
</template>

<style scoped>
.page {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom));
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding: 4px 4px 10px;
}
.title {
  font-size: 22px;
  font-weight: 800;
  color: #e56d92;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.title .cat {
  font-size: 26px;
  display: inline-block;
  animation: cat-bob 2.4s ease-in-out infinite;
}
@keyframes cat-bob {
  0%,
  100% {
    transform: translateY(0) rotate(-4deg);
  }
  50% {
    transform: translateY(-4px) rotate(5deg);
  }
}
.subtitle {
  font-size: 12px;
  color: #c08a9d;
  margin-top: 2px;
}
.stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.stat-chip {
  background: #fff;
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: 0 2px 10px rgba(229, 109, 146, 0.12);
  font-size: 12px;
  color: #9b7c8a;
  white-space: nowrap;
  animation: chip-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transition: transform 0.2s, box-shadow 0.2s;
}
.stat-chip:nth-child(2) {
  animation-delay: 0.08s;
}
.stat-chip:nth-child(3) {
  animation-delay: 0.16s;
}
.stat-chip:hover {
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 4px 14px rgba(229, 109, 146, 0.22);
}
@keyframes chip-pop {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.stat-chip b {
  color: #e56d92;
  font-size: 15px;
  margin-left: 4px;
}
.stat-chip .dim {
  font-style: normal;
  color: #c9a3b3;
  font-size: 11px;
  margin-left: 2px;
}
.footer {
  text-align: center;
  font-size: 11px;
  color: #cfa8b8;
  padding: 8px 0 2px;
}
.reset-link {
  font-size: 11px;
  vertical-align: baseline;
}

/* ---------- 回到顶部 ---------- */
.to-top {
  position: fixed;
  right: 20px;
  bottom: calc(26px + env(safe-area-inset-bottom));
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffd9e5, #ffb7d0);
  box-shadow: 0 4px 14px rgba(229, 109, 146, 0.35);
  font-size: 21px;
  cursor: pointer;
  z-index: 20;
  animation: paw-float 3s ease-in-out infinite;
  transition: transform 0.2s;
}
.to-top:hover {
  animation: paw-wiggle 0.5s ease-in-out infinite;
  box-shadow: 0 6px 18px rgba(229, 109, 146, 0.5);
}
.to-top:active {
  transform: scale(0.9);
}
@keyframes paw-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}
@keyframes paw-wiggle {
  0%,
  100% {
    transform: rotate(-8deg) scale(1.08);
  }
  50% {
    transform: rotate(8deg) scale(1.08);
  }
}

@media (max-width: 640px) {
  .page {
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  }
  .header {
    padding: 0 2px 6px;
    gap: 4px;
  }
  .title {
    font-size: 17px;
  }
  .title .cat {
    font-size: 20px;
  }
  .subtitle {
    display: none;
  }
  .stats {
    width: 100%;
    gap: 6px;
  }
  .stat-chip {
    padding: 3px 9px;
    font-size: 10.5px;
  }
  .stat-chip b {
    font-size: 12.5px;
  }
  .stat-chip .dim {
    font-size: 9.5px;
  }
  .to-top {
    width: 40px;
    height: 40px;
    font-size: 18px;
    right: 12px;
  }
  .footer {
    font-size: 10px;
    padding: 4px 0 0;
  }
}
</style>
