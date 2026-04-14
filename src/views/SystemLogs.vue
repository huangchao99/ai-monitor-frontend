<template>
  <div class="system-logs-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>日志查看</span>
          </div>
          <div class="header-actions">
            <el-select v-model="lineLimit" style="width: 120px" @change="fetchLogs" :disabled="logsLoading">
              <el-option :value="100" label="100 行" />
              <el-option :value="200" label="200 行" />
              <el-option :value="500" label="500 行" />
            </el-select>
            <el-switch v-model="autoRefresh" active-text="自动刷新" inactive-text="手动刷新" />
            <el-button :icon="Refresh" size="small" @click="fetchLogs" :loading="logsLoading">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <div class="logs-layout">
        <div class="service-sidebar" v-loading="servicesLoading">
          <div class="sidebar-title">服务列表</div>
          <div
            v-for="service in services"
            :key="service.key"
            class="service-item"
            :class="{ active: service.key === selectedServiceKey }"
            @click="selectedServiceKey = service.key"
          >
            <div class="service-main">
              <div class="service-name">{{ service.name }}</div>
              <div class="service-unit">{{ service.unit }}</div>
            </div>
            <el-tag :type="tagType(service)" effect="light" round>
              {{ serviceStatusLabel(service) }}
            </el-tag>
          </div>
        </div>

        <div class="logs-panel">
          <template v-if="activeService">
            <div class="service-summary">
              <div>
                <div class="summary-title">{{ activeService.name }}</div>
                <div class="summary-sub">{{ activeService.unit }}</div>
              </div>
              <div class="summary-meta">
              <el-button
                type="warning"
                size="small"
                @click="restartService"
                :loading="restartLoading"
                :disabled="!activeService.exists || logsLoading"
              >
                重启服务
              </el-button>
                <el-tag :type="tagType(activeService)" round>
                  {{ serviceStatusLabel(activeService) }}
                </el-tag>
                <span class="summary-time">更新时间：{{ updatedAt || '—' }}</span>
              </div>
            </div>

            <el-alert
              v-if="message"
              class="logs-alert"
              type="info"
              :closable="false"
              show-icon
              :title="message"
            />

            <div class="log-terminal" v-loading="logsLoading">
              <pre>{{ logText || '暂无日志输出' }}</pre>
            </div>
          </template>

          <el-empty v-else description="未发现日志服务" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Refresh } from '@element-plus/icons-vue'
import { systemApi } from '@/api/system'

const servicesLoading = ref(false)
const logsLoading = ref(false)
const restartLoading = ref(false)
const services = ref([])
const selectedServiceKey = ref('')
const lineLimit = ref(200)
const autoRefresh = ref(true)
const logText = ref('')
const updatedAt = ref('')
const message = ref('')
let timer = null

const activeService = computed(() =>
  services.value.find((item) => item.key === selectedServiceKey.value) || null
)

function serviceStatusLabel(service) {
  if (!service?.exists) return '未安装'
  if (service.active_state === 'active') return '运行中'
  if (service.active_state === 'activating') return '启动中'
  if (service.active_state === 'failed') return '失败'
  if (service.active_state === 'inactive') return '未运行'
  return service.active_state || '未知'
}

function tagType(service) {
  if (!service?.exists) return 'info'
  if (service.active_state === 'active') return 'success'
  if (service.active_state === 'failed') return 'danger'
  if (service.active_state === 'activating') return 'warning'
  return 'info'
}

async function fetchServices() {
  servicesLoading.value = true
  try {
    const res = await systemApi.listLogServices()
    services.value = res.data?.services || []
    if (!selectedServiceKey.value || !services.value.some((item) => item.key === selectedServiceKey.value)) {
      selectedServiceKey.value = services.value[0]?.key || ''
    }
  } finally {
    servicesLoading.value = false
  }
}

async function fetchLogs() {
  if (!selectedServiceKey.value) return
  logsLoading.value = true
  try {
    const res = await systemApi.getServiceLogs(selectedServiceKey.value, { lines: lineLimit.value })
    const service = res.data?.service
    if (service) {
      services.value = services.value.map((item) =>
        item.key === service.key ? service : item
      )
    }
    logText.value = res.data?.lines || ''
    updatedAt.value = res.data?.updated_at || ''
    message.value = res.data?.message || ''
  } finally {
    logsLoading.value = false
  }
}

async function restartService() {
  if (!activeService.value?.exists) return

  await ElMessageBox.confirm(
    `确定要重启 ${activeService.value.name}（${activeService.value.unit}）吗？`,
    '确认重启',
    {
      type: 'warning',
      confirmButtonText: '重启',
      cancelButtonText: '取消',
    }
  )

  restartLoading.value = true
  try {
    const res = await systemApi.restartService(activeService.value.key)
    const service = res.data?.service
    if (service) {
      services.value = services.value.map((item) =>
        item.key === service.key ? service : item
      )
    }
    message.value = res.data?.message || ''
    updatedAt.value = res.data?.updated_at || ''
    ElMessage.success(message.value || '服务重启命令已发送')
    await fetchLogs()
  } catch (error) {
    if (error !== 'cancel') {
      throw error
    }
  } finally {
    restartLoading.value = false
  }
}

watch(selectedServiceKey, async (value) => {
  if (!value) return
  await fetchLogs()
}, { immediate: false })

watch(autoRefresh, (value) => {
  if (timer) clearInterval(timer)
  if (value) {
    timer = setInterval(fetchLogs, 5000)
  }
})

onMounted(async () => {
  await fetchServices()
  await fetchLogs()
  timer = setInterval(fetchLogs, 5000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.system-logs-page {
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
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
  color: #111827;
}

.header-icon {
  color: #3b82f6;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.logs-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 20px;
  min-height: 620px;
}

.service-sidebar {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fbfdff;
  overflow: hidden;
}

.sidebar-title {
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.service-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.service-item + .service-item {
  border-top: 1px solid #f1f5f9;
}

.service-item:hover {
  background: #f8fafc;
}

.service-item.active {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.service-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.service-unit {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}

.logs-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.service-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.summary-sub {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.summary-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.summary-time {
  font-size: 13px;
  color: #64748b;
}

.logs-alert {
  margin-bottom: 16px;
}

.log-terminal {
  flex: 1;
  min-height: 480px;
  border-radius: 12px;
  background: #0f172a;
  border: 1px solid #1e293b;
  padding: 16px;
  overflow: auto;
}

.log-terminal pre {
  margin: 0;
  color: #dbeafe;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1200px) {
  .logs-layout {
    grid-template-columns: 1fr;
  }
}
</style>
