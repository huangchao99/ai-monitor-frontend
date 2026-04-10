<template>
  <div>
    <!-- Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <el-button type="primary" :icon="Plus" @click="openCreate">添加摄像头</el-button>
      <el-button :icon="Refresh" circle @click="fetchCameras" :loading="tableLoading" />
    </div>

    <!-- Table -->
    <el-card shadow="never" style="padding: 0;">
      <el-table :data="cameras" v-loading="tableLoading" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="设备信息" min-width="180">
          <template #default="{ row }">
            <div style="font-weight: 600; color: #303133">{{ row.name }}</div>
            <div style="font-size: 12px; color: #909399">
              <el-icon style="vertical-align: middle; margin-right: 2px;"><Location /></el-icon>
              {{ row.location || '未知地点' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="rtsp_url" label="RTSP 地址" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="rtsp-code">{{ row.rtsp_url }}</code>
          </template>
        </el-table-column>
        <el-table-column label="推流状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="streamStatusType(row)" effect="light" round>
              <div style="display:flex;align-items:center;gap:4px">
                <span :class="['status-dot', isStreamActive(row) ? 'is-running' : '']"></span>
                {{ streamStatusLabel(row) }}
              </div>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip content="实时预览" placement="top">
                <el-button size="small" :icon="VideoPlay" @click="previewCamera(row)" />
              </el-tooltip>
              <el-tooltip content="编辑配置" placement="top">
                <el-button size="small" :icon="Edit" @click="openEdit(row)" />
              </el-tooltip>
              <el-tooltip :content="isStreamActive(row) ? '停止推流' : '启动推流'" placement="top">
                <el-button
                  size="small"
                  :type="isStreamActive(row) ? 'warning' : 'success'"
                  :icon="isStreamActive(row) ? VideoPause : VideoCamera"
                  @click="toggleStream(row)"
                  :loading="streamLoading[row.id]"
                >
                  {{ isStreamActive(row) ? '停流' : '开流' }}
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除设备" placement="top">
                <el-button size="small" type="danger" :icon="Delete" @click="removeCamera(row)" />
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Camera Form Dialog -->
    <el-dialog 
      v-model="formVisible" 
      :title="isEditing ? '编辑监控设备' : '添加监控设备'" 
      width="560px" 
      @closed="resetForm"
      class="camera-dialog"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" label-position="left">
        <div class="dialog-section-title">设备信息</div>
        <div class="form-section">
          <el-form-item label="设备名称" prop="name">
            <el-input v-model="form.name" placeholder="如: 前台摄像头" />
          </el-form-item>
          <el-form-item label="安装地点" prop="location">
            <el-input v-model="form.location" placeholder="如: 1号楼大厅" />
          </el-form-item>
          <el-form-item label="RTSP 地址" prop="rtsp_url">
            <el-input v-model="form.rtsp_url" type="textarea" :rows="3" placeholder="rtsp://user:pass@ip:554/..." />
            <div style="font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4;">
              请确保 RTSP 地址在局域网内可访问
            </div>
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="formLoading">
          {{ isEditing ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Preview Dialog -->
    <el-dialog 
      v-model="previewVisible" 
      :title="`实时预览 - ${previewCameraRef?.name}`" 
      width="840px" 
      @closed="previewUrl = ''"
      class="preview-dialog"
    >
      <div class="video-container">
        <VideoPlayer :url="previewUrl" style="width:100%" />
      </div>
      <div class="preview-footer">
        <div class="url-info">
          <el-icon><Link /></el-icon>
          <span>HTTP-FLV: {{ previewUrl }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Edit, Delete, VideoPlay, VideoPause, VideoCamera, Location, Link } from '@element-plus/icons-vue'
import { cameraApi } from '@/api/camera'
import VideoPlayer from '@/components/VideoPlayer.vue'
import { resolveLivePlaybackUrl } from '@/utils/stream'
// ... 脚本部分逻辑保持不变 ...

// ... 脚本部分逻辑保持不变 ...
const cameras = ref([])
const tableLoading = ref(false)
const streamLoading = reactive({})

const formVisible = ref(false)
const formLoading = ref(false)
const isEditing = ref(false)
const editId = ref(null)
const formRef = ref(null)
const form = reactive({ name: '', location: '', rtsp_url: '' })
const rules = {
  name: [{ required: true, message: '请输入名称' }],
  rtsp_url: [{ required: true, message: '请输入 RTSP 地址' }],
}

const previewVisible = ref(false)
const previewUrl = ref('')
const previewCameraRef = ref(null)

async function fetchCameras() {
  tableLoading.value = true
  try {
    const res = await cameraApi.list()
    cameras.value = res.data || []
  } finally {
    tableLoading.value = false
  }
}

function isStreamActive(row) {
  return row.zlm_stream?.status === 1
}

function streamStatusType(row) {
  const s = row.zlm_stream?.status
  if (s === 1) return 'success'
  if (s === 2) return 'danger'
  return 'info'
}

function streamStatusLabel(row) {
  const s = row.zlm_stream?.status
  if (s === 1) return '推流中'
  if (s === 2) return '异常'
  return '未启动'
}

async function toggleStream(row) {
  streamLoading[row.id] = true
  try {
    if (isStreamActive(row)) {
      await cameraApi.streamStop(row.id)
      ElMessage.success('已停止推流')
    } else {
      await cameraApi.streamStart(row.id)
      ElMessage.success('推流已启动')
    }
    await fetchCameras()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    streamLoading[row.id] = false
  }
}

function resolveFlvUrl(flv) {
  return resolveLivePlaybackUrl(flv)
}

function previewCamera(row) {
  const flv = row.zlm_stream?.flv_url
  if (!flv || !isStreamActive(row)) {
    ElMessage.warning('该摄像头暂无活跃流，请先启动推流')
    return
  }
  previewCameraRef.value = row
  previewUrl.value = resolveFlvUrl(flv)
  previewVisible.value = true
}

function openCreate() {
  isEditing.value = false
  editId.value = null
  formVisible.value = true
}

function openEdit(row) {
  isEditing.value = true
  editId.value = row.id
  form.name = row.name
  form.location = row.location
  form.rtsp_url = row.rtsp_url
  formVisible.value = true
}

function resetForm() {
  form.name = ''
  form.location = ''
  form.rtsp_url = ''
  formRef.value?.resetFields()
}

async function submitForm() {
  await formRef.value?.validate()
  formLoading.value = true
  try {
    if (isEditing.value) {
      await cameraApi.update(editId.value, { ...form })
      ElMessage.success('更新成功')
    } else {
      await cameraApi.create({ ...form })
      ElMessage.success('添加成功，已自动启动 ZLM 推流')
    }
    formVisible.value = false
    await fetchCameras()
  } finally {
    formLoading.value = false
  }
}

async function removeCamera(row) {
  await ElMessageBox.confirm(`确定删除摄像头「${row.name}」？`, '提示', { type: 'warning' })
  await cameraApi.remove(row.id)
  ElMessage.success('已删除')
  await fetchCameras()
}

onMounted(fetchCameras)
</script>

<style scoped>
.toolbar-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.rtsp-code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #94a3b8;
}

.status-dot.is-running {
  background-color: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8f9fb;
}

:deep(.el-table__header) {
  font-weight: 600;
  color: #606266;
}

/* ── Dialog Styles ── */
.camera-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
  background-color: #f8fafc;
}

.dialog-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.dialog-section-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 14px;
  background-color: var(--primary-color);
  border-radius: 2px;
  margin-right: 8px;
}

.form-section {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.video-container {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.preview-footer {
  margin-top: 16px;
  padding: 12px;
  background: #f1f5f9;
  border-radius: 6px;
}

.url-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #64748b;
  word-break: break-all;
}
</style>

