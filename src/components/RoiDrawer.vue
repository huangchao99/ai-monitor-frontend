<template>
  <div class="roi-drawer">
    <!-- 触发区域：按钮 + 状态 -->
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
      <el-button size="small" :type="hasRoi ? 'success' : 'default'" @click="openDrawer">
        <el-icon style="margin-right:4px"><Edit /></el-icon>
        {{ hasRoi ? '已设检测区域' : '画检测区域' }}
      </el-button>
      <el-button v-if="hasRoi" size="small" type="danger" text @click="clearRoi">
        <el-icon><Delete /></el-icon>
      </el-button>
      <span style="font-size:12px;color:#909399">{{ hasRoi ? roiSummary : '默认全屏检测' }}</span>
    </div>

    <!-- 绘制对话框 -->
    <el-dialog
      v-model="visible"
      title="画检测区域"
      width="740px"
      :close-on-click-modal="false"
      destroy-on-close
      @opened="onDialogOpened"
      @closed="onDialogClosed"
    >
      <!-- 画布容器：固定 16:9，背景为快照或占位 -->
      <div
        ref="containerRef"
        style="position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;background:#0f172a;border-radius:6px;line-height:0"
      >
        <!-- 摄像头快照背景 -->
        <img
          v-if="snapshotLoaded"
          :src="snapshotSrc"
          style="width:100%;height:100%;object-fit:contain;display:block;opacity:0.9"
          draggable="false"
        />
        <!-- 快照加载中 -->
        <div v-else-if="snapshotLoading" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center">
          <el-icon class="is-loading" style="font-size:28px;color:#475569"><Loading /></el-icon>
        </div>
        <!-- 快照不可用 -->
        <div v-else style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
          <el-icon style="font-size:32px;color:#334155"><VideoCamera /></el-icon>
          <span style="color:#475569;font-size:13px">摄像头画面不可用，可在此区域绘制</span>
          <span style="color:#334155;font-size:12px">（需先开启摄像头推流）</span>
        </div>

        <!-- 绘制画布（始终叠在最上层） -->
        <canvas
          ref="canvasRef"
          style="position:absolute;top:0;left:0;width:100%;height:100%;touch-action:none"
          :style="{ cursor: nearFirstPoint ? 'cell' : 'crosshair' }"
          @mousedown.prevent="onMouseDown"
          @mousemove="onMouseMove"
          @mouseleave="onMouseLeave"
          @contextmenu.prevent="undoLast"
        />
      </div>

      <!-- 操作提示栏 -->
      <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:12px;color:#6b7280;line-height:1.6">
          <span><span style="color:#f59e0b">●</span> 左键单击添加顶点</span>
          &ensp;|&ensp;
          <span>右键撤销上一个顶点</span>
          &ensp;|&ensp;
          <span v-if="isClosed" style="color:#22c55e;font-weight:500">✓ 区域已闭合</span>
          <span v-else-if="points.length >= 3">点击 <span style="color:#f59e0b">首个顶点（橙色）</span> 闭合区域</span>
          <span v-else-if="points.length > 0">还需 <strong>{{ 3 - points.length }}</strong> 个顶点</span>
          <span v-else>开始点击添加顶点</span>
        </div>
        <div style="font-size:12px;color:#9ca3af">已添加 <strong style="color:#e2e8f0">{{ points.length }}</strong> 个顶点</div>
      </div>

      <template #footer>
        <el-button @click="clearPoints">重新绘制</el-button>
        <el-button @click="visible = false">取消</el-button>
        <el-button
          type="primary"
          :disabled="points.length < 3"
          @click="confirmRoi"
        >
          {{ isClosed ? '确认区域' : points.length >= 3 ? '使用当前区域' : '请继续添加顶点' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Edit, Delete, Loading, VideoCamera } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  cameraId: { type: Number, default: null },
})
const emit = defineEmits(['update:modelValue'])

// ── 状态 ──────────────────────────────────────────────────────
const visible = ref(false)
const containerRef = ref(null)
const canvasRef = ref(null)
const snapshotSrc = ref('')
const snapshotLoaded = ref(false)
const snapshotLoading = ref(false)

const points = ref([])    // 归一化坐标 {x: 0-1, y: 0-1}
const isClosed = ref(false)
const mousePos = ref(null)
const nearFirstPoint = ref(false)

const CLOSE_THRESHOLD_PX = 14

// ── 计算属性 ──────────────────────────────────────────────────
const hasRoi = computed(() => {
  const v = props.modelValue?.trim()
  return !!v && v !== '[]'
})

const roiSummary = computed(() => {
  try {
    const pts = JSON.parse(props.modelValue)
    if (Array.isArray(pts) && pts.length >= 3) return `(${pts.length} 个顶点)`
  } catch {}
  return ''
})

// ── 公开方法 ──────────────────────────────────────────────────
function openDrawer() {
  points.value = []
  isClosed.value = false
  mousePos.value = null
  nearFirstPoint.value = false

  // 若已有 ROI，先加载进来
  if (hasRoi.value) {
    try {
      const pts = JSON.parse(props.modelValue)
      if (Array.isArray(pts) && pts.length >= 3) {
        points.value = pts.map(([x, y]) => ({ x, y }))
        isClosed.value = true
      }
    } catch {}
  }

  // 加载摄像头快照
  snapshotLoaded.value = false
  snapshotLoading.value = false
  snapshotSrc.value = ''
  if (props.cameraId) {
    snapshotLoading.value = true
    const img = new Image()
    img.onload = () => {
      snapshotSrc.value = img.src
      snapshotLoaded.value = true
      snapshotLoading.value = false
      nextTick(() => { resizeCanvas(); draw() })
    }
    img.onerror = () => {
      snapshotLoading.value = false
    }
    img.src = `/api/cameras/${props.cameraId}/snapshot?t=${Date.now()}`
  }

  visible.value = true
}

