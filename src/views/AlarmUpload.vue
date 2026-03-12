<template>
  <div class="upload-container">

    <!-- ══════════ 上传开关 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><Upload /></el-icon>
          <span>报警上传开关</span>
        </div>
      </template>
      <div class="switch-row">
        <div class="switch-desc">
          <div class="switch-title">全局报警上传</div>
          <div class="switch-sub">
            开启后，每分钟自动检查并将新报警图片上传到指定服务器；断网期间产生的报警在网络恢复后自动续传
          </div>
        </div>
        <el-switch
          v-model="settings.enabled"
          size="large"
          active-text="已开启"
          inactive-text="已关闭"
          :loading="settingsLoading"
          @change="saveSettings"
        />
      </div>
    </el-card>

    <!-- ══════════ 上传配置 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><Link /></el-icon>
          <span>上传配置</span>
        </div>
      </template>
      <el-form :model="settings" ref="formRef" label-width="90px" style="max-width: 580px">
        <el-form-item label="设备 ID" prop="device_id">
          <el-input
            v-model="settings.device_id"
            placeholder="如：sn123456（上传时作为 DeviceID 字段）"
            clearable
          />
        </el-form-item>
        <el-form-item
          label="上传地址"
          prop="upload_url"
          :rules="[{ required: settings.enabled, message: '已开启上传时必须填写上传地址', trigger: 'blur' }]"
        >
          <el-input
            v-model="settings.upload_url"
            placeholder="如：http://192.168.1.100:8080/api/alarm"
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="settingsLoading">保存配置</el-button>
          <span class="save-tip" v-if="lastSaved">
            <el-icon style="vertical-align:-2px;margin-right:2px;color:#10b981"><CircleCheck /></el-icon>
            已保存
          </span>
        </el-form-item>
      </el-form>

      <!-- 上传数据格式说明 -->
      <el-collapse style="margin-top:4px;max-width:580px">
        <el-collapse-item>
          <template #title>
            <span style="font-size:13px;color:#64748b">
              <el-icon style="vertical-align:-2px;margin-right:4px"><InfoFilled /></el-icon>
              查看上传数据格式
            </span>
          </template>
          <el-code-block language="json" style="font-size:12px">
            <pre class="code-preview">{
  "DeviceID":        "sn123456",      // 设备ID（页面配置）
  "TaskCode":        "任务名称",
  "CameraNo":        "摄像头名称",
  "ResultID":        "123",           // 报警记录ID
  "RecogType":       "离岗检测",      // 算法名称
  "ResultTime":      "2026-01-01 12:00:00",
  "ResultContent":   "识别结果描述",
  "ResultImageData": "...base64..."   // 报警截图 base64
}</pre>
          </el-code-block>
        </el-collapse-item>
      </el-collapse>
    </el-card>

    <!-- ══════════ 上传统计 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><DataAnalysis /></el-icon>
            <span>上传统计</span>
          </div>
          <div style="display:flex;gap:8px">
            <el-button :icon="Refresh" size="small" @click="fetchAll" :loading="statsLoading">刷新</el-button>
            <el-button
              type="warning"
              :icon="RefreshRight"
              size="small"
              @click="retryFailed"
              :loading="retryLoading"
              :disabled="stats.failed === 0"
            >
              立即重传失败项（{{ stats.failed }}）
            </el-button>
          </div>
        </div>
      </template>
      <div class="stats-row">
        <div class="stat-box stat-pending">
          <div class="stat-num">{{ stats.pending }}</div>
          <div class="stat-label">待上传</div>
        </div>
        <div class="stat-box stat-success">
          <div class="stat-num">{{ stats.success }}</div>
          <div class="stat-label">已成功</div>
        </div>
        <div class="stat-box stat-failed">
          <div class="stat-num">{{ stats.failed }}</div>
          <div class="stat-label">上传失败</div>
        </div>
        <div class="stat-box stat-total">
          <div class="stat-num">{{ stats.total }}</div>
          <div class="stat-label">累计入队</div>
        </div>
      </div>
    </el-card>

    <!-- ══════════ 队列记录 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><List /></el-icon>
          <span>队列记录</span>
        </div>
      </template>

      <div style="margin-bottom:16px">
        <el-radio-group v-model="queueFilter" @change="onFilterChange">
          <el-radio-button :value="-1">全部</el-radio-button>
          <el-radio-button :value="0">
            待上传
            <el-badge v-if="stats.pending > 0" :value="stats.pending" type="warning" style="margin-left:4px" />
          </el-radio-button>
          <el-radio-button :value="1">已成功</el-radio-button>
          <el-radio-button :value="2">
            失败
            <el-badge v-if="stats.failed > 0" :value="stats.failed" type="danger" style="margin-left:4px" />
          </el-radio-button>
        </el-radio-group>
      </div>

      <el-table :data="queueList" v-loading="queueLoading" border stripe style="width:100%" empty-text="暂无记录">
        <el-table-column prop="alarm_id" label="报警ID" width="80" align="center" />
        <el-table-column label="识别类型" width="120">
          <template #default="{ row }">
            <span style="font-weight:500">{{ row.algo_name || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="报警时间" width="165">
          <template #default="{ row }">{{ row.alarm_time || '—' }}</template>
        </el-table-column>
        <el-table-column label="任务" min-width="120">
          <template #default="{ row }">{{ row.task_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="摄像头" min-width="110">
          <template #default="{ row }">{{ row.camera_name || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 0" type="warning" effect="light" round>待上传</el-tag>
            <el-tag v-else-if="row.status === 1" type="success" effect="light" round>
              <el-icon style="vertical-align:-2px;margin-right:2px"><Check /></el-icon>成功
            </el-tag>
            <el-tag v-else type="danger" effect="light" round>失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="retry_count" label="重试次数" width="85" align="center">
          <template #default="{ row }">
            <span :style="row.retry_count > 0 ? 'color:#f59e0b;font-weight:600' : 'color:#c0c4cc'">
              {{ row.retry_count }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="错误原因" min-width="200">
          <template #default="{ row }">
            <el-tooltip v-if="row.last_error" :content="row.last_error" placement="top" :show-after="300">
              <span class="error-text">{{ row.last_error }}</span>
            </el-tooltip>
            <span v-else style="color:#c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="165" />
      </el-table>

      <div style="margin-top:16px;display:flex;justify-content:flex-end">
        <el-pagination
          v-model:current-page="queuePage"
          v-model:page-size="queueSize"
          :total="queueTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          background
          @change="fetchQueue"
        />
      </div>
    </el-card>

  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload, Link, DataAnalysis, List, Check,
  Refresh, RefreshRight, CircleCheck, InfoFilled,
} from '@element-plus/icons-vue'
import { alarmUploadApi } from '@/api/alarmUpload'

// ─── Settings ─────────────────────────────────────────────────
const settings = reactive({ enabled: false, upload_url: '', device_id: '' })
const settingsLoading = ref(false)
const lastSaved = ref(false)
const formRef = ref(null)

async function fetchSettings() {
  settingsLoading.value = true
  try {
    const res = await alarmUploadApi.getSettings()
    Object.assign(settings, res.data)
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  settingsLoading.value = true
  lastSaved.value = false
  try {
    await alarmUploadApi.saveSettings({
      enabled: settings.enabled,
      upload_url: settings.upload_url,
      device_id: settings.device_id,
    })
    ElMessage.success('配置已保存')
    lastSaved.value = true
    setTimeout(() => { lastSaved.value = false }, 3000)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
    await fetchSettings()
  } finally {
    settingsLoading.value = false
  }
}

// ─── Stats ────────────────────────────────────────────────────
const stats = reactive({ total: 0, pending: 0, success: 0, failed: 0 })
const statsLoading = ref(false)
const retryLoading = ref(false)

async function fetchStats() {
  statsLoading.value = true
  try {
    const res = await alarmUploadApi.getStats()
    Object.assign(stats, res.data)
  } finally {
    statsLoading.value = false
  }
}

async function retryFailed() {
  try {
    await ElMessageBox.confirm(
      `确定立即重传全部 ${stats.failed} 条失败记录？`,
      '提示',
      { type: 'warning' }
    )
  } catch { return }
  retryLoading.value = true
  try {
    await alarmUploadApi.retryFailed()
    ElMessage.success('已触发重传，稍后刷新查看结果')
    await fetchAll()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    retryLoading.value = false
  }
}

// ─── Queue ────────────────────────────────────────────────────
const queueList = ref([])
const queueLoading = ref(false)
const queueFilter = ref(-1)
const queuePage = ref(1)
const queueSize = ref(20)
const queueTotal = ref(0)

function onFilterChange() {
  queuePage.value = 1
  fetchQueue()
}

async function fetchQueue() {
  queueLoading.value = true
  try {
    const params = { page: queuePage.value, size: queueSize.value }
    if (queueFilter.value >= 0) params.status = queueFilter.value
    const res = await alarmUploadApi.listQueue(params)
    queueList.value = res.data?.list || []
    queueTotal.value = res.data?.total || 0
  } finally {
    queueLoading.value = false
  }
}

async function fetchAll() {
  await Promise.all([fetchStats(), fetchQueue()])
}

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchAll()])
})
</script>

