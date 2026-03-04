<template>
  <div>
    <!-- Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <el-button type="primary" :icon="Plus" @click="openCreate">添加摄像头</el-button>
      <el-button :icon="Refresh" circle @click="fetchCameras" :loading="tableLoading" />
    </div>

    <!-- Table -->
    <el-table :data="cameras" v-loading="tableLoading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="名称" min-width="120" />
      <el-table-column prop="location" label="地点" min-width="120" />
      <el-table-column prop="rtsp_url" label="RTSP 地址" min-width="220" show-overflow-tooltip />
      <el-table-column label="流状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="streamStatusType(row)" size="small">
            {{ streamStatusLabel(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" align="center" fixed="right">
        <template #default="{ row }">
          <el-button size="small" :icon="VideoPlay" @click="previewCamera(row)" title="预览" />
          <el-button size="small" :icon="Edit" @click="openEdit(row)" title="编辑" />
          <el-button
            size="small"
            :type="isStreamActive(row) ? 'warning' : 'success'"
            :icon="isStreamActive(row) ? VideoPause : VideoCamera"
            @click="toggleStream(row)"
            :loading="streamLoading[row.id]"
          >{{ isStreamActive(row) ? '停流' : '开流' }}</el-button>
          <el-button size="small" type="danger" :icon="Delete" @click="removeCamera(row)" title="删除" />
        </template>
      </el-table-column>
    </el-table>

    <!-- Camera Form Dialog -->
    <el-dialog v-model="formVisible" :title="isEditing ? '编辑摄像头' : '添加摄像头'" width="480px" @closed="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如: 前台摄像头" />
        </el-form-item>
        <el-form-item label="安装地点" prop="location">
          <el-input v-model="form.location" placeholder="如: 1号楼大厅" />
        </el-form-item>
        <el-form-item label="RTSP 地址" prop="rtsp_url">
          <el-input v-model="form.rtsp_url" placeholder="rtsp://user:pass@ip:554/..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="formLoading">
          {{ isEditing ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- Preview Dialog -->
    <el-dialog v-model="previewVisible" :title="`预览 - ${previewCamera?.name}`" width="800px" @closed="previewUrl = ''">
      <VideoPlayer :url="previewUrl" style="width:100%" />
      <div style="margin-top:12px;font-size:12px;color:#909399">
        HTTP-FLV: {{ previewUrl }}
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Edit, Delete, VideoPlay, VideoPause, VideoCamera } from '@element-plus/icons-vue'
import { cameraApi } from '@/api/camera'
import VideoPlayer from '@/components/VideoPlayer.vue'

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
  // flv_url 由后端以 127.0.0.1 硬编码生成，直接使用会导致
  // 通过局域网 IP 访问时浏览器请求本机而非工控机。
  // 用当前页面的 host（含端口）替换，确保无论通过 localhost 还是 IP 访问均可播放。
  try {
    const u = new URL(flv)
    u.hostname = window.location.hostname
    return u.toString()
  } catch {
    return flv
  }
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
