<template>
  <div class="dashboard">
    <!-- ── Left: Video Preview ── -->
    <div class="dashboard-left">
      <div class="panel-header">
        <span class="panel-title">
          <el-icon style="color:#1890ff;margin-right:6px"><Monitor /></el-icon>任务预览
        </span>
        <div class="layout-toggle">
          <el-tooltip content="单画面 1×1" placement="top">
            <button class="layout-btn" :class="{ active: layout === 1 }" @click="setLayout(1)">1</button>
          </el-tooltip>
          <el-tooltip content="四画面 2×2" placement="top">
            <button class="layout-btn" :class="{ active: layout === 4 }" @click="setLayout(4)">4</button>
          </el-tooltip>
          <el-tooltip content="六画面 3×2" placement="top">
            <button class="layout-btn" :class="{ active: layout === 6 }" @click="setLayout(6)">6</button>
          </el-tooltip>
          <el-tooltip content="九画面 3×3" placement="top">
            <button class="layout-btn" :class="{ active: layout === 9 }" @click="setLayout(9)">9</button>
          </el-tooltip>
        </div>
      </div>

      <div class="video-grid" :class="`grid-${layout}`">
        <div v-for="i in layout" :key="i" class="video-slot">
          <div class="video-slot__bar">
            <el-select
              v-model="selectedTasks[i - 1]"
              placeholder="请选择任务"
              size="small"
              clearable
              style="flex:1;min-width:0"
            >
              <el-option
                v-for="t in runningTasks"
                :key="t.id"
                :label="`${t.task_name} · ${t.camera_name}`"
                :value="t.id"
              />
            </el-select>
            <el-tag
              v-if="getTaskById(selectedTasks[i - 1])"
              type="success"
              size="small"
              style="flex-shrink:0;margin-left:6px"
            >运行中</el-tag>
          </div>
          <div class="video-slot__player">
            <VideoPlayer :url="getFlvUrl(i - 1)" :key="`slot-${i}-${selectedTasks[i - 1]}`" />
            <div v-if="!selectedTasks[i - 1]" class="video-slot__placeholder">
              <el-icon size="36" style="color:#4a5568"><VideoCamera /></el-icon>
              <span>选择任务开始预览</span>
            </div>
          </div>
          <div class="video-slot__footer">
            <span v-if="getTaskById(selectedTasks[i - 1])">
              <el-icon style="color:#67c23a;margin-right:4px"><Location /></el-icon>
              {{ getTaskById(selectedTasks[i - 1])?.camera_name || '—' }}
            </span>
            <span v-else style="color:#4a5568">暂未选择</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Right: Alarm Panel ── -->
    <div class="dashboard-right">
      <div class="panel-header">
        <span class="panel-title">
          <el-icon style="color:#e6a23c;margin-right:6px"><Bell /></el-icon>实时告警
        </span>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="current-time">{{ currentTime }}</span>
          <el-tooltip content="刷新告警" placement="top">
            <el-button :icon="Refresh" circle size="small" @click="refreshAlarms" :loading="alarmsLoading" />
          </el-tooltip>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stat-row">
        <div class="stat-card stat-card--orange">
          <div class="stat-card__icon-wrap">
            <el-icon size="22"><AlarmClock /></el-icon>
          </div>
          <div class="stat-card__body">
            <div class="stat-card__label">今日告警数量</div>
            <div class="stat-card__value">{{ todayCount }} <span class="stat-card__unit">个</span></div>
          </div>
        </div>
        <div class="stat-card stat-card--red">
          <div class="stat-card__icon-wrap">
            <el-icon size="22"><Warning /></el-icon>
          </div>
          <div class="stat-card__body">
            <div class="stat-card__label">告警条数</div>
            <div class="stat-card__value">{{ totalCount }} <span class="stat-card__unit">个</span></div>
          </div>
        </div>
      </div>

      <!-- Recent Alarm List -->
      <div class="alarm-scroll" v-loading="alarmsLoading">
        <el-empty v-if="!alarmsLoading && recentAlarms.length === 0" description="暂无告警记录" :image-size="64" style="padding:30px 0" />
        <div
          v-for="alarm in recentAlarms"
          :key="alarm.id"
          class="alarm-item"
          :class="{ 'alarm-item--unhandled': alarm.status === 0 }"
        >
          <div class="alarm-item__thumb">
            <el-image
              v-if="alarm.image_url"
              :src="alarm.image_url"
              :preview-src-list="alarmImageUrls"
              :initial-index="recentAlarms.indexOf(alarm)"
              fit="cover"
              style="width:100%;height:100%"
              preview-teleported
            >
              <template #error>
                <div class="alarm-thumb-placeholder">
                  <el-icon style="color:#c0c4cc"><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <div v-else class="alarm-thumb-placeholder">
              <el-icon style="color:#c0c4cc"><Picture /></el-icon>
            </div>
          </div>
          <div class="alarm-item__info">
            <div class="alarm-item__top">
              <span class="alarm-item__algo">{{ alarm.algo_name || '未知算法' }}</span>
              <el-tag :type="alarm.status === 1 ? 'success' : 'warning'" size="small" effect="plain">
                {{ alarm.status === 1 ? '已处理' : '未处理' }}
              </el-tag>
            </div>
            <div class="alarm-item__meta">
              <el-icon style="color:#909399"><VideoCamera /></el-icon>
              <span>{{ alarm.camera_name || alarm.task_name || '—' }}</span>
            </div>
            <div class="alarm-item__meta">
              <el-icon style="color:#909399"><Clock /></el-icon>
              <span>{{ formatTime(alarm.alarm_time) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Monitor, VideoCamera, Bell, Warning, Refresh,
  AlarmClock, Picture, Clock, Location,
} from '@element-plus/icons-vue'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { taskApi } from '@/api/task'
import { alarmApi } from '@/api/alarm'

// ── Video grid state ──
const layout = ref(4)
const selectedTasks = ref(Array(9).fill(null))
const allTasks = ref([])

const runningTasks = computed(() => allTasks.value.filter(t => t.status === 1))

function setLayout(n) {
  layout.value = n
}

function getTaskById(taskId) {
  if (!taskId) return null
  return allTasks.value.find(t => t.id === taskId) || null
}

function getFlvUrl(slotIndex) {
  const taskId = selectedTasks.value[slotIndex]
  if (!taskId) return ''
  const task = getTaskById(taskId)
  if (!task?.camera_id) return ''
  return `http://${window.location.hostname}/live/cam${task.camera_id}.live.flv`
}

async function fetchTasks() {
  try {
    const res = await taskApi.list()
    allTasks.value = res.data || []
  } catch { /* ignore */ }
}

// ── Alarm state ──
const recentAlarms = ref([])
const todayCount = ref(0)
const totalCount = ref(0)
const alarmsLoading = ref(false)

const alarmImageUrls = computed(() =>
  recentAlarms.value.filter(a => a.image_url).map(a => a.image_url)
)

function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T'))
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

function todayDateStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

async function refreshAlarms() {
  alarmsLoading.value = true
  try {
    const [recentRes, todayRes, totalRes] = await Promise.all([
      alarmApi.list({ page: 1, size: 20 }),
      alarmApi.list({ page: 1, size: 1, start_date: todayDateStr(), end_date: todayDateStr() }),
      alarmApi.list({ page: 1, size: 1 }),
    ])
    recentAlarms.value = recentRes.data?.list || []
    todayCount.value = todayRes.data?.total || 0
    totalCount.value = totalRes.data?.total || 0
  } catch { /* ignore */ } finally {
    alarmsLoading.value = false
  }
}

// ── Clock ──
const currentTime = ref('')
function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

let clockTimer = null
let refreshTimer = null

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  fetchTasks()
  refreshAlarms()
  refreshTimer = setInterval(() => {
    fetchTasks()
    refreshAlarms()
  }, 60000)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
})
</script>