<style scoped>
.upload-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card :deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.header-icon {
  color: #3b82f6;
  font-size: 16px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.switch-desc { flex: 1; }

.switch-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.switch-sub {
  font-size: 13px;
  color: #64748b;
  max-width: 600px;
  line-height: 1.6;
}

.save-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
}

.code-preview {
  margin: 0;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  line-height: 1.7;
  color: #334155;
  font-family: 'Courier New', monospace;
  white-space: pre;
  overflow-x: auto;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-box {
  flex: 1;
  min-width: 120px;
  border-radius: 10px;
  padding: 20px 24px;
  text-align: center;
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-label {
  font-size: 13px;
  margin-top: 6px;
}

.stat-pending { background: #fffbeb; }
.stat-pending .stat-num { color: #d97706; }
.stat-pending .stat-label { color: #92400e; }

.stat-success { background: #f0fdf4; }
.stat-success .stat-num { color: #16a34a; }
.stat-success .stat-label { color: #14532d; }

.stat-failed { background: #fef2f2; }
.stat-failed .stat-num { color: #dc2626; }
.stat-failed .stat-label { color: #7f1d1d; }

.stat-total { background: #f0f9ff; }
.stat-total .stat-num { color: #0284c7; }
.stat-total .stat-label { color: #0c4a6e; }

/* 错误文本截断 */
.error-text {
  color: #ef4444;
  font-size: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: default;
}
</style>
