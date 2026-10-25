<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref } from "vue";
import { CAT_OPTIONS, PLAT_COLORS, PLAT_OPTIONS } from "@/constants";
import type { ConsumeRow } from "@/types";

const props = defineProps<{ rows: ConsumeRow[]; lastAddedId: number | null }>();
const tableRef = ref<any>(null);
const cardRef = ref<HTMLElement | null>(null);
const tableHeight = ref(400);
const tableWidth = ref(800);
let ro: ResizeObserver | null = null;

onMounted(() => {
  ro = new ResizeObserver(() => {
    const el = cardRef.value;
    if (!el) return;
    if (el.clientHeight) tableHeight.value = el.clientHeight;
    if (el.clientWidth) tableWidth.value = el.clientWidth;
  });
  if (cardRef.value) ro.observe(cardRef.value);
});
onBeforeUnmount(() => ro?.disconnect());

const fmt = (n: number | null) =>
  (n ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const catColor = (cat: string) =>
  ((
    ({
      猫粮: "warning",
      猫砂: "primary",
      医疗: "danger",
      猫玩具: "success",
    }) as Record<string, string>
  )[cat] ?? "info") as "warning" | "primary" | "danger" | "success" | "info";

const platColor = (p: string) => PLAT_COLORS[p] ?? "#c9a3b3";

/** 新增行高亮 */
const rowClassFn = ({ rowIndex }: { rowIndex: number }) =>
  props.rows[rowIndex]?.id === props.lastAddedId ? "row-new" : "";

/* ---------- 虚拟列定义 ---------- */
type Col = {
  key: string;
  title: string;
  width: number;
  align?: "left" | "center" | "right";
};

const FIXED_COLS: Col[] = [
  { key: "index", title: "#", width: 56, align: "center" },
  { key: "cat", title: "品类", width: 106, align: "center" },
  { key: "sub", title: "细分品类", width: 170, align: "left" },
  { key: "amount", title: "金额 (¥)", width: 112, align: "center" },
  { key: "date", title: "消费日期", width: 150, align: "center" },
  { key: "platform", title: "平台", width: 120, align: "center" },
];
const FIXED_TOTAL = FIXED_COLS.reduce((s, c) => s + c.width, 0);

const columns = computed<Col[]>(() => {
  const noteW = Math.max(120, tableWidth.value - FIXED_TOTAL);
  return [
    ...FIXED_COLS.map((c) => ({ ...c })),
    { key: "note", title: "备注", width: noteW, align: "left" },
  ];
});

/* ---------- 懒加载编辑：记录当前处于编辑态的单元格 ----------
   只有被点击的那个单元格才挂载 el-select / el-date-picker，
   其余全部用轻量纯文本渲染，滚动时零重组件开销。 */
const editing = reactive<{ row: number; col: string }>({ row: -1, col: "" });

function startEdit(rowIndex: number, col: string) {
  editing.row = rowIndex;
  editing.col = col;
}
function stopEdit() {
  editing.row = -1;
  editing.col = "";
}

const isEditing = (rowIndex: number, col: string) =>
  editing.row === rowIndex && editing.col === col;

/* ---------- 行内编辑（纯文本字段） ---------- */
function selectAll(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function onFieldFocus(ev: FocusEvent) {
  selectAll(ev.target as HTMLElement);
}

function onAmountFocus(row: ConsumeRow, ev: FocusEvent) {
  const el = ev.target as HTMLElement;
  el.textContent = String(row.amount ?? 0);
  selectAll(el);
}

function commitText(row: ConsumeRow, field: "sub" | "note", ev: FocusEvent) {
  const el = ev.target as HTMLElement;
  const text = (el.textContent ?? "").trim();
  el.textContent = text;
  row[field] = text;
}

function commitAmount(row: ConsumeRow, ev: FocusEvent) {
  const el = ev.target as HTMLElement;
  const v = parseFloat((el.textContent ?? "").replace(/[^\d.\-]/g, ""));
  row.amount = Number.isNaN(v) ? 0 : v;
  el.textContent = fmt(row.amount);
}

function onCellKeydown(ev: KeyboardEvent) {
  if (ev.key === "Enter") {
    ev.preventDefault();
    (ev.target as HTMLElement).blur();
  }
}

/* ---------- 滚动控制 ---------- */
function getScrollWrap(): HTMLElement | null {
  const el: HTMLElement | undefined = tableRef.value?.$el;
  return el?.querySelector(".el-vl__wrapper") ?? null;
}

function animateScroll(target: number) {
  const wrap = getScrollWrap();
  if (!wrap) return;
  const start = wrap.scrollTop;
  const dist = target - start;
  if (Math.abs(dist) < 2) return;
  const dur = 420;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    wrap.scrollTop = start + dist * (1 - Math.pow(1 - p, 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function scrollToTop() {
  animateScroll(0);
}

async function scrollToBottom() {
  await nextTick();
  const wrap = getScrollWrap();
  if (wrap) animateScroll(wrap.scrollHeight);
}

defineExpose({ scrollToTop, scrollToBottom });
</script>

<template>
  <div ref="cardRef" class="table-card">
    <el-table-v2
      ref="tableRef"
      :columns="columns"
      :data="rows"
      :width="tableWidth"
      :height="tableHeight"
      :row-height="46"
      :row-class="rowClassFn"
      :fixed="true"
      class="mimi-vtable"
    >
      <template #cell="{ rowData, rowIndex, column }">
        <!-- 序号 -->
        <span v-if="column.key === 'index'" class="idx">{{ rowIndex + 1 }}</span>

        <!-- 品类：懒加载下拉 -->
        <div
          v-else-if="column.key === 'cat'"
          class="cell-click"
          @click="startEdit(rowIndex, 'cat')"
        >
          <el-select
            v-if="isEditing(rowIndex, 'cat')"
            v-model="rowData.cat"
            class="cell-select"
            placeholder="品类"
            clearable
            :teleported="false"
            @change="stopEdit"
            @blur="stopEdit"
            @visible-change="(v: boolean) => !v && stopEdit()"
          >
            <template #label>
              <el-tag
                class="tag-cat"
                :type="catColor(rowData.cat)"
                effect="light"
                size="small"
                >{{ rowData.cat }}</el-tag
              >
            </template>
            <el-option v-for="c in CAT_OPTIONS" :key="c" :label="c" :value="c" />
          </el-select>
          <el-tag
            v-else
            class="tag-cat"
            :type="catColor(rowData.cat)"
            effect="light"
            size="small"
            >{{ rowData.cat }}</el-tag
          >
        </div>

        <!-- 细分品类 -->
        <span
          v-else-if="column.key === 'sub'"
          class="cell-edit"
          contenteditable="true"
          spellcheck="false"
          data-ph="细分品类"
          @focus="onFieldFocus"
          @blur="commitText(rowData, 'sub', $event)"
          @keydown="onCellKeydown"
          >{{ rowData.sub }}</span
        >

        <!-- 金额 -->
        <span
          v-else-if="column.key === 'amount'"
          class="cell-edit money"
          contenteditable="true"
          spellcheck="false"
          data-ph="0.00"
          @focus="onAmountFocus(rowData, $event)"
          @blur="commitAmount(rowData, $event)"
          @keydown="onCellKeydown"
          >{{ fmt(rowData.amount) }}</span
        >

        <!-- 消费日期：懒加载日期选择器 -->
        <div
          v-else-if="column.key === 'date'"
          class="cell-click"
          @click="startEdit(rowIndex, 'date')"
        >
          <el-date-picker
            v-if="isEditing(rowIndex, 'date')"
            v-model="rowData.date"
            type="date"
            value-format="YYYY-MM-DD"
            format="YYYY-MM-DD"
            placeholder="选择日期"
            :clearable="true"
            popper-class="cute-picker"
            class="cell-date"
            :teleported="false"
            @change="stopEdit"
            @blur="stopEdit"
          />
          <span v-else class="date-text">{{ rowData.date || "选择日期" }}</span>
        </div>

        <!-- 平台：懒加载下拉 -->
        <div
          v-else-if="column.key === 'platform'"
          class="cell-click"
          @click="startEdit(rowIndex, 'platform')"
        >
          <el-select
            v-if="isEditing(rowIndex, 'platform')"
            v-model="rowData.platform"
            class="cell-select"
            placeholder="平台"
            clearable
            :teleported="false"
            @change="stopEdit"
            @blur="stopEdit"
            @visible-change="(v: boolean) => !v && stopEdit()"
          >
            <template #label>
              <span
                class="plat-tag"
                :style="{ background: platColor(rowData.platform) }"
                >{{ rowData.platform }}</span
              >
            </template>
            <el-option v-for="p in PLAT_OPTIONS" :key="p" :label="p" :value="p">
              <span class="plat-tag" :style="{ background: platColor(p) }">{{
                p
              }}</span>
            </el-option>
          </el-select>
          <span
            v-else
            class="plat-tag"
            :style="{ background: platColor(rowData.platform) }"
            >{{ rowData.platform }}</span
          >
        </div>

        <!-- 备注 -->
        <span
          v-else-if="column.key === 'note'"
          class="cell-edit"
          contenteditable="true"
          spellcheck="false"
          data-ph="备注"
          @focus="onFieldFocus"
          @blur="commitText(rowData, 'note', $event)"
          @keydown="onCellKeydown"
          >{{ rowData.note }}</span
        >

        <span v-else>{{ rowData[column.key] }}</span>
      </template>
    </el-table-v2>
  </div>
</template>

<style scoped>
.table-card {
  flex: 1;
  min-height: 0;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 18px;
  box-shadow: 0 4px 18px rgba(229, 109, 146, 0.12);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
}

.mimi-vtable {
  flex: 1;
  height: 100%;
  --el-table-header-bg-color: #ffd9e5;
}

/* 表头 */
.mimi-vtable :deep(.el-table-v2__header-cell) {
  background: #ffd9e5;
  color: #b0537a;
  font-weight: 800;
  font-size: 13px;
}

/* 行 */
.mimi-vtable :deep(.el-table-v2__row) {
  border-bottom: 1px solid #ffe3ec;
}
.mimi-vtable :deep(.el-table-v2__row:hover) {
  background: #fff0f6;
}
.mimi-vtable :deep(.row-new .el-table-v2__row-cell) {
  animation: row-flash 1.8s ease;
}
@keyframes row-flash {
  0% {
    background: #ffd9e5;
  }
  100% {
    background: transparent;
  }
}

.idx {
  color: #d8a8ba;
  font-size: 12px;
}

/* 可点击进入编辑的单元格容器 */
.cell-click {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 32px;
  cursor: pointer;
  border-radius: 8px;
}
.cell-click:hover {
  background: #ffeef5;
}
.date-text {
  font-size: 13px;
  color: #9b7c8a;
}

/* ---------- 行内编辑（无输入框样式） ---------- */
.cell-edit {
  cursor: text;
  border-radius: 8px;
  padding: 2px 6px;
  min-height: 1.2em;
  display: inline-block;
  min-width: 2em;
  max-width: 100%;
  transition:
    background-color 0.2s,
    box-shadow 0.2s;
  caret-color: #e56d92;
}
.cell-edit:hover {
  background: #ffeef5;
  box-shadow: 0 0 0 1px #ffc9da inset;
}
.cell-edit:focus {
  outline: none;
  background: #fff;
  box-shadow: 0 0 0 1.5px #f7a8c4 inset;
}
.cell-edit:empty::before {
  content: attr(data-ph);
  color: #e8c6d4;
  pointer-events: none;
}
.money {
  color: #e56d92;
  font-weight: 800;
}
.tag-cat {
  border-radius: 999px;
  font-weight: 700;
  border: none;
}

/* ---------- 平台实心标签 ---------- */
.plat-tag {
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  display: inline-block;
  line-height: 1.5;
}

/* 单元格内下拉/日期无边框 */
.cell-select :deep(.el-select__wrapper) {
  box-shadow: none;
  background: transparent;
  padding: 0;
  transition: none;
}
.cell-select :deep(.el-select__selected-item) {
  overflow: visible;
}
.cell-date :deep(.el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  padding: 0;
  transition: none;
}
.cell-date :deep(.el-input__suffix-inner:empty) {
  display: none;
}

/* 关闭表格内 Element 组件的过渡动画 */
.mimi-vtable :deep(.el-select),
.mimi-vtable :deep(.el-input),
.mimi-vtable :deep(.el-select__wrapper),
.mimi-vtable :deep(.el-input__wrapper),
.mimi-vtable :deep(.el-select__caret),
.mimi-vtable :deep(.el-input__icon) {
  transition: none !important;
}
</style>
