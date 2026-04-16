<template>
  <div class="model-test-page">
    <el-card shadow="never" class="control-card">
      <div class="control-header">
        <div>
          <div class="page-title">模型测试</div>
          <div class="page-subtitle">选择模型管理中的 YOLO 模型和已添加摄像头，临时发起推理并查看检测框效果。</div>
        </div>
        <el-button :icon="Refresh" circle @click="fetchOptions" :loading="loading.options" />
      </div>

      <el-form label-position="top" class="control-form">
        <div class="control-grid">
          <el-form-item label="测试模型">
            <el-select
              v-model="form.model_id"
              filterable
              placeholder="请选择模型管理中的 YOLO 模型"
              style="width: 100%;"
              :disabled="hasActiveSession"
            >
              <el-option
                v-for="model in testableModels"
                :key="model.id"
                :label="`${model.model_name} (${model.model_type})`"
                :value="model.id"
              >
                <div class="option-main">{{ model.model_name }}</div>
                <div class="option-sub">{{ model.model_type }} · {{ model.input_width }} x {{ model.input_height }}</div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="测试摄像头">
            <el-select
              v-model="form.camera_id"
              filterable
              placeholder="请选择设备管理中的摄像头"
              style="width: 100%;"
              :disabled="hasActiveSession"
            >
              <el-option
                v-for="camera in cameras"
                :key="camera.id"
                :label="`${camera.name} (${camera.location || '未填写位置'})`"
                :value="camera.id"
              >
                <div class="option-main">{{ camera.name }}</div>
                <div class="option-sub">{{ camera.location || '未填写位置' }}</div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="推理跳帧">
            <el-input-number
              v-model="form.frame_skip"
              :min="1"
              :max="30"
              :disabled="hasActiveSession"
              style="width: 100%;"
            />
          </el-form-item>

          <div class="control-actions">
            <el-button
              type="primary"
              :icon="VideoPlay"
              :loading="loading.start"
              :disabled="hasActiveSession || !canStart"
              @click="startSession"
            >
              开始测试
            </el-button>
            <el-button
              type="warning"
              :icon="VideoPause"
              :loading="loading.stop"
              :disabled="!hasActiveSession"
              @click="stopSession()"
            >
              停止测试
            </el-button>
          </div>
        </div>
      </el-form>

      <el-alert
        title="页面离开时会主动注销本次推理；如果浏览器异常关闭，服务端会在短时间无心跳后自动回收。"
        type="info"
        :closable="false"
        show-icon
      />
    </el-card>

    <div class="content-grid">
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="card-header">
            <span>推理画面</span>
            <div class="header-tags">
              <el-tag v-if="sessionInfo" type="success" effect="plain">会话运行中</el-tag>
              <el-tag v-if="latestFrame" type="info" effect="plain">帧 {{ latestFrame.frame_id }}</el-tag>
              <el-tag v-if="latestFrame" type="warning" effect="plain">{{ flattenedDetections.length }} 个目标</el-tag>
            </div>
          </div>
        </template>

        <div v-if="!hasActiveSession && !previewState.hasDrawn" class="preview-empty">
          <el-empty description="开始模型测试后显示实时视频和检测框" />
        </div>

        <div v-else class="preview-shell">
          <VideoPlayer
            v-if="previewUrl"
            ref="videoPlayerRef"
            :url="previewUrl"
            class="preview-player"
          />
          <div v-else class="preview-video-empty">
            <el-empty description="摄像头视频流未就绪" />
          </div>

          <canvas ref="previewCanvas" class="preview-canvas"></canvas>

          <div v-if="previewState.error" class="preview-overlay is-error">
            <el-icon size="26"><Warning /></el-icon>
            <span>{{ previewState.error }}</span>
          </div>
          <div v-else-if="hasActiveSession && !latestFrame" class="preview-overlay">
            <el-icon class="is-loading" size="26"><Loading /></el-icon>
            <span>等待检测结果...</span>
          </div>
        </div>
      </el-card>

      <el-card shadow="never" class="side-card">
        <template #header>
          <div class="card-header">
            <span>当前信息</span>
          </div>
        </template>

        <div class="info-block">
          <div class="info-row">
            <span>模型</span>
            <strong>{{ activeModelName }}</strong>
          </div>
          <div class="info-row">
            <span>摄像头</span>
            <strong>{{ activeCameraName }}</strong>
          </div>
          <div class="info-row">
            <span>跳帧</span>
            <strong>{{ sessionInfo?.frame_skip ?? form.frame_skip }}</strong>
          </div>
          <div class="info-row">
            <span>推理耗时</span>
            <strong>{{ totalInferenceMs }} ms</strong>
          </div>
          <div class="info-row">
            <span>原图尺寸</span>
            <strong>{{ originalSizeText }}</strong>
          </div>
          <div class="info-row">
            <span>结果时间</span>
            <strong>{{ frameTimeText }}</strong>
          </div>
        </div>

        <el-divider />

        <div class="table-header">
          <span>检测明细</span>
          <el-tag type="info" effect="plain">{{ flattenedDetections.length }}</el-tag>
        </div>

        <el-table
          :data="flattenedDetections"
          border
          stripe
          height="520"
          empty-text="暂无检测结果"
          class="detection-table"
        >
          <el-table-column prop="class_name" label="类别" min-width="110" />
          <el-table-column label="概率" width="90" align="center">
            <template #default="{ row }">
              {{ row.confidence_text }}
            </template>
          </el-table-column>
          <el-table-column prop="bbox_text" label="检测框" min-width="200" show-overflow-tooltip />
          <el-table-column label="模型输出" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.task_name || activeModelName }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, Refresh, VideoPause, VideoPlay, Warning } from '@element-plus/icons-vue'
