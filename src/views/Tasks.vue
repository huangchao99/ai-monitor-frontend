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
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;justify-content:center;gap:6px">
            <el-tooltip :content="row.status === 1 ? '停止任务' : '启动任务'" placement="top">
              <el-button
                size="small"
                circle
                :type="row.status === 1 ? 'warning' : 'success'"
                :icon="row.status === 1 ? VideoPause : VideoPlay"
                @click="toggleTask(row)"
                :loading="actionLoading[row.id]"
              />
            </el-tooltip>
            <el-tooltip content="编辑任务" placement="top">
              <el-button
                size="small"
                circle
                :icon="Edit"
                @click="openEdit(row)"
                :loading="actionLoading[row.id]"
              />
            </el-tooltip>
            <el-tooltip content="查看告警" placement="top">
              <el-button
                size="small"
                circle
                type="primary"
                :icon="Warning"
                @click="viewAlarms(row)"
              />
            </el-tooltip>
            <el-tooltip content="删除任务" placement="top">
              <el-button
                size="small"
                circle
                type="danger"
                :icon="Delete"
                @click="removeTask(row)"
                :loading="actionLoading[row.id]"
              />
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- Create / Edit Task Dialog -->
    <el-dialog v-model="formVisible" :title="editMode ? '编辑任务' : '新建任务'" width="680px" @closed="resetForm">
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
              <!-- 按 param_definition 动态渲染算法参数字段 -->
              <template v-for="param in getParamDef(algo)" :key="param.key">
                <el-col :span="param.type === 'slider' ? 16 : 8">
                  <el-form-item :label="param.label" :label-width="110">
                    <el-input-number
                      v-if="param.type === 'number'"
                      v-model="algoParams[algo.id][param.key]"
                      :min="param.min ?? undefined"
                      :max="param.max ?? undefined"
                      :step="param.step ?? 1"
                      size="small" style="width:100%"
                    />
                    <div v-else-if="param.type === 'slider'" style="display:flex;align-items:center;gap:8px;width:100%">
                      <el-slider
                        v-model="algoParams[algo.id][param.key]"
                        :min="param.min ?? 0"
                        :max="param.max ?? 1"
                        :step="param.step ?? 0.01"
                        style="flex:1"
                        size="small"
                      />
                      <span style="min-width:36px;text-align:right;font-size:13px;color:#606266">
                        {{ algoParams[algo.id][param.key] }}
                      </span>
                    </div>
                    <el-select
                      v-else-if="param.type === 'select'"
                      v-model="algoParams[algo.id][param.key]"
                      size="small" style="width:100%"
                    >
                      <el-option
                        v-for="opt in param.options"
                        :key="opt"
                        :label="opt"
                        :value="opt"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
              </template>

              <!-- 通用字段：冷却时间（对应 alarm_config.alarm_interval） -->
              <el-col :span="8">
                <el-form-item label="冷却时间(s)" :label-width="110">
                  <el-input-number
                    v-model="algoParams[algo.id].alarm_interval"
                    :min="10" :max="3600" size="small" style="width:100%"
                  />
                </el-form-item>
              </el-col>

              <!-- 通用字段：检测区域（对应 roi_config） -->
              <el-col :span="24">
                <el-form-item label="检测区域" :label-width="110">
                  <RoiDrawer
                    v-model="algoParams[algo.id].roi"
                    :camera-id="form.camera_id"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="formLoading">{{ editMode ? '保存' : '创建' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Delete, VideoPlay, VideoPause, Warning, Edit } from '@element-plus/icons-vue'
import { taskApi } from '@/api/task'
import { cameraApi } from '@/api/camera'
import RoiDrawer from '@/components/RoiDrawer.vue'

const router = useRouter()
const tasks = ref([])
const cameras = ref([])
const algorithms = ref([])
const tableLoading = ref(false)
const actionLoading = reactive({})

const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const editMode = ref(false)
const editTaskId = ref(null)
const form = reactive({ task_name: '', camera_id: null, remark: '' })
const rules = {
  task_name: [{ required: true, message: '请输入任务名称' }],
  camera_id: [{ required: true, message: '请选择摄像头' }],
}

// algo selection state
const selectedAlgos = reactive({})
const algoParams = reactive({})

function getParamDef(algo) {
  if (!algo.param_definition) return []
  try {
    return JSON.parse(algo.param_definition) || []
  } catch {
    return []
  }
}

function initAlgoParam(algo) {
  const defaults = { alarm_interval: 60, roi: '' }
  getParamDef(algo).forEach(p => {
    defaults[p.key] = p.default !== undefined ? p.default : (p.type === 'number' ? 0 : '')
  })
  algoParams[algo.id] = defaults
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
  editMode.value = false
  editTaskId.value = null
  formVisible.value = true
}

async function openEdit(row) {
  // 如果任务运行中，先提示并自动停止
  if (row.status === 1) {
    try {
      await ElMessageBox.confirm(
        `任务「${row.task_name}」正在运行，编辑前需先停止，是否继续？`,
        '提示',
        { type: 'warning', confirmButtonText: '停止并编辑', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
    actionLoading[row.id] = true
    try {
      await taskApi.stop(row.id)
      await fetchTasks()
      // 从最新列表里拿更新后的 row
      row = tasks.value.find(t => t.id === row.id) || row
    } catch (e) {
      ElMessage.error('停止失败：' + e.message)
      return
    } finally {
      actionLoading[row.id] = false
    }
  }

  // 填充表单
  editMode.value = true
  editTaskId.value = row.id
  form.task_name = row.task_name
  form.camera_id = row.camera_id
  form.remark = row.remark || ''

  // 重置算法选择，再根据任务已有配置回填
  Object.keys(selectedAlgos).forEach(k => { selectedAlgos[k] = false })
  algorithms.value.forEach(initAlgoParam)

  for (const detail of (row.algo_details || [])) {
    selectedAlgos[detail.algo_id] = true
    const algo = algorithms.value.find(a => a.id === detail.algo_id)
    if (!algo) continue

    let ap = {}
    try { ap = JSON.parse(detail.algo_params || '{}') } catch {}
    let ac = {}
    try { ac = JSON.parse(detail.alarm_config || '{}') } catch {}

    if (!algoParams[algo.id]) initAlgoParam(algo)
    // 回填 param_definition 中的字段
    getParamDef(algo).forEach(pd => {
      if (ap[pd.key] !== undefined) algoParams[algo.id][pd.key] = ap[pd.key]
    })
    // 回填冷却时间和 ROI
    if (ac.alarm_interval !== undefined) algoParams[algo.id].alarm_interval = ac.alarm_interval
    algoParams[algo.id].roi = detail.roi_config === '[]' ? '' : (detail.roi_config || '')
  }

  formVisible.value = true
}

function resetForm() {
  editMode.value = false
  editTaskId.value = null
  form.task_name = ''
  form.camera_id = null
  form.remark = ''
  Object.keys(selectedAlgos).forEach(k => { selectedAlgos[k] = false })
  algorithms.value.forEach(initAlgoParam)
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
    // 从 param_definition 动态收集 algo_params 字段
    const algoParamsObj = {}
    getParamDef(a).forEach(pd => {
      if (p[pd.key] !== undefined) {
        algoParamsObj[pd.key] = p[pd.key]
      }
    })
    return {
      algo_id: a.id,
      roi_config: roiCfg,
      algo_params: JSON.stringify(algoParamsObj),
      alarm_config: JSON.stringify({ alarm_interval: p.alarm_interval }),
    }
  })

  const payload = {
    task_name: form.task_name,
    camera_id: form.camera_id,
    remark: form.remark,
    algo_details: algoDetails,
  }

  formLoading.value = true
  try {
    if (editMode.value) {
      await taskApi.update(editTaskId.value, payload)
      ElMessage.success('任务已更新')
    } else {
      await taskApi.create(payload)
      ElMessage.success('任务创建成功')
    }
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