<style scoped>
/* ── Page layout ── */
.dashboard {
  display: flex;
  gap: 24px;
  height: calc(100vh - 112px);
  min-height: 0;
}

.dashboard-left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.dashboard-right {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

/* ── Panel header ── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  background: #ffffff;
}

.panel-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

/* ── Layout toggle ── */
.layout-toggle {
  display: flex;
  gap: 6px;
  background: var(--bg-color);
  padding: 4px;
  border-radius: 8px;
}

.layout-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-weight: 600;
  transition: all 0.2s ease;
}

.layout-btn:hover {
  background: #e2e8f0;
  color: var(--text-main);
}

.layout-btn.active {
  background: #ffffff;
  color: var(--primary-color);
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* ── Video grid ── */
.video-grid {
  flex: 1;
  display: grid;
  gap: 12px;
  padding: 16px;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
}

.grid-1 { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }
.grid-6 { grid-template-columns: repeat(3, 1fr); grid-template-rows: 1fr 1fr; }
.grid-9 { grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }

/* ── Video slot ── */
.video-slot {
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
  min-height: 0;
}

.video-slot__bar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.9);
  gap: 8px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

/* Override element plus select style for dark mode */
.video-slot__bar :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.1);
  box-shadow: none !important;
}
.video-slot__bar :deep(.el-input__inner) {
  color: #f8fafc;
}

.video-slot__player {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: #000;
}

.video-slot__placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #64748b;
  font-size: 14px;
  background: #0f172a;
  pointer-events: none;
}

.video-slot__footer {
  padding: 6px 12px;
  font-size: 13px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.9);
  border-top: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

/* ── Clock ── */
.current-time {
  font-size: 13px;
  font-family: monospace;
  color: var(--text-secondary);
  background: var(--bg-color);
  padding: 4px 10px;
  border-radius: 12px;
}

/* ── Stat cards ── */
.stat-row {
  display: flex;
  gap: 16px;
  padding: 20px;
  flex-shrink: 0;
}

.stat-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  right: -10px;
  bottom: -10px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  opacity: 0.1;
}

.stat-card--orange {
  background: linear-gradient(135deg, #fff7ed, #ffedd5);
  border: 1px solid #fed7aa;
}
.stat-card--orange::after { background: #ea580c; }

.stat-card--red {
  background: linear-gradient(135deg, #fff1f2, #ffe4e6);
  border: 1px solid #fecdd3;
}
.stat-card--red::after { background: #e11d48; }

.stat-card__icon-wrap {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.stat-card--orange .stat-card__icon-wrap {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: #fff;
}

.stat-card--red .stat-card__icon-wrap {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: #fff;
}

.stat-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1;
}

.stat-card__unit {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* ── Alarm scroll list ── */
.alarm-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
  min-height: 0;
}

/* ── Alarm item ── */
.alarm-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  margin-bottom: 12px;
  background: var(--bg-color);
  border-radius: 10px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.alarm-item:hover {
  background: #ffffff;
  border-color: var(--border-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  transform: translateY(-2px);
}

.alarm-item--unhandled {
  background: #fffbeb;
  border-color: #fde68a;
}
.alarm-item--unhandled:hover {
  background: #ffffff;
  border-color: #fcd34d;
}

.alarm-item__thumb {
  width: 90px;
  height: 68px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e2e8f0;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.05);
}

.alarm-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
}

.alarm-item__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.alarm-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.alarm-item__algo {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.alarm-item__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