import { cameraApi } from '@/api/camera'
import { algoManageApi } from '@/api/algoManage'
import { modelTestApi } from '@/api/modelTest'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { buildCameraLiveUrl, resolveLivePlaybackUrl } from '@/utils/stream'

const models = ref([])
const cameras = ref([])
const previewCanvas = ref(null)
const videoPlayerRef = ref(null)

const form = reactive({
  model_id: null,
  camera_id: null,
  frame_skip: 5,
})

const loading = reactive({
  options: false,
  start: false,
  stop: false,
  latest: false,
})

const sessionId = ref('')
const sessionInfo = ref(null)
const latestFrame = ref(null)
const previewState = reactive({
  hasDrawn: false,
  error: '',
  lastTimestampMs: 0,
})

let latestPollTimer = null
let heartbeatTimer = null
let latestRequestInFlight = false
let overlayRafId = 0

const hasActiveSession = computed(() => Boolean(sessionId.value))
const testableModels = computed(() => models.value.filter((item) => /^yolo/i.test(item.model_type || '')))
const canStart = computed(() => Boolean(form.model_id && form.camera_id))
const activeCamera = computed(() => {
  const cameraId = sessionInfo.value?.camera?.id || form.camera_id
  return cameras.value.find((item) => item.id === cameraId) || null
})
const previewUrl = computed(() => {
  const flvUrl = activeCamera.value?.zlm_stream?.flv_url || buildCameraLiveUrl(activeCamera.value?.id)
  return flvUrl ? resolveLivePlaybackUrl(flvUrl) : ''
})

const flattenedDetections = computed(() => {
  const frame = latestFrame.value
  if (!frame?.results?.length) return []
  return frame.results.flatMap((result) =>
    (result.detections || []).map((det, index) => ({
      id: `${result.task_name || 'model'}-${det.class_name}-${index}-${det.bbox?.x1}-${det.bbox?.y1}`,
      task_name: result.task_name,
      class_name: det.class_name || `class_${det.class_id}`,
      confidence: Number(det.confidence || 0),
      confidence_text: `${(Number(det.confidence || 0) * 100).toFixed(1)}%`,
      bbox_text: formatBbox(det.bbox),
      bbox: det.bbox,
    }))
  )
})

const totalInferenceMs = computed(() => {
  const frame = latestFrame.value
  if (!frame?.results?.length) return '0.0'
  const total = frame.results.reduce((sum, item) => sum + Number(item.inference_time_ms || 0), 0)
  return total.toFixed(1)
})

const activeModelName = computed(() => {
  if (sessionInfo.value?.model?.model_name) return sessionInfo.value.model.model_name
  return models.value.find((item) => item.id === form.model_id)?.model_name || '-'
})

const activeCameraName = computed(() => {
  if (sessionInfo.value?.camera?.name) return sessionInfo.value.camera.name
  return cameras.value.find((item) => item.id === form.camera_id)?.name || '-'
})

const originalSizeText = computed(() => {
  if (!latestFrame.value?.original_width || !latestFrame.value?.original_height) return '-'
  return `${latestFrame.value.original_width} x ${latestFrame.value.original_height}`
})

const frameTimeText = computed(() => {
  if (!latestFrame.value?.timestamp_ms) return '-'
  const d = new Date(Number(latestFrame.value.timestamp_ms))
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
})

