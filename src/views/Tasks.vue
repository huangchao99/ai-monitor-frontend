<template>
  <div>
    <!-- Toolbar -->
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <el-button type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
      <el-button :icon="Refresh" circle @click="fetchTasks" :loading="tableLoading" />
    </div>

    <!-- Table -->
    <el-table :data="tasks" v-loading="tableLoading" border stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="task_name" label="任务名称" min-width="150" />
      <el-table-column prop="camera_name" label="摄像头" width="120" />
      <el-table-column label="算法" min-width="180">
        <template #default="{ row }">
          <el-tag
            v-for="d in row.algo_details"
            :key="d.algo_id"
            size="small"
            style="margin:2px"
          >{{ d.algo_name }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="taskStatusType(row.status)" size="small">
            {{ taskStatusLabel(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="alarm_count" label="告警次数" width="90" align="center" />
      <el-table-column label="错误信息" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.error_msg" style="color:#f56c6c">{{ row.error_msg }}</span>
          <span v-else style="color:#c0c4cc">—</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            :type="row.status === 1 ? 'warning' : 'success'"
            :icon="row.status === 1 ? VideoPause : VideoPlay"
            @click="toggleTask(row)"
            :loading="actionLoading[row.id]"
          >{{ row.status === 1 ? '停止' : '启动' }}</el-button>
          <el-button
            size="small"
            :icon="Warning"
            @click="viewAlarms(row)"
          >告警</el-button>
          <el-button
            size="small"
            type="danger"
            :icon="Delete"
            @click="removeTask(row)"
            :loading="actionLoading[row.id]"
          />
        </template>
      </el-table-column>
    </el-table>

    <!-- Create Task Dialog -->
    <el-dialog v-model="formVisible" title="新建任务" width="680px" @closed="resetForm">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="任务名称" prop="task_name">
          <el-input v-model="form.task_name" placeholder="如: 工位监测任务" />
        </el-form-item>

        <el-form-item label="摄像头" prop="camera_id">
          <el-select v-model="form.camera_id" placeholder="请选择摄像头" style="width:100%">
            <el-option
              v-for="cam in cameras"
              :key="cam.id"
              :label="`${cam.name} (${cam.location || '无地点'})`"
              :value="cam.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>

        <el-divider content-position="left">算法配置</el-divider>

        <div v-for="algo in algorithms" :key="algo.id" style="margin-bottom:12px">
          <el-checkbox
            v-model="selectedAlgos[algo.id]"
            :label="algo.algo_name"
            @change="(v) => onAlgoToggle(algo, v)"
            style="font-weight:600"
          />
          <el-tag size="small" type="info" style="margin-left:8px">{{ algo.algo_key }}</el-tag>

          <div v-if="selectedAlgos[algo.id]" style="margin-top:8px;padding:12px 16px;background:#f5f7fa;border-radius:6px">
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="持续时间(s)" :label-width="90">
                  <el-input-number
                    v-model="algoParams[algo.id].duration"
                    :min="1" :max="3600" size="small" style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="冷却时间(s)" :label-width="90">
                  <el-input-number
                    v-model="algoParams[algo.id].alarm_interval"
                    :min="10" :max="3600" size="small" style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="置信度" :label-width="90">
                  <el-input-number
                    v-model="algoParams[algo.id].confidence"
                    :min="0.1" :max="1" :step="0.05" :precision="2" size="small" style="width:100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="8">
                <el-form-item label="跳帧数" :label-width="90">
                  <el-input-number
                    v-model="algoParams[algo.id].skip_frame"
                    :min="1" :max="30" size="small" style="width:100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="检测区域" :label-width="90">
                  <el-input
                    v-model="algoParams[algo.id].roi"
                    placeholder='全屏留空, 或填入 [[0.1,0.1],[0.9,0.9],...]'
                    size="small"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="formLoading">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Delete, VideoPlay, VideoPause, Warning } from '@element-plus/icons-vue'
import { taskApi } from '@/api/task'
import { cameraApi } from '@/api/camera'

const router = useRouter()
const tasks = ref([])
const cameras = ref([])
const algorithms = ref([])
const tableLoading = ref(false)
const actionLoading = reactive({})

const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const form = reactive({ task_name: '', camera_id: null, remark: '' })
const rules = {
  task_name: [{ required: true, message: '请输入任务名称' }],
  camera_id: [{ required: true, message: '请选择摄像头' }],
}

// algo selection state
const selectedAlgos = reactive({})
const algoParams = reactive({})

function initAlgoParam(algo) {
  if (!algoParams[algo.id]) {
    algoParams[algo.id] = {
      duration: 30,
      alarm_interval: 60,
      confidence: 0.35,
      skip_frame: 5,
      roi: '',
    }
  }
}

function onAlgoToggle(algo, checked) {
  if (checked) initAlgoParam(algo)
}

function taskStatusType(s) {
  return s === 1 ? 'success' : s === 2 ? 'danger' : 'info'
}
function taskStatusLabel(s) {
  return s === 1 ? '运行中' : s === 2 ? '异常' : '已停止'
}

async function fetchTasks() {
  tableLoading.value = true
  try {
    const res = await taskApi.list()
    tasks.value = res.data || []
  } finally {
    tableLoading.value = false
  }
}

async function fetchAlgorithms() {
  const res = await taskApi.algorithms()
  algorithms.value = res.data || []
  algorithms.value.forEach(initAlgoParam)
}

async function fetchCameras() {
  const res = await cameraApi.list()
  cameras.value = res.data || []
}

async function toggleTask(row) {
  actionLoading[row.id] = true
  try {
    if (row.status === 1) {
      await taskApi.stop(row.id)
      ElMessage.success('任务已停止')
    } else {
      await taskApi.start(row.id)
      ElMessage.success('任务已启动')
    }
    await fetchTasks()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    actionLoading[row.id] = false
  }
}

function viewAlarms(row) {
  router.push({ path: '/alarms', query: { task_id: row.id } })
}

async function removeTask(row) {
  await ElMessageBox.confirm(`确定删除任务「${row.task_name}」？`, '提示', { type: 'warning' })
  actionLoading[row.id] = true
  try {
    await taskApi.remove(row.id)
    ElMessage.success('已删除')
    await fetchTasks()
  } finally {
    actionLoading[row.id] = false
  }
}

function openCreate() {
  formVisible.value = true
}

function resetForm() {
  form.task_name = ''
  form.camera_id = null
  form.remark = ''
  Object.keys(selectedAlgos).forEach(k => { selectedAlgos[k] = false })
  formRef.value?.resetFields()
}

async function submitForm() {
  await formRef.value?.validate()

  const selected = algorithms.value.filter(a => selectedAlgos[a.id])
  if (selected.length === 0) {
    ElMessage.warning('请至少选择一个算法')
    return
  }

  const algoDetails = selected.map(a => {
    const p = algoParams[a.id]
    const roiCfg = p.roi?.trim() ? p.roi.trim() : '[]'
    return {
      algo_id: a.id,
      roi_config: roiCfg,
      algo_params: JSON.stringify({
        skip_frame: p.skip_frame,
        confidence: p.confidence,
        duration: p.duration,
      }),
      alarm_config: JSON.stringify({
        alarm_interval: p.alarm_interval,
      }),
    }
  })

  formLoading.value = true
  try {
    await taskApi.create({
      task_name: form.task_name,
      camera_id: form.camera_id,
      remark: form.remark,
      algo_details: algoDetails,
    })
    ElMessage.success('任务创建成功')
    formVisible.value = false
    await fetchTasks()
  } finally {
    formLoading.value = false
  }
}

onMounted(() => {
  fetchTasks()
  fetchAlgorithms()
  fetchCameras()
})
</script>
