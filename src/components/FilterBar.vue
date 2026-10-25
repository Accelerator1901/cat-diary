<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAT_OPTIONS, PLAT_OPTIONS } from '@/constants'
import type { Filters } from '@/types'

const props = defineProps<{
  filters: Filters
}>()

const emit = defineEmits<{
  reset: []
  'export-excel': []
  'import-excel': []
  'add-row': []
}>()

// 移动端默认收起筛选面板，桌面端始终展开
const expanded = ref(typeof window !== 'undefined' && window.innerWidth > 640)

const hasFilter = computed(
  () => props.filters.cats.length > 0 || props.filters.plats.length > 0 || props.filters.keyword.trim() !== '',
)

const activeCount = computed(
  () => props.filters.cats.length + props.filters.plats.length + (props.filters.keyword.trim() ? 1 : 0),
)
</script>

<template>
  <div class="filter-card" :class="{ collapsed: !expanded }">
    <!-- 移动端折叠开关 -->
    <button class="filter-toggle" type="button" @click="expanded = !expanded">
      🔖 筛选
      <span v-if="activeCount" class="badge">{{ activeCount }}</span>
      <span class="arrow">{{ expanded ? '▴' : '▾' }}</span>
    </button>

    <!-- 筛选字段 -->
    <div class="filter-fields">
      <span class="filter-label">🔖 筛选</span>

      <el-select
        v-model="filters.cats"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        placeholder="品类"
        class="filter-item"
      >
        <el-option v-for="c in CAT_OPTIONS" :key="c" :label="c" :value="c" />
      </el-select>

      <el-select
        v-model="filters.plats"
        multiple
        collapse-tags
        collapse-tags-tooltip
        clearable
        placeholder="平台"
        class="filter-item"
      >
        <el-option v-for="p in PLAT_OPTIONS" :key="p" :label="p" :value="p" />
      </el-select>

      <el-input v-model="filters.keyword" clearable placeholder="搜索细分品类～" class="filter-item keyword" />

      <el-button class="btn-round" :disabled="!hasFilter" plain @click="emit('reset')">重置</el-button>
    </div>

    <!-- 操作按钮 -->
    <div class="filter-actions">
      <el-button class="btn-round" type="success" plain @click="emit('add-row')">➕ 新增行</el-button>
      <el-button class="btn-round" type="primary" @click="emit('export-excel')">📤 导出 Excel</el-button>
      <el-button class="btn-round" type="warning" plain @click="emit('import-excel')">📥 导入 Excel</el-button>
    </div>
  </div>
</template>

<style scoped>
.filter-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  border-radius: 18px;
  padding: 12px 14px;
  box-shadow: 0 4px 18px rgba(229, 109, 146, 0.12);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}
.filter-card :deep(.el-select),
.filter-card :deep(.el-input) {
  --el-border-radius-base: 999px;
}
.filter-card :deep(.el-button + .el-button) {
  margin-left: 0;
}
.filter-fields,
.filter-actions {
  display: contents;
}
.filter-item {
  flex: 1 1 160px;
  min-width: 140px;
  max-width: 240px;
}
.filter-item.keyword {
  flex: 1.4 1 180px;
  max-width: 280px;
}
.btn-round {
  border-radius: 999px;
  font-weight: 700;
}
.filter-label {
  font-size: 13px;
  color: #b48ea0;
  padding-left: 4px;
  user-select: none;
}

/* ---------- 移动端折叠开关 ---------- */
.filter-toggle {
  display: none;
  align-items: center;
  gap: 6px;
  border: none;
  background: #ffeef5;
  color: #d16a8f;
  font-size: 13px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.filter-toggle .badge {
  background: #e56d92;
  color: #fff;
  font-size: 11px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  border-radius: 999px;
  text-align: center;
  padding: 0 4px;
}
.filter-toggle .arrow {
  font-size: 11px;
  color: #c08a9d;
}

/* ---------- 移动端 ---------- */
@media (max-width: 640px) {
  .filter-card {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }
  .filter-toggle {
    display: inline-flex;
    align-self: flex-start;
  }
  .filter-card.collapsed .filter-fields {
    display: none;
  }
  .filter-fields,
  .filter-card.collapsed .filter-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .filter-label {
    display: none;
  }
  .filter-item,
  .filter-item.keyword {
    flex: 1 1 46%;
    min-width: 0;
    max-width: none;
  }
  .filter-actions :deep(.el-button) {
    flex: 1;
    padding-left: 6px;
    padding-right: 6px;
    font-size: 12.5px;
  }
}
@media (max-width: 380px) {
  .filter-item,
  .filter-item.keyword {
    flex: 1 1 100%;
  }
}
</style>
