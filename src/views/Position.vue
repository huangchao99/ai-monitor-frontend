<template>
  <div class="position-container">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><LocationInformation /></el-icon>
            <span>实时定位信息</span>
          </div>
          <el-button :icon="Refresh" size="small" @click="fetchStatus" :loading="statusLoading">
            刷新
          </el-button>
        </div>
      </template>

      <div class="status-overview">
        <div class="status-chip">
          <span class="status-label">定位状态</span>
          <el-tag :type="status.location_valid ? 'success' : 'info'" effect="light" round>
            {{ status.location_valid ? '有效' : '无效' }}
          </el-tag>
        </div>
        <div class="status-chip">
          <span class="status-label">当前航行状态</span>
          <el-tag :type="navStateTagType(status.navigation_state)" effect="dark" round>
            {{ navStateLabel(status.navigation_state) }}
          </el-tag>
        </div>
        <div class="status-chip">
          <span class="status-label">定位来源</span>
          <span>{{ status.source || '—' }}</span>
        </div>
      </div>

      <el-row :gutter="16" class="metric-grid">
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">纬度</div>
            <div class="metric-value">
              {{ formatCoordinate(status.latitude) }}
              <span class="metric-unit">{{ status.latitude_dir || '' }}</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">经度</div>
            <div class="metric-value">
              {{ formatCoordinate(status.longitude) }}
              <span class="metric-unit">{{ status.longitude_dir || '' }}</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">对地航向</div>
            <div class="metric-value">
              {{ formatNumber(status.course, 2) }}
              <span class="metric-unit">°</span>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">对地速度</div>
            <div class="metric-value">
              {{ formatNumber(status.speed_knots, 2) }}
              <span class="metric-unit">节</span>
            </div>
            <div class="metric-sub">{{ formatNumber(status.speed_kmh, 2) }} km/h</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">UTC 时间</div>
            <div class="metric-value metric-time">{{ status.utc_time || '—' }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="metric-card">
            <div class="metric-title">北京时间</div>
            <div class="metric-value metric-time">{{ status.beijing_time || '—' }}</div>
          </div>
        </el-col>
      </el-row>

      <div class="meta-list">
        <div><span class="meta-label">最近更新时间：</span>{{ status.updated_at || '—' }}</div>
        <div><span class="meta-label">模块状态：</span>{{ status.position_status || '—' }}</div>
        <div v-if="status.error_message"><span class="meta-label">错误信息：</span>{{ status.error_message }}</div>
      </div>
    </el-card>

    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><SetUp /></el-icon>
          <span>航行判定配置</span>
        </div>
      </template>

      <el-form :model="settings" ref="formRef" label-width="120px" style="max-width: 560px">
        <el-form-item label="航行速度阈值" prop="speed_threshold_knots">
          <el-input-number
            v-model="settings.speed_threshold_knots"
            :min="0"
            :step="0.1"
            :precision="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="input-suffix">节</span>
          <div class="field-tip">当对地速度大于该值时判定为航行中，否则判定为停泊时。</div>
        </el-form-item>

        <el-form-item label="检测间隔" prop="check_interval_sec">
          <el-input-number
            v-model="settings.check_interval_sec"
            :min="1"
            :step="1"
            controls-position="right"
            style="width: 180px"
          />
          <span class="input-suffix">秒</span>
          <div class="field-tip">定位服务按该间隔采集一次速度并更新当前航行状态。</div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="settingsLoading">
            保存配置
          </el-button>
          <span class="save-tip" v-if="lastSaved">
            <el-icon style="vertical-align:-2px;margin-right:2px;color:#10b981"><CircleCheck /></el-icon>
            已保存
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { LocationInformation, Refresh, SetUp, CircleCheck } from '@element-plus/icons-vue'
import { positionApi } from '@/api/position'

const settings = reactive({
  speed_threshold_knots: 0.5,
  check_interval_sec: 30,
})

const status = reactive({
  provider_type: '',
  source: '',
  location_valid: false,
  position_status: '',
  navigation_state: 'unknown',
  latitude: 0,
  latitude_dir: '',
  longitude: 0,
  longitude_dir: '',
  speed_knots: 0,
  speed_kmh: 0,
  course: 0,
  utc_time: '',
  beijing_time: '',
  updated_at: '',
  error_message: '',
})

const formRef = ref(null)
const settingsLoading = ref(false)
const statusLoading = ref(false)
const lastSaved = ref(false)
let timer = null

function navStateLabel(state) {
  if (state === 'underway') return '航行中'
  if (state === 'moored') return '停泊时'
  return '未知'
}

function navStateTagType(state) {
  if (state === 'underway') return 'success'
  if (state === 'moored') return 'warning'
  return 'info'
}

function formatNumber(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—'
}

function formatCoordinate(value) {
  return Number.isFinite(Number(value)) && Number(value) !== 0 ? Number(value).toFixed(6) : '—'
}

async function fetchSettings() {
  settingsLoading.value = true
  try {
    const res = await positionApi.getSettings()
    Object.assign(settings, res.data)
  } finally {
    settingsLoading.value = false
  }
}

async function fetchStatus() {
  statusLoading.value = true
  try {
    const res = await positionApi.getStatus()
    Object.assign(status, res.data)
  } finally {
    statusLoading.value = false
  }
}

async function saveSettings() {
  settingsLoading.value = true
  lastSaved.value = false
  try {
    await positionApi.saveSettings({
      speed_threshold_knots: settings.speed_threshold_knots,
      check_interval_sec: settings.check_interval_sec,
    })
    lastSaved.value = true
    ElMessage.success('定位配置已保存')
    await fetchStatus()
  } finally {
    settingsLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchStatus()])
  timer = setInterval(fetchStatus, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.position-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #111827;
}

.header-icon {
  color: #3b82f6;
}

.status-overview {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.status-label {
  color: #64748b;
  font-size: 13px;
}

.metric-grid {
  row-gap: 16px;
}

.metric-card {
  height: 100%;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid #e5e7eb;
}

.metric-title {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.metric-time {
  font-size: 18px;
}

.metric-unit {
  margin-left: 6px;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.metric-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.meta-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #475569;
}

.meta-label {
  color: #64748b;
}

.input-suffix {
  margin-left: 10px;
  color: #64748b;
}

.field-tip {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.save-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #10b981;
}
</style>