async function fetchOptions() {
  loading.options = true
  try {
    const [modelRes, cameraRes] = await Promise.all([
      algoManageApi.listModels(),
      cameraApi.list(),
    ])
    models.value = modelRes.data || []
    cameras.value = cameraRes.data || []

    if (!form.model_id && testableModels.value.length) {
      form.model_id = testableModels.value[0].id
    }
    if (!form.camera_id && cameras.value.length) {
      form.camera_id = cameras.value[0].id
    }
  } finally {
    loading.options = false
  }
}

async function startSession() {
  if (!canStart.value) {
    ElMessage.warning('请先选择模型和摄像头')
    return
  }

  loading.start = true
  try {
    await ensureCameraStream(form.camera_id)
    clearPreview()
    const res = await modelTestApi.createSession({
      model_id: form.model_id,
      camera_id: form.camera_id,
      frame_skip: form.frame_skip,
    })
    sessionId.value = res.data?.session_id || ''
    sessionInfo.value = res.data || null
    latestFrame.value = null
    previewState.lastTimestampMs = 0
    previewState.error = ''
    startPolling()
    startHeartbeat()
    await pollLatest()
    ElMessage.success('模型测试已启动')
  } finally {
    loading.start = false
  }
}

async function stopSession(options = {}) {
  const { silent = false } = options
  const currentId = sessionId.value
  if (!currentId) return

  if (!options.keepalive) {
    loading.stop = true
  }

  stopPolling()
  stopHeartbeat()

  try {
    if (options.keepalive) {
      fetch(`/api/model-test/sessions/${encodeURIComponent(currentId)}`, {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {})
    } else {
      await modelTestApi.deleteSession(currentId)
    }
    if (!silent && !options.keepalive) {
      ElMessage.success('模型测试已停止')
    }
  } catch (error) {
    if (!silent && !options.keepalive) {
      ElMessage.error(error.message || '停止模型测试失败')
    }
  } finally {
    resetSessionState()
    loading.stop = false
  }
}

function startPolling() {
  stopPolling()
  latestPollTimer = window.setInterval(() => {
    void pollLatest()
  }, 200)
}

function stopPolling() {
  if (latestPollTimer) {
    window.clearInterval(latestPollTimer)
    latestPollTimer = null
  }
}

function startHeartbeat() {
  stopHeartbeat()
  heartbeatTimer = window.setInterval(() => {
    if (!sessionId.value) return
    modelTestApi.heartbeat(sessionId.value).catch(() => {})
  }, 10000)
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

async function pollLatest() {
  if (!sessionId.value || latestRequestInFlight) return
  latestRequestInFlight = true
  loading.latest = true
  try {
    const res = await modelTestApi.getLatest(sessionId.value)
    sessionInfo.value = res.data?.session || sessionInfo.value
    latestFrame.value = res.data?.frame || null

    const timestampMs = Number(latestFrame.value?.timestamp_ms || 0)
    if (timestampMs > 0 && timestampMs !== previewState.lastTimestampMs) {
      previewState.lastTimestampMs = timestampMs
      previewState.hasDrawn = true
      previewState.error = ''
      drawOverlay()
    }
  } catch (error) {
    previewState.error = error.message || '获取推理结果失败'
    if (error.message?.includes('不存在') || error.message?.includes('已结束')) {
      resetSessionState()
    }
  } finally {
    latestRequestInFlight = false
    loading.latest = false
  }
}

async function ensureCameraStream(cameraId) {
  const camera = cameras.value.find((item) => item.id === cameraId)
  if (camera?.zlm_stream?.status === 1) return
  await cameraApi.streamStart(cameraId)
  await fetchOptions()
}

function drawOverlay() {
  const canvas = previewCanvas.value
  const frame = latestFrame.value
  const metrics = videoPlayerRef.value?.getDisplayMetrics?.()
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const cssWidth = Math.max(1, Math.round(metrics?.clientWidth || canvas.clientWidth || 1))
  const cssHeight = Math.max(1, Math.round(metrics?.clientHeight || canvas.clientHeight || 1))
  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr))
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr))

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  canvas.style.width = `${cssWidth}px`
  canvas.style.height = `${cssHeight}px`

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(dpr, dpr)

  if (!frame || !metrics?.drawWidth || !metrics?.drawHeight) {
    return
  }

  const origWidth = Number(frame.original_width || 0)
  const origHeight = Number(frame.original_height || 0)
  if (!origWidth || !origHeight) {
    return
  }

  const scaleX = metrics.drawWidth / origWidth
  const scaleY = metrics.drawHeight / origHeight
  const offsetX = metrics.offsetX || 0
  const offsetY = metrics.offsetY || 0

  for (const result of frame.results || []) {
    for (const det of result.detections || []) {
      const bbox = det.bbox || {}
      const x1 = offsetX + Number(bbox.x1 || 0) * scaleX
      const y1 = offsetY + Number(bbox.y1 || 0) * scaleY
      const x2 = offsetX + Number(bbox.x2 || 0) * scaleX
      const y2 = offsetY + Number(bbox.y2 || 0) * scaleY
      const width = Math.max(0, x2 - x1)
      const height = Math.max(0, y2 - y1)
      const color = colorForClass(det.class_name || '')
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x1, y1, width, height)

      const label = `${det.class_name || det.class_id} ${(Number(det.confidence || 0) * 100).toFixed(1)}%`
      ctx.font = '22px sans-serif'
      const textWidth = ctx.measureText(label).width
      const labelX = x1
      const labelY = Math.max(28, y1 - 8)
      ctx.fillStyle = color
      ctx.fillRect(labelX, labelY - 24, textWidth + 16, 30)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, labelX + 8, labelY - 2)
    }
  }
}

