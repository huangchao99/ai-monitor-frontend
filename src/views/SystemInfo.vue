<template>
  <div class="system-info-container">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header" style="justify-content: space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><Monitor /></el-icon>
            <span>系统信息</span>
          </div>
          <el-button :icon="Refresh" size="small" @click="fetchInfo" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <div class="overview-row">
        <div class="overview-chip">
          <span class="chip-label">系统时间</span>
          <span class="chip-value">{{ info.current_time || '—' }}</span>
        </div>
      </div>

      <el-row :gutter="16" class="metric-grid">
        <el-col :xs="24" :sm="12" :lg="6">
          <div class="metric-card">
            <div class="metric-title">CPU 占用</div>
            <div class="metric-value">
              {{ formatPercent(info.cpu.usage_percent) }}
            </div>
            <el-progress
              :percentage="clampPercent(info.cpu.usage_percent)"
              :stroke-width="10"
              :show-text="false"
              color="#3b82f6"
            />
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <div class="metric-card">
            <div class="metric-title">内存占用</div>
            <div class="metric-value">
              {{ formatPercent(info.memory.usage_percent) }}
            </div>
            <div class="metric-sub">
              已用 {{ formatBytes(info.memory.used_bytes) }} / 总计 {{ formatBytes(info.memory.total_bytes) }}
            </div>
            <el-progress
              :percentage="clampPercent(info.memory.usage_percent)"
              :stroke-width="10"
              :show-text="false"
              color="#10b981"
            />
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <div class="metric-card">
            <div class="metric-title">磁盘占用</div>
            <div class="metric-value">
              {{ formatPercent(info.disk.usage_percent) }}
            </div>
            <div class="metric-sub">
              已用 {{ formatBytes(info.disk.used_bytes) }} / 总计 {{ formatBytes(info.disk.total_bytes) }}
            </div>
            <el-progress
              :percentage="clampPercent(info.disk.usage_percent)"
              :stroke-width="10"
              :show-text="false"
              color="#f59e0b"
            />
          </div>
        </el-col>

        <el-col :xs="24" :sm="12" :lg="6">
          <div class="metric-card">
            <div class="metric-title">磁盘剩余空间</div>
            <div class="metric-value">
              {{ formatBytes(info.disk.free_bytes) }}
            </div>
            <div class="metric-sub">
              挂载点 {{ info.disk.mount_path || '/' }}
            </div>
          </div>
        </el-col>
      </el-row>

      <div class="detail-grid">
        <div class="detail-card">
          <div class="detail-title">内存详情</div>
          <div class="detail-line">可用内存：{{ formatBytes(info.memory.free_bytes) }}</div>
          <div class="detail-line">总内存：{{ formatBytes(info.memory.total_bytes) }}</div>
        </div>
        <div class="detail-card">
          <div class="detail-title">磁盘详情</div>
          <div class="detail-line">可用磁盘：{{ formatBytes(info.disk.free_bytes) }}</div>
          <div class="detail-line">总磁盘：{{ formatBytes(info.disk.total_bytes) }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'
import { Monitor, Refresh } from '@element-plus/icons-vue'
import { systemApi } from '@/api/system'

const loading = ref(false)
let timer = null

const info = reactive({
  current_time: '',
  cpu: {
    usage_percent: 0,
  },
  memory: {
    total_bytes: 0,
    used_bytes: 0,
    free_bytes: 0,
    usage_percent: 0,
  },
  disk: {
    mount_path: '/',
    total_bytes: 0,
    used_bytes: 0,
    free_bytes: 0,
    usage_percent: 0,
  },
})

function clampPercent(value) {
  const percent = Number(value)
  if (!Number.isFinite(percent)) return 0
  return Math.max(0, Math.min(100, Number(percent.toFixed(2))))
}

function formatPercent(value) {
  const percent = Number(value)
  return Number.isFinite(percent) ? `${percent.toFixed(2)}%` : '—'
}

function formatBytes(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '—'
  if (value === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`
}

async function fetchInfo() {
  loading.value = true
  try {
    const res = await systemApi.getInfo()
    Object.assign(info, res.data)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchInfo()
  timer = setInterval(fetchInfo, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.system-info-container {
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

.overview-row {
  display: flex;
  margin-bottom: 16px;
}

.overview-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.chip-label {
  color: #64748b;
  font-size: 13px;
}

.chip-value {
  color: #0f172a;
  font-weight: 600;
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
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin-bottom: 10px;
}

.metric-sub {
  margin-bottom: 10px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

.detail-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.detail-card {
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
}

.detail-title {
  margin-bottom: 10px;
  color: #0f172a;
  font-weight: 600;
}

.detail-line {
  color: #475569;
  font-size: 13px;
  line-height: 1.8;
}
</style>