function clearRoi() {
  emit('update:modelValue', '')
}

function onDialogOpened() {
  nextTick(() => { resizeCanvas(); draw() })
}

function onDialogClosed() {
  points.value = []
  isClosed.value = false
  mousePos.value = null
  nearFirstPoint.value = false
}

// ── 画布工具 ──────────────────────────────────────────────────
function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.round(rect.width)
  canvas.height = Math.round(rect.height)
}

function toPixel(p) {
  const canvas = canvasRef.value
  return { px: p.x * canvas.width, py: p.y * canvas.height }
}

function getNorm(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
  }
}

function distToFirst(nx, ny) {
  if (points.value.length < 3) return Infinity
  const canvas = canvasRef.value
  const f = points.value[0]
  const dx = (nx - f.x) * canvas.width
  const dy = (ny - f.y) * canvas.height
  return Math.sqrt(dx * dx + dy * dy)
}

// ── 交互事件 ──────────────────────────────────────────────────
function onMouseDown(e) {
  if (e.button !== 0) return
  if (isClosed.value) return

  const { x, y } = getNorm(e)

  if (distToFirst(x, y) < CLOSE_THRESHOLD_PX) {
    isClosed.value = true
    draw()
    return
  }

  points.value.push({ x, y })
  draw()
}

function onMouseMove(e) {
  if (isClosed.value) return
  const { x, y } = getNorm(e)
  mousePos.value = { x, y }
  nearFirstPoint.value = distToFirst(x, y) < CLOSE_THRESHOLD_PX
  draw()
}

function onMouseLeave() {
  mousePos.value = null
  nearFirstPoint.value = false
  draw()
}

function undoLast() {
  if (isClosed.value) {
    isClosed.value = false
  } else if (points.value.length > 0) {
    points.value.pop()
  }
  draw()
}

function clearPoints() {
  points.value = []
  isClosed.value = false
  mousePos.value = null
  nearFirstPoint.value = false
  draw()
}

function confirmRoi() {
  if (points.value.length < 3) return
  const result = points.value.map(p => [
    Math.round(p.x * 10000) / 10000,
    Math.round(p.y * 10000) / 10000,
  ])
  emit('update:modelValue', JSON.stringify(result))
  visible.value = false
}

// ── 绘制 ─────────────────────────────────────────────────────
function draw() {
  const canvas = canvasRef.value
  if (!canvas || !canvas.width) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  ctx.clearRect(0, 0, w, h)

  const pts = points.value
  if (pts.length === 0) return

  const pixels = pts.map(p => ({ px: p.x * w, py: p.y * h }))

  // ── 多边形填充（3+ 顶点时） ──
  if (pts.length >= 2) {
    ctx.beginPath()
    ctx.moveTo(pixels[0].px, pixels[0].py)
    for (let i = 1; i < pixels.length; i++) ctx.lineTo(pixels[i].px, pixels[i].py)

    if (isClosed.value) {
      ctx.closePath()
      ctx.fillStyle = 'rgba(59, 130, 246, 0.20)'
      ctx.fill()
      ctx.strokeStyle = '#3b82f6'
    } else {
      ctx.strokeStyle = 'rgba(99, 179, 237, 0.85)'
    }
    ctx.lineWidth = 2
    ctx.setLineDash([])
    ctx.stroke()
  }

  // ── 预览线（未闭合时，从最后顶点到鼠标） ──
  if (!isClosed.value && pts.length > 0 && mousePos.value) {
    const last = pixels[pixels.length - 1]
    const mx = mousePos.value.x * w
    const my = mousePos.value.y * h

    ctx.beginPath()
    ctx.moveTo(last.px, last.py)
    ctx.lineTo(mx, my)
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = nearFirstPoint.value ? '#f59e0b' : 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.setLineDash([])

    // 当靠近首个顶点时，额外画一条虚线回到首顶点，形成预览闭合
    if (nearFirstPoint.value && pts.length >= 3) {
      ctx.beginPath()
      ctx.moveTo(mx, my)
      ctx.lineTo(pixels[0].px, pixels[0].py)
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = '#f59e0b'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // ── 顶点圆点 ──
  pixels.forEach(({ px, py }, i) => {
    const isFirst = i === 0
    const radius = isFirst ? 6 : 5

    ctx.beginPath()
    ctx.arc(px, py, radius, 0, Math.PI * 2)
    ctx.fillStyle = isFirst ? '#f59e0b' : '#3b82f6'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 顶点编号
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${isFirst ? 11 : 10}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(i + 1, px, py)
  })

  // ── 首个顶点靠近时的吸附光晕 ──
  if (!isClosed.value && nearFirstPoint.value && pts.length >= 3) {
    ctx.beginPath()
    ctx.arc(pixels[0].px, pixels[0].py, 13, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
</script>

<style scoped>
.roi-drawer {
  display: inline-block;
  width: 100%;
}
</style>