function renderOverlayLoop() {
  drawOverlay()
  overlayRafId = window.requestAnimationFrame(renderOverlayLoop)
}

function clearPreview() {
  previewState.hasDrawn = false
  previewState.error = ''
  previewState.lastTimestampMs = 0
  const canvas = previewCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
  canvas.width = 0
  canvas.height = 0
}

function resetSessionState() {
  sessionId.value = ''
  sessionInfo.value = null
  latestFrame.value = null
  stopPolling()
  stopHeartbeat()
  clearPreview()
}

function handleBeforeUnload() {
  if (!sessionId.value) return
  void stopSession({ silent: true, keepalive: true })
}

function colorForClass(name) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 80% 52%)`
}

function formatBbox(bbox) {
  if (!bbox) return '-'
  return [bbox.x1, bbox.y1, bbox.x2, bbox.y2]
    .map((item) => Number(item || 0).toFixed(1))
    .join(', ')
}

onMounted(() => {
  void fetchOptions()
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('resize', drawOverlay)
  overlayRafId = window.requestAnimationFrame(renderOverlayLoop)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('resize', drawOverlay)
  if (overlayRafId) {
    window.cancelAnimationFrame(overlayRafId)
    overlayRafId = 0
  }
  void stopSession({ silent: true })
})

onBeforeRouteLeave(async () => {
  await stopSession({ silent: true })
})
</script>

<style scoped>
.model-test-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-card,
.preview-card,
.side-card {
  border-radius: 14px;
}

.control-header,
.card-header,
.table-header,
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin-top: 6px;
  color: #6b7280;
  font-size: 13px;
}

.control-form {
  margin: 18px 0 8px;
}

.control-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(240px, 1.4fr) 160px 220px;
  gap: 16px;
  align-items: end;
}

.control-actions {
  display: flex;
  gap: 10px;
  padding-bottom: 2px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(360px, 0.9fr);
  gap: 16px;
  min-height: 680px;
}

.preview-card :deep(.el-card__body) {
  height: calc(100% - 56px);
}

.preview-shell {
  position: relative;
  min-height: 620px;
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.92)),
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 35%);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.preview-empty {
  min-height: 620px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-player,
.preview-video-empty,
.preview-canvas {
  position: absolute;
  inset: 0;
}

.preview-player :deep(.video-wrap) {
  width: 100%;
  height: 100%;
  aspect-ratio: auto;
  border-radius: 0;
}

.preview-video-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #e5e7eb;
  background: rgba(2, 6, 23, 0.42);
  z-index: 2;
}

.preview-overlay.is-error {
  color: #fecaca;
}

.side-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-block {
  display: grid;
  gap: 10px;
}

.info-row {
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
}

.info-row strong {
  color: #0f172a;
  font-weight: 600;
  margin-left: 16px;
  text-align: right;
}

.header-tags {
  display: flex;
  gap: 8px;
}

.option-main {
  font-weight: 600;
  color: #111827;
}

.option-sub {
  font-size: 12px;
  color: #6b7280;
}

.detection-table {
  flex: 1;
}

@media (max-width: 1280px) {
  .control-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .control-grid {
    grid-template-columns: 1fr;
  }

  .control-actions {
    padding-bottom: 0;
  }

  .control-actions :deep(.el-button) {
    flex: 1;
  }

  .preview-shell,
  .preview-empty {
    min-height: 360px;
  }
}
</style>
